import { appState, currentWalletId, appId, db, formatCurrency } from "./core-state.js";
import { renderMobileUI } from "./vista-dashboard.js";
import { triggerReceiptScanner } from "./lector-boletas.js";
import { collection, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let isVoiceChatOpen = false;
let isRecording = false;
let audioContext = null;
let analyser = null;
let microphoneStream = null;
let dataArray = null;
let animationFrameId = null;
let recognition = null;
let speechSynth = window.speechSynthesis;
let hasStartedConversation = false;

// Estado temporal para registro de gasto interactivo desde el chat
let pendingExpenseDraft = null;

// Renderizador de texto animado elegante y fluido (sin aplanar ni distorsionar letras)
export function renderAnimatedVoiceText(text) {
  if (!text) return '';
  const words = text.split(' ');
  return words.map((word, idx) => {
    const delay = Math.min(idx * 24, 500);
    let formattedWord = word;
    if (word.startsWith('**') && word.endsWith('**') && word.length > 4) {
      formattedWord = `<strong class="font-black text-[#1E2517]">${word.slice(2, -2)}</strong>`;
    }
    return `<span class="animate-voice-word" style="animation-delay: ${delay}ms;">${formattedWord}&nbsp;</span>`;
  }).join('');
}

export function initVoiceChat() {
  const view = document.getElementById('view-voice-chat');
  if (!view) return;

  // Botones de cierre / regreso al dashboard
  document.getElementById('btn-close-voice-chat')?.addEventListener('click', closeVoiceChat);
  document.getElementById('btn-voice-nav-dashboard')?.addEventListener('click', closeVoiceChat);
  document.getElementById('btn-voice-nav-close')?.addEventListener('click', closeVoiceChat);

  // Botón Micrófono Principal
  document.getElementById('btn-voice-toggle-mic')?.addEventListener('click', toggleVoiceRecording);

  // Botón de Cámara / Escáner de Boleta dentro del Chat
  document.getElementById('btn-voice-nav-camera')?.addEventListener('click', () => {
    triggerReceiptScanner();
  });

  // Inicializar Web Speech Recognition en modo continuo
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.lang = 'es-PE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      updateMicUIState(true);
      updateStatusText("Escuchando tu voz...", true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const textToShow = finalTranscript || interimTranscript;
      const liveBox = document.getElementById('voice-chat-live-preview');
      if (liveBox && textToShow) {
        liveBox.classList.remove('hidden');
        liveBox.innerHTML = renderAnimatedVoiceText(textToShow);
      }

      if (finalTranscript.trim()) {
        const cleanText = finalTranscript.trim();
        addUserMessageToChat(cleanText);
        if (liveBox) {
          liveBox.innerHTML = '';
          liveBox.classList.add('hidden');
        }
        processUserVoiceQuery(cleanText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.warn('Error en Speech Recognition:', event.error);
      if (event.error !== 'aborted') {
        updateStatusText("Toca para hablar...", false);
      }
    };

    recognition.onend = () => {
      // Si seguimos en modo grabación, reconectar continuamente
      if (isRecording && isVoiceChatOpen) {
        try { recognition.start(); } catch {}
      } else {
        isRecording = false;
        stopAudioAnalysis();
        updateMicUIState(false);
        updateStatusText("Toca 'Hablar' para consultar a Mita", false);
      }
    };
  }
}

export function openVoiceChat() {
  const view = document.getElementById('view-voice-chat');
  if (!view) return;

  isVoiceChatOpen = true;
  view.classList.remove('hidden');
  view.classList.add('flex');

  hasStartedConversation = false;
  pendingExpenseDraft = null;

  // Restaurar pantalla de saludo inicial
  const greetingBox = document.getElementById('voice-chat-initial-greeting');
  const chatFeed = document.getElementById('voice-chat-messages-container');
  const liveBox = document.getElementById('voice-chat-live-preview');

  if (greetingBox) {
    greetingBox.classList.remove('hidden');
    const userName = appState.userName || (appState.participants && appState.participants[0]?.name) || "Kevin";
    greetingBox.innerHTML = `
      <h2 class="text-3xl font-black text-[#1E2517] leading-tight tracking-tight text-center">
        ${renderAnimatedVoiceText(`Hola ${userName}`)}
      </h2>
      <p class="text-xs font-semibold text-slate-700/90 mt-1 leading-snug text-center max-w-[280px]">
        Mita tu <span class="text-[#65A30D] font-black">Asistente Financiero</span> está para lo que <span class="text-[#65A30D] font-black">Necesites</span>
      </p>
    `;
  }

  if (chatFeed) {
    chatFeed.innerHTML = '';
  }

  if (liveBox) {
    liveBox.innerHTML = '';
    liveBox.classList.add('hidden');
  }

  updateStatusText("Toca 'Hablar' o toma foto a una boleta", false);
  resetEchoRings();
}

export function closeVoiceChat() {
  const view = document.getElementById('view-voice-chat');
  if (!view) return;

  isVoiceChatOpen = false;
  stopVoiceRecording();

  if (speechSynth && speechSynth.speaking) {
    speechSynth.cancel();
  }

  view.classList.add('hidden');
  view.classList.remove('flex');
}

export async function toggleVoiceRecording() {
  if (isRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

export async function startVoiceRecording() {
  if (isRecording) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    microphoneStream = stream;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;
    source.connect(analyser);

    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Iniciar loop de análisis de decibelios a 60 FPS
    runAudioDecibelLoop();

    // Iniciar reconocimiento de voz
    if (recognition) {
      try {
        recognition.start();
      } catch {}
    }

    isRecording = true;
    updateMicUIState(true);
    updateStatusText("Escuchando tu voz...", true);

    if (navigator.vibrate) navigator.vibrate(20);
  } catch (err) {
    console.warn("Permiso de micrófono no otorgado o error:", err);
    updateStatusText("Por favor permite el acceso al micrófono", false);
  }
}

export function stopVoiceRecording() {
  isRecording = false;
  updateMicUIState(false);

  if (recognition) {
    try { recognition.stop(); } catch {}
  }

  stopAudioAnalysis();
  resetEchoRings();
}

function stopAudioAnalysis() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

// Bucle en tiempo real de análisis de decibelios & escalado de eco con desenfoque
function runAudioDecibelLoop() {
  if (!analyser || !dataArray) return;

  const updateDecibels = () => {
    if (!isRecording) return;

    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const normalizedVol = Math.min(1, Math.max(0, (average - 12) / 75));

    // 1. Núcleo SVG Central: escala elástica
    const coreSvg = document.getElementById('voice-chat-svg-core');
    if (coreSvg) {
      const coreScale = 1.0 + normalizedVol * 0.25;
      coreSvg.style.transform = `scale(${coreScale})`;
    }

    // 2. Anillo Eco 1 (Interno)
    const ring1 = document.getElementById('voice-echo-ring-1');
    if (ring1) {
      const r1Scale = 0.95 + normalizedVol * 0.4;
      const r1Blur = 16 + normalizedVol * 20;
      ring1.style.transform = `scale(${r1Scale})`;
      ring1.style.filter = `blur(${r1Blur}px)`;
      ring1.style.opacity = `${0.45 + normalizedVol * 0.55}`;
    }

    // 3. Anillo Eco 2 (Medio)
    const ring2 = document.getElementById('voice-echo-ring-2');
    if (ring2) {
      const r2Scale = 0.85 + normalizedVol * 0.6;
      const r2Blur = 24 + normalizedVol * 30;
      ring2.style.transform = `scale(${r2Scale})`;
      ring2.style.filter = `blur(${r2Blur}px)`;
      ring2.style.opacity = `${0.35 + normalizedVol * 0.5}`;
    }

    // 4. Anillo Eco 3 (Externo)
    const ring3 = document.getElementById('voice-echo-ring-3');
    if (ring3) {
      const r3Scale = 0.75 + normalizedVol * 0.8;
      const r3Blur = 36 + normalizedVol * 44;
      ring3.style.transform = `scale(${r3Scale})`;
      ring3.style.filter = `blur(${r3Blur}px)`;
      ring3.style.opacity = `${0.25 + normalizedVol * 0.5}`;
    }

    animationFrameId = requestAnimationFrame(updateDecibels);
  };

  animationFrameId = requestAnimationFrame(updateDecibels);
}

function resetEchoRings() {
  const coreSvg = document.getElementById('voice-chat-svg-core');
  if (coreSvg) coreSvg.style.transform = 'scale(1)';

  const ring1 = document.getElementById('voice-echo-ring-1');
  if (ring1) {
    ring1.style.transform = 'scale(0.95)';
    ring1.style.filter = 'blur(16px)';
    ring1.style.opacity = '0.45';
  }

  const ring2 = document.getElementById('voice-echo-ring-2');
  if (ring2) {
    ring2.style.transform = 'scale(0.85)';
    ring2.style.filter = 'blur(24px)';
    ring2.style.opacity = '0.35';
  }

  const ring3 = document.getElementById('voice-echo-ring-3');
  if (ring3) {
    ring3.style.transform = 'scale(0.75)';
    ring3.style.filter = 'blur(36px)';
    ring3.style.opacity = '0.25';
  }
}

function updateMicUIState(recording) {
  const micBtn = document.getElementById('btn-voice-toggle-mic');
  const micIcon = document.getElementById('icon-voice-btn-mic');
  const micLabel = document.getElementById('label-voice-btn-mic');

  if (recording) {
    if (micBtn) {
      micBtn.className = "h-12 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 font-black text-xs shadow-lg shadow-rose-500/30 active:scale-95 transition-all cursor-pointer animate-pulse";
    }
    if (micIcon) micIcon.textContent = "mic";
    if (micLabel) micLabel.textContent = "Escuchando...";
  } else {
    if (micBtn) {
      micBtn.className = "h-12 px-6 rounded-2xl bg-[#222818] hover:bg-[#2e3721] text-white flex items-center gap-2 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer";
    }
    if (micIcon) micIcon.textContent = "mic";
    if (micLabel) micLabel.textContent = "Hablar";
  }
}

function updateStatusText(text, active = false) {
  const pill = document.getElementById('voice-chat-status-pill');
  const statusText = document.getElementById('voice-chat-status-text');

  if (statusText) statusText.textContent = text;
  if (pill) {
    const dot = pill.querySelector('span:first-child');
    if (dot) {
      dot.className = active ? "w-2 h-2 rounded-full bg-emerald-500 animate-ping" : "w-2 h-2 rounded-full bg-slate-400";
    }
  }
}

// -------------------------------------------------------------
// GESTIÓN DE MENSAJES Y CONVERSACIÓN
// -------------------------------------------------------------

function ensureConversationStarted() {
  if (!hasStartedConversation) {
    hasStartedConversation = true;
    const greetingBox = document.getElementById('voice-chat-initial-greeting');
    if (greetingBox) {
      greetingBox.classList.add('hidden');
    }
    const centerAura = document.getElementById('voice-chat-center-aura');
    if (centerAura) {
      centerAura.classList.remove('h-72', 'sm:h-80');
      centerAura.classList.add('h-40', 'sm:h-48');
    }
  }
}

// 1. Mensaje del Usuario: CON BURBUJA a la derecha
export function addUserMessageToChat(text) {
  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const bubble = document.createElement('div');
  bubble.className = "self-end max-w-[84%] bg-[#222818] text-white text-xs font-bold px-4 py-3 rounded-3xl rounded-tr-sm shadow-md animate-fade-in";
  bubble.textContent = text;
  feed.appendChild(bubble);

  scrollChatToBottom();
}

// 2. Mensaje de Mita (IA): TEXTO LIMPIO SIN BURBUJA (visual y rápido, sin audio robótico)
export function addMitaTextToChat(text) {
  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const textNode = document.createElement('div');
  textNode.className = "self-start max-w-[92%] text-slate-900 text-sm font-extrabold leading-snug py-1 px-1";
  textNode.innerHTML = renderAnimatedVoiceText(text);
  feed.appendChild(textNode);

  scrollChatToBottom();
}

// 3. Tarjeta Interactiva de Opciones (Preguntas de Mita con píldoras)
export function addInteractiveQuestionStep({ title, subtitle, items, onChoose }) {
  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "interactive-step-card self-start w-full max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 shadow-xl space-y-3 animate-fade-in";

  let contentHtml = `
    <div>
      <h4 class="text-xs font-black text-slate-900">${title || 'Selecciona una opción'}</h4>
      ${subtitle ? `<p class="text-[11px] font-semibold text-slate-500 mt-0.5">${subtitle}</p>` : ''}
    </div>
  `;

  if (items && items.length > 0) {
    contentHtml += `
      <div class="flex flex-wrap gap-1.5 pt-1">
        ${items.map(item => `
          <button type="button" data-option-value="${item.id || item.value || item.name}"
            class="chat-option-pill px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${item.highlight ? 'bg-[#222818] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}">
            ${item.icon ? `<i class="${item.icon} mr-1.5 text-xs"></i>` : ''}
            <span>${item.name || item.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  card.innerHTML = contentHtml;

  // Bindings de las píldoras: al tocar, se desactiva la tarjeta y se avanza
  card.querySelectorAll('.chat-option-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-option-value');
      
      // Desactivar botones de esta tarjeta para evitar dobles clics
      card.querySelectorAll('.chat-option-pill').forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-40', 'pointer-events-none');
      });
      btn.classList.remove('opacity-40');
      btn.className = "chat-option-pill px-3.5 py-2.5 rounded-2xl text-xs font-black bg-[#222818] text-white shadow-xs pointer-events-none";

      if (onChoose) onChoose(val);
    });
  });

  feed.appendChild(card);
  scrollChatToBottom();
}

export function addInteractiveSummaryCard({ draft, onConfirm }) {
  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "self-start w-full max-w-sm bg-white/95 backdrop-blur-xl border border-emerald-200/80 rounded-3xl p-4 shadow-xl space-y-3.5 animate-fade-in";

  const totalStr = (parseFloat(draft.amount) || 0).toFixed(2);

  card.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumen de Registro</span>
        <h4 class="text-sm font-black text-slate-900 leading-tight">${draft.description || 'Comprobante'}</h4>
      </div>
      <div class="text-right">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
        <p class="text-base font-black text-[#222818]">S/ ${totalStr}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
        <span class="text-[10px] text-slate-400 block font-bold">MÉTODO DE PAGO</span>
        <span class="font-black text-slate-800">${draft.paymentMethod || 'Efectivo'}</span>
      </div>
      <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
        <span class="text-[10px] text-slate-400 block font-bold">CATEGORÍA</span>
        <span class="font-black text-slate-800">${draft.category || 'General'}</span>
      </div>
      <div class="col-span-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 block font-bold">TIPO DE GASTO</span>
          <span class="font-black text-slate-800">${draft.type === 'shared' ? 'Gasto Compartido' : 'Gasto Personal'}</span>
        </div>
        ${draft.payerId ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">Pagó: ${draft.payerId}</span>` : ''}
      </div>
    </div>

    <div class="pt-1">
      <button type="button" class="btn-confirm-chat-action w-full py-3.5 bg-[#222818] hover:bg-[#2e3721] active:scale-98 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
        <span class="material-symbols-rounded text-lg text-[#A3E635]">check_circle</span>
        <span>Confirmar y Guardar en Qipu</span>
      </button>
    </div>
  `;

  card.querySelector('.btn-confirm-chat-action')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin text-sm"></i> Guardando...`;
    if (onConfirm) onConfirm();
  });

  feed.appendChild(card);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  setTimeout(() => {
    const feed = document.getElementById('voice-chat-messages-container');
    if (feed) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
    }
  }, 50);
}

// -------------------------------------------------------------
// INTEGRACIÓN DEL ESCÁNER DE BOLETA DIRECTO AL CHAT (FLUJO SECUENCIAL)
// -------------------------------------------------------------

export function handleReceiptInVoiceChat(receiptResult) {
  openVoiceChat();

  const finalAmount = parseFloat(receiptResult.amount) || 0;
  const merchantName = receiptResult.merchant || receiptResult.description || 'Compra en Comercio';
  const categoryDetected = receiptResult.category || 'Alimentación';
  const isShared = receiptResult.isShared !== false;

  // Guardar en el borrador interactivo
  pendingExpenseDraft = {
    amount: finalAmount,
    description: merchantName,
    date: receiptResult.date || new Date().toISOString().split('T')[0],
    category: categoryDetected,
    paymentMethod: 'Efectivo',
    paymentMethodId: '',
    type: isShared ? 'shared' : 'personal',
    payerId: '',
    items: receiptResult.items || []
  };

  // PASO 1: Mita saluda con el resultado y pregunta el MÉTODO DE PAGO
  setTimeout(() => {
    addMitaTextToChat(`Analicé tu comprobante de **${merchantName}** por un total de **S/ ${finalAmount.toFixed(2)}**.\n¿Con qué método de pago realizaste esta compra?`);

    const pmItems = (appState.paymentMethods && appState.paymentMethods.length > 0)
      ? appState.paymentMethods.map(pm => ({
          id: pm.name || pm.id,
          name: pm.name,
          icon: 'fas fa-wallet'
        }))
      : [
          { id: 'Efectivo', name: 'Efectivo', icon: 'fas fa-money-bill-wave' },
          { id: 'Tarjeta', name: 'Tarjeta', icon: 'fas fa-credit-card' },
          { id: 'Yape', name: 'Yape', icon: 'fas fa-mobile-alt' },
          { id: 'Plin', name: 'Plin', icon: 'fas fa-bolt' },
          { id: 'Transferencia', name: 'Transferencia', icon: 'fas fa-university' }
        ];

    addInteractiveQuestionStep({
      title: '💳 Método de Pago',
      subtitle: 'Selecciona cómo pagaste este comprobante',
      items: pmItems,
      onChoose: (chosenPm) => {
        pendingExpenseDraft.paymentMethod = chosenPm;
        addUserMessageToChat(`💳 ${chosenPm}`);

        // PASO 2: Preguntar CATEGORÍA
        setTimeout(() => {
          askReceiptCategoryStep();
        }, 350);
      }
    });
  }, 400);
}

function askReceiptCategoryStep() {
  const categoryDetected = pendingExpenseDraft.category || 'Alimentación';
  addMitaTextToChat(`Entendido, ${pendingExpenseDraft.paymentMethod}. ¿A qué categoría corresponde este gasto?`);

  const catItems = (appState.categories && appState.categories.length > 0)
    ? appState.categories.map(c => {
        const cName = typeof c === 'string' ? c : c.name;
        return {
          id: cName,
          name: cName,
          highlight: cName.toLowerCase().includes(categoryDetected.toLowerCase())
        };
      })
    : [
        { id: 'Alimentación', name: 'Alimentación', highlight: true },
        { id: 'Supermercado', name: 'Supermercado' },
        { id: 'Transporte', name: 'Transporte' },
        { id: 'Servicios', name: 'Servicios' },
        { id: 'Salud', name: 'Salud' },
        { id: 'Hogar', name: 'Hogar' },
        { id: 'Entretenimiento', name: 'Entretenimiento' },
        { id: 'Compras', name: 'Compras' },
        { id: 'Otros', name: 'Otros' }
      ];

  addInteractiveQuestionStep({
    title: '🏷️ Categoría del Gasto',
    subtitle: 'Elige la clasificación adecuada',
    items: catItems,
    onChoose: (chosenCat) => {
      pendingExpenseDraft.category = chosenCat;
      addUserMessageToChat(`🏷️ ${chosenCat}`);

      // PASO 3: Preguntar TIPO DE GASTO (Personal vs Compartido)
      setTimeout(() => {
        askReceiptExpenseTypeStep();
      }, 350);
    }
  });
}

function askReceiptExpenseTypeStep() {
  addMitaTextToChat(`¿Este gasto es personal o compartido entre varias personas?`);

  addInteractiveQuestionStep({
    title: '👥 Tipo de Gasto',
    subtitle: 'Define si se divide entre integrantes',
    items: [
      { id: 'personal', name: 'Gasto Personal', icon: 'fas fa-user', highlight: pendingExpenseDraft.type === 'personal' },
      { id: 'shared', name: 'Gasto Compartido', icon: 'fas fa-users', highlight: pendingExpenseDraft.type === 'shared' }
    ],
    onChoose: (chosenType) => {
      pendingExpenseDraft.type = chosenType;
      addUserMessageToChat(chosenType === 'shared' ? '👥 Gasto Compartido' : '👤 Gasto Personal');

      setTimeout(() => {
        if (chosenType === 'shared' && appState.participants && appState.participants.length > 0) {
          askReceiptPayerStep();
        } else {
          showReceiptSummaryStep();
        }
      }, 350);
    }
  });
}

function askReceiptPayerStep() {
  addMitaTextToChat(`¿Quién realizó el pago total de este gasto?`);

  const memberItems = appState.participants.map(p => {
    const pName = typeof p === 'string' ? p : p.name;
    return {
      id: pName,
      name: pName,
      icon: 'fas fa-user-circle'
    };
  });

  addInteractiveQuestionStep({
    title: '👤 ¿Quién pagó el gasto?',
    items: memberItems,
    onChoose: (chosenPayer) => {
      pendingExpenseDraft.payerId = chosenPayer;
      addUserMessageToChat(`👤 Pagó ${chosenPayer}`);

      setTimeout(() => {
        showReceiptSummaryStep();
      }, 350);
    }
  });
}

function showReceiptSummaryStep() {
  addMitaTextToChat(`¡Todo listo! Revisa el resumen y pulsa confirmar para registrarlo en tu monedero:`);

  addInteractiveSummaryCard({
    draft: pendingExpenseDraft,
    onConfirm: async () => {
      await executeSaveExpenseFromChat();
    }
  });
}

// Guardar gasto desde el chat directamente a Firestore
async function executeSaveExpenseFromChat() {
  if (isSavingExpense || !pendingExpenseDraft || !currentWalletId || !appId || !db) return;
  isSavingExpense = true;

  updateStatusText("Guardando movimiento en Qipu...", true);

  try {
    const isPersonal = pendingExpenseDraft.type === 'personal';
    const primaryParticipant = (appState.participants && appState.participants.length > 0) 
      ? appState.participants[0] 
      : { id: 'default', name: 'Principal' };

    let resolvedPayerId = primaryParticipant.id;
    if (!isPersonal && pendingExpenseDraft.payerId) {
      const matchP = (appState.participants || []).find(p => p.name === pendingExpenseDraft.payerId || p.id === pendingExpenseDraft.payerId);
      if (matchP) resolvedPayerId = matchP.id;
    }

    const finalItems = (pendingExpenseDraft.items || []).map(it => {
      const qty = parseFloat(it.quantity) || 1;
      const amount = parseFloat(it.amount || it.price) || 0;
      if (isPersonal) {
        return {
          desc: it.desc || it.name || it.description || 'Producto',
          quantity: qty,
          amount: amount,
          assignedTo: primaryParticipant.id,
          assignments: { [primaryParticipant.id]: qty }
        };
      }
      return {
        desc: it.desc || it.name || it.description || 'Producto',
        quantity: qty,
        amount: amount,
        assignedTo: it.assignedTo || 'all',
        assignments: it.assignments || {}
      };
    });

    const expenseId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const expenseData = {
      id: expenseId,
      description: pendingExpenseDraft.description || "Gasto Escaneado",
      amount: parseFloat(pendingExpenseDraft.amount) || 0,
      category: pendingExpenseDraft.category || "General",
      date: pendingExpenseDraft.date || new Date().toISOString().split('T')[0],
      type: isPersonal ? "personal" : "shared",
      payerId: resolvedPayerId,
      paymentMethod: pendingExpenseDraft.paymentMethod || "Efectivo",
      paymentMethodId: pendingExpenseDraft.paymentMethodId || "",
      items: finalItems,
      guests: isPersonal ? [] : (pendingExpenseDraft.guests || []),
      createdAt: new Date().toISOString(),
      walletId: currentWalletId
    };

    // Sanear gastos previos para que ninguno quede sin ID
    const currentExpenses = (appState.expenses || []).map((e, idx) => {
      if (!e.id) {
        return { ...e, id: 'exp_' + (e.createdAt ? new Date(e.createdAt).getTime() : Date.now()) + '_' + idx };
      }
      return e;
    });

    const updatedExpenses = [expenseData, ...currentExpenses];

    // Guardar en Firestore
    const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
    await updateDoc(walletRef, {
      expenses: updatedExpenses
    });

    appState.expenses = updatedExpenses;
    renderMobileUI();

    addMitaTextToChat(`¡Listo! Tu gasto de S/ ${expenseData.amount.toFixed(2)} en "${expenseData.description}" fue registrado con éxito en tu monedero.`);
    updateStatusText("Gasto guardado correctamente", false);

    pendingExpenseDraft = null;
    isSavingExpense = false;

    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  } catch (err) {
    isSavingExpense = false;
    console.error("Error al registrar gasto desde chat:", err);
    addMitaTextToChat("Hubo un pequeño problema al guardar en la base de datos. Intenta nuevamente.");
    updateStatusText("Error al guardar", false);
  }
}

// Procesar preguntas por voz del usuario
async function processUserVoiceQuery(userPrompt) {
  updateStatusText("Mita está pensando...", true);

  let totalSpent = 0;
  if (appState.expenses) {
    appState.expenses.forEach(e => totalSpent += (parseFloat(e.amount) || 0));
  }

  setTimeout(() => {
    let responseText = "";
    const lower = userPrompt.toLowerCase();

    if (lower.includes("gasto") || lower.includes("cuanto he gastado") || lower.includes("total")) {
      responseText = `Has registrado un gasto total acumulado de S/ ${totalSpent.toFixed(2)} en tu presupuesto mensual.`;
      addMitaTextToChat(responseText);
    } else if (lower.includes("hola") || lower.includes("quien eres")) {
      responseText = "¡Hola! Soy Mita, tu asistente de finanzas. Puedes dictarme tus gastos o tomar foto a tus boletas.";
      addMitaTextToChat(responseText);
    } else if (lower.includes("boleta") || lower.includes("factura") || lower.includes("foto")) {
      responseText = "Toca el botón de la cámara abajo para escanear tu comprobante al instante.";
      addMitaTextToChat(responseText);
    } else {
      responseText = `Entendido: "${userPrompt}". Estoy lista para ayudarte con tus cuentas y registrar tus gastos.`;
      addMitaTextToChat(responseText);
    }

    updateStatusText("Toca 'Hablar' para continuar", false);
  }, 700);
}

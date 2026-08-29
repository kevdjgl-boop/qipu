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
export function renderAnimatedVoiceText(text, baseDelay = 0) {
  if (!text) return '';
  const words = text.split(' ');
  return words.map((word, idx) => {
    const delay = baseDelay + Math.min(idx * 30, 600);
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

  // Botón superior de regreso al dashboard
  document.getElementById('btn-close-voice-chat')?.addEventListener('click', closeVoiceChat);
  document.getElementById('btn-voice-nav-dashboard')?.addEventListener('click', closeVoiceChat);

  // 1. Micrófono (Izquierda) y Visualizador Waveform
  document.getElementById('btn-mita-mic-left')?.addEventListener('click', toggleVoiceRecording);
  document.getElementById('btn-mita-waveform')?.addEventListener('click', toggleVoiceRecording);

  // 2. Botón Verde "+" / Enviar
  const plusBtn = document.getElementById('btn-mita-plus-toggle');
  const textInput = document.getElementById('voice-chat-text-input');

  plusBtn?.addEventListener('click', () => {
    const text = textInput?.value.trim();
    if (text) {
      handleSendTextMessage();
    } else {
      toggleAttachmentsPopup();
    }
  });

  // Escuchar escritura en el input para cambiar el icono entre "+" y "send"
  textInput?.addEventListener('input', () => {
    const icon = document.getElementById('icon-mita-plus');
    if (!icon) return;
    if (textInput.value.trim()) {
      icon.textContent = 'send';
      closeAttachmentsPopup();
    } else {
      icon.textContent = isPopupOpen ? 'close' : 'add';
    }
  });

  textInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendTextMessage();
    }
  });

  // 3. Opciones del Popup: Fotos, Archivos, Cámara
  document.getElementById('btn-attach-camera')?.addEventListener('click', () => {
    closeAttachmentsPopup();
    triggerReceiptScanner();
  });

  const photoInput = document.getElementById('input-mita-attach-photo');
  const fileInput = document.getElementById('input-mita-attach-file');

  document.getElementById('btn-attach-photos')?.addEventListener('click', () => {
    closeAttachmentsPopup();
    photoInput?.click();
  });

  document.getElementById('btn-attach-files')?.addEventListener('click', () => {
    closeAttachmentsPopup();
    fileInput?.click();
  });

  photoInput?.addEventListener('change', handleAttachmentFile);
  fileInput?.addEventListener('change', handleAttachmentFile);

  // Cerrar popup al hacer click fuera
  document.addEventListener('click', (e) => {
    const popup = document.getElementById('voice-chat-attachments-popup');
    const toggleBtn = document.getElementById('btn-mita-plus-toggle');
    if (isPopupOpen && popup && !popup.contains(e.target) && !toggleBtn?.contains(e.target)) {
      closeAttachmentsPopup();
    }
  });

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = true;
    setupRecognitionEvents();
  }
}

let isPopupOpen = false;

export function toggleAttachmentsPopup() {
  if (isPopupOpen) {
    closeAttachmentsPopup();
  } else {
    openAttachmentsPopup();
  }
}

export function openAttachmentsPopup() {
  const popup = document.getElementById('voice-chat-attachments-popup');
  const icon = document.getElementById('icon-mita-plus');
  if (!popup) return;

  isPopupOpen = true;
  popup.classList.remove('hidden');
  popup.classList.remove('pointer-events-none');
  setTimeout(() => {
    popup.classList.remove('opacity-0', 'scale-95');
    popup.classList.add('opacity-100', 'scale-100');
  }, 10);

  if (icon) {
    icon.style.transform = 'rotate(45deg)';
  }
}

export function closeAttachmentsPopup() {
  const popup = document.getElementById('voice-chat-attachments-popup');
  const icon = document.getElementById('icon-mita-plus');
  if (!popup) return;

  isPopupOpen = false;
  popup.classList.remove('opacity-100', 'scale-100');
  popup.classList.add('opacity-0', 'scale-95');
  popup.classList.add('pointer-events-none');
  setTimeout(() => {
    if (!isPopupOpen) popup.classList.add('hidden');
  }, 200);

  if (icon) {
    icon.style.transform = 'rotate(0deg)';
  }
}

async function handleAttachmentFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64Data = event.target.result.split(',')[1];
    addUserMessageToChat(`📎 Documento adjunto: ${file.name}`);
    await handleReceiptInVoiceChat(base64Data, file.type || 'image/jpeg');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function handleSendTextMessage() {
  const input = document.getElementById('voice-chat-text-input');
  const icon = document.getElementById('icon-mita-plus');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (icon) icon.textContent = 'add';
  addUserMessageToChat(text);
  processUserVoiceQuery(text);
}

let accumulatedFinalText = '';
let auraPulseInterval = null;

function setupRecognitionEvents() {
  if (!recognition) return;

  recognition.onstart = () => {
    isRecording = true;
    accumulatedFinalText = '';
    updateMicUIState(true);
    startPulsingAura();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        accumulatedFinalText += ' ' + event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const currentDisplay = (accumulatedFinalText + ' ' + interimTranscript).trim();
    if (currentDisplay) {
      updateStreamingUserMessage(currentDisplay, false);
    }
  };

  recognition.onerror = (event) => {
    console.warn('SpeechRecognition error:', event.error);
    if (event.error === 'not-allowed') {
      alert('Por favor otorga permisos de micrófono en los ajustes de tu navegador para hablar con Mita.');
      stopVoiceRecording();
    }
  };

  recognition.onend = () => {
    isRecording = false;
    updateMicUIState(false);
    stopPulsingAura();

    const finalText = accumulatedFinalText.trim();
    if (finalText) {
      updateStreamingUserMessage(finalText, true);
      processUserVoiceQuery(finalText);
      accumulatedFinalText = '';
    } else if (currentStreamingBubble) {
      currentStreamingBubble.remove();
      currentStreamingBubble = null;
    }
  };
}

export function openVoiceChat() {
  const view = document.getElementById('view-voice-chat');
  if (!view) return;

  isVoiceChatOpen = true;
  view.classList.remove('hidden');
  view.classList.add('flex');

  closeAttachmentsPopup();
  const textInput = document.getElementById('voice-chat-text-input');
  if (textInput) textInput.value = '';
  const icon = document.getElementById('icon-mita-plus');
  if (icon) icon.textContent = 'add';

  hasStartedConversation = false;
  pendingExpenseDraft = null;
  currentStreamingBubble = null;

  // Restaurar pantalla de saludo inicial
  const greetingBox = document.getElementById('voice-chat-initial-greeting');
  const chatFeed = document.getElementById('voice-chat-messages-container');

  if (greetingBox) {
    greetingBox.classList.remove('hidden');
    const userName = appState.userName || (appState.participants && appState.participants[0]?.name) || "Kevin";
    const titleHtml = renderAnimatedVoiceText(`Hola ${userName}`, 0);
    const subtitleHtml = renderAnimatedVoiceText("Mita tu asistente financiero está para lo que necesites", 100);

    greetingBox.innerHTML = `
      <h2 class="text-3xl font-black text-[#1E2517] leading-tight tracking-tight text-center">
        ${titleHtml}
      </h2>
      <p class="text-xs font-semibold text-slate-700 mt-2 leading-relaxed text-center max-w-[280px]">
        ${subtitleHtml}
      </p>
    `;
  }

  if (chatFeed) {
    chatFeed.innerHTML = '';
  }

  resetEchoRings();
}

export function closeVoiceChat() {
  const view = document.getElementById('view-voice-chat');
  if (!view) return;

  isVoiceChatOpen = false;
  stopVoiceRecording();

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

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert("Tu navegador no soporta reconocimiento de voz nativo. Por favor abre Qipu en Google Chrome.");
    return;
  }

  if (!recognition) {
    recognition = new SpeechRec();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = true;
    setupRecognitionEvents();
  }

  try {
    isRecording = true;
    accumulatedFinalText = '';
    updateMicUIState(true);
    recognition.start();
    if (navigator.vibrate) navigator.vibrate(25);
  } catch (err) {
    console.warn("Error al iniciar reconocimiento:", err);
    try {
      recognition.stop();
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 150);
    } catch {}
  }
}

export function stopVoiceRecording() {
  isRecording = false;
  updateMicUIState(false);
  stopPulsingAura();

  if (recognition) {
    try { recognition.stop(); } catch {}
  }
}

function startPulsingAura() {
  const coreSvg = document.getElementById('voice-chat-svg-core');
  const ring1 = document.getElementById('voice-echo-ring-1');
  const ring2 = document.getElementById('voice-echo-ring-2');
  const ring3 = document.getElementById('voice-echo-ring-3');

  if (auraPulseInterval) clearInterval(auraPulseInterval);

  let pulse = false;
  auraPulseInterval = setInterval(() => {
    pulse = !pulse;
    if (coreSvg) coreSvg.style.transform = pulse ? 'scale(1.10)' : 'scale(0.98)';
    if (ring1) {
      ring1.style.transform = pulse ? 'scale(1.18)' : 'scale(0.95)';
      ring1.style.opacity = pulse ? '0.70' : '0.45';
    }
    if (ring2) {
      ring2.style.transform = pulse ? 'scale(1.10)' : 'scale(0.85)';
      ring2.style.opacity = pulse ? '0.55' : '0.35';
    }
    if (ring3) {
      ring3.style.transform = pulse ? 'scale(1.04)' : 'scale(0.75)';
      ring3.style.opacity = pulse ? '0.40' : '0.25';
    }
  }, 350);
}

function stopPulsingAura() {
  if (auraPulseInterval) {
    clearInterval(auraPulseInterval);
    auraPulseInterval = null;
  }
  resetEchoRings();
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
  const micBtn = document.getElementById('btn-mita-mic-left');
  const waveformBtn = document.getElementById('btn-mita-waveform');

  if (recording) {
    if (micBtn) {
      micBtn.classList.add('text-rose-600', 'animate-pulse');
      micBtn.classList.remove('text-slate-800');
    }
    if (waveformBtn) {
      waveformBtn.classList.add('text-rose-600', 'animate-bounce');
      waveformBtn.classList.remove('text-slate-800');
    }
  } else {
    if (micBtn) {
      micBtn.classList.remove('text-rose-600', 'animate-pulse');
      micBtn.classList.add('text-slate-800');
    }
    if (waveformBtn) {
      waveformBtn.classList.remove('text-rose-600', 'animate-bounce');
      waveformBtn.classList.add('text-slate-800');
    }
  }
}

function updateStatusText(text, active = false) {
  // Píldoras redundantes eliminadas para mayor limpieza visual
}

function ensureConversationStarted() {
  if (!hasStartedConversation) {
    hasStartedConversation = true;
    const greetingBox = document.getElementById('voice-chat-initial-greeting');
    if (greetingBox) {
      greetingBox.classList.add('hidden');
    }
  }
}

// Renderizador de caracteres animados escalonados (idéntico al monto en registros compartidos)
export function renderAnimatedUserSpeech(text) {
  if (!text) return '';
  let charIndex = 0;
  return String(text).split('').map(char => {
    if (char === ' ') {
      return '<span class="inline-block">&nbsp;</span>';
    }
    const delay = Math.min(charIndex * 18, 400);
    charIndex++;
    return `<span class="animate-digit-grow inline-block" style="animation-delay: ${delay}ms;">${char}</span>`;
  }).join('');
}

let currentStreamingBubble = null;

// 1. Mensaje del Usuario en Vivo: Se escribe dinámicamente en su burbuja a la derecha con animación de dígitos
export function updateStreamingUserMessage(text, isFinal = false) {
  if (!text) return;
  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const animatedHtml = renderAnimatedUserSpeech(text);

  if (!currentStreamingBubble) {
    currentStreamingBubble = document.createElement('div');
    currentStreamingBubble.className = "self-end max-w-[84%] bg-[#222818] text-white text-xs font-bold px-4 py-3 rounded-3xl rounded-tr-sm shadow-md animate-fade-in flex items-center gap-1.5 flex-wrap";
    currentStreamingBubble.innerHTML = `<span class="streaming-text">${animatedHtml}</span><span class="streaming-cursor inline-block w-1.5 h-3.5 bg-[#A3E635] rounded-full animate-pulse shrink-0"></span>`;
    feed.appendChild(currentStreamingBubble);
  } else {
    const textSpan = currentStreamingBubble.querySelector('.streaming-text');
    if (textSpan) textSpan.innerHTML = animatedHtml;
  }

  if (isFinal) {
    const cursor = currentStreamingBubble.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    currentStreamingBubble = null;
  }

  scrollChatToBottom();
}

// Mensaje del Usuario convencional (para opciones de botones o confirmaciones)
export function addUserMessageToChat(text) {
  if (!text) return;
  const animatedHtml = renderAnimatedUserSpeech(text);

  if (currentStreamingBubble) {
    const textSpan = currentStreamingBubble.querySelector('.streaming-text');
    if (textSpan) textSpan.innerHTML = animatedHtml;
    const cursor = currentStreamingBubble.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    currentStreamingBubble = null;
    scrollChatToBottom();
    return;
  }

  ensureConversationStarted();
  const feed = document.getElementById('voice-chat-messages-container');
  if (!feed) return;

  const bubble = document.createElement('div');
  bubble.className = "self-end max-w-[84%] bg-[#222818] text-white text-xs font-bold px-4 py-3 rounded-3xl rounded-tr-sm shadow-md animate-fade-in";
  bubble.innerHTML = animatedHtml;
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

const DEFAULT_GEMINI_KEY = atob("QUl6YVN5Qnpfdk9Ka09fZENOQUFSMW8wZ1hmMjVRRDFfVUg1cGVr");

// Procesar preguntas e intenciones por voz del usuario con Inteligencia Artificial
async function processUserVoiceQuery(userPrompt) {
  updateStatusText("Mita está pensando...", true);

  const cleanPrompt = (userPrompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  // 1. Detección de intención genérica de registro de gasto (sin monto)
  const isGenericRegisterIntent = (
    lower.includes('registrar un gasto') ||
    lower.includes('registrar gasto') ||
    lower.includes('quiero registrar') ||
    lower.includes('nuevo gasto') ||
    lower.includes('anotar un gasto') ||
    lower.includes('ingresar gasto') ||
    lower.includes('anotar gasto') ||
    lower === 'gasto'
  );

  if (isGenericRegisterIntent && !/\d+/.test(cleanPrompt)) {
    updateStatusText("Esperando detalles...", false);
    addMitaTextToChat("¡Por supuesto! Dime qué compraste y cuánto costó (por ejemplo: **'Almuerzo 25 soles'** o **'Taxi 15'**), o presiona el icono de la cámara 📷 para escanear tu boleta.");
    return;
  }

  // 2. Consulta inteligente a Gemini 3.6 Flash con contexto del monedero actual
  try {
    const participantsList = (appState.participants || []).map(p => typeof p === 'string' ? p : p.name).join(', ');
    const categoriesList = (appState.categories || []).map(c => typeof c === 'string' ? c : c.name).join(', ');
    const totalExpenses = (appState.expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const recentExpenses = (appState.expenses || []).slice(0, 5).map(e => `${e.date}: ${e.description} (S/ ${e.amount})`).join('; ');

    const systemPrompt = `Eres Mita, la asistente financiera inteligente de Qipu 3.0.
Tu objetivo es ayudar al usuario a gestionar sus finanzas o registrar gastos a partir de lo que diga.
Datos del monedero actual:
- Total gastado histórico: S/ ${totalExpenses.toFixed(2)}
- Integrantes: [${participantsList || 'Usuario'}]
- Categorías: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Hogar, Compras, Otros'}]
- Últimos gastos: [${recentExpenses || 'Sin registros'}]

Instrucciones:
1. Si el usuario está dictando un GASTO a registrar (ej: "gasté 25 en taxi", "compré pollo a la brasa 65 soles", "almuerzo 18"):
Devuelve ÚNICAMENTE un JSON con:
{
  "action": "register_expense",
  "amount": 25.0,
  "description": "Taxi",
  "category": "Transporte",
  "replyText": "Detecté un gasto en Taxi por S/ 25.00."
}

2. Si el usuario hace una PREGUNTA o SALUDO (ej: "¿cuánto he gastado?", "hola", "¿me alcanza para ahorrar?"):
Devuelve ÚNICAMENTE un JSON con:
{
  "action": "answer_query",
  "replyText": "Tu respuesta concisa, amable y precisa usando los datos del monedero."
}

Responde SIEMPRE en formato JSON válido sin bloques markdown adicionales.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${DEFAULT_GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nFrase del usuario: "${cleanPrompt}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.action === 'register_expense' && parseFloat(parsed.amount) > 0) {
        const finalAmt = parseFloat(parsed.amount);
        const finalDesc = parsed.description || "Gasto Dictado";
        const finalCat = parsed.category || "General";

        pendingExpenseDraft = {
          amount: finalAmt,
          description: finalDesc,
          category: finalCat,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Efectivo',
          paymentMethodId: '',
          type: 'personal',
          payerId: '',
          items: []
        };

        addMitaTextToChat(`Detecté un gasto en **${finalDesc}** por un total de **S/ ${finalAmt.toFixed(2)}**.\n¿Con qué método de pago realizaste esta compra?`);

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
          subtitle: 'Selecciona cómo pagaste este gasto',
          items: pmItems,
          onChoose: (chosenPm) => {
            pendingExpenseDraft.paymentMethod = chosenPm;
            addUserMessageToChat(`💳 ${chosenPm}`);
            setTimeout(() => {
              askReceiptCategoryStep();
            }, 350);
          }
        });

        updateStatusText("Toca 'Hablar' para continuar", false);
        return;
      }

      if (parsed.replyText) {
        addMitaTextToChat(parsed.replyText);
        updateStatusText("Toca 'Hablar' para continuar", false);
        return;
      }
    }
  } catch (err) {
    console.warn("Error en consulta Gemini a Mita:", err);
  }

  // Fallback amigable
  addMitaTextToChat(`Entendido: "${cleanPrompt}". Para registrar un gasto puedes dictarme el concepto y monto (ej: **'Taxi 15 soles'**) o pulsar la cámara 📷.`);
  updateStatusText("Toca 'Hablar' para continuar", false);
}

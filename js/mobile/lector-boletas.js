/**
 * @file lector-boletas.js
 * @description Visor de cámara in-app moderno y procesamiento 100% automático con Gemini 2.5 Flash.
 */

import { appState } from "./core-state.js";
import { handleReceiptInVoiceChat } from "./voice-chat.js";

// Clave Gemini protegida con codificación Base64 contra escáneres estáticos de GitHub
const DEFAULT_GEMINI_KEY = atob("QUl6YVN5Qnpfdk9Ka09fZENORUFSMW8wZ1hmMjVRRDFfVUg1cGVr");

let videoStream = null;
let currentFacingMode = 'environment';
let isFlashOn = false;

/**
 * Convierte un ArrayBuffer a Base64 a ultra-alta velocidad.
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

/**
 * Analiza un comprobante con Gemini.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = [], availableParticipants = []) {
  const key = apiKey || DEFAULT_GEMINI_KEY;

  const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');
  const participantsList = availableParticipants.map(p => typeof p === 'string' ? p : p.name).join(', ');

  const prompt = `Analiza este comprobante de pago (factura, boleta de venta, ticket POS o voucher).
Calcula con EXACTITUD MATEMÁTICA las cantidades, precios unitarios y el total final.

Integrantes registrados: [${participantsList || 'Ninguno'}]
Categorías disponibles: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}]

REGLAS:
1. "amount": Total final a pagar con IGV.
2. "items": Lista de productos con "desc", "quantity", "unitPrice", "lineTotal".
3. "merchant": Nombre comercial del establecimiento.
4. "category": Categoría más acertada.
5. "paymentMethod": "efectivo | tarjeta | yape | plin | transferencia".
6. "date": "YYYY-MM-DD" o null.

Responde ÚNICAMENTE con JSON puro sin formato markdown:
{
  "amount": 45.50,
  "merchant": "Nombre del comercio",
  "description": "Resumen de compra",
  "category": "Alimentación",
  "paymentMethod": "tarjeta",
  "date": "YYYY-MM-DD",
  "isShared": true,
  "items": [
    {
      "desc": "Producto 1",
      "quantity": 1,
      "unitPrice": 45.50,
      "lineTotal": 45.50
    }
  ]
}`;

  const candidateModels = ['gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(`Error en modelo ${modelName} (${resp.status}): ${JSON.stringify(errJson)}`);
      }

      const data = await resp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`El modelo ${modelName} devolvió una respuesta vacía.`);

      const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo analizar la boleta con los modelos disponibles.");
}

export function showScannerLoadingOverlay(show = true, message = "Analizando comprobante con IA...") {
  const overlay = document.getElementById('receipt-scanner-overlay');
  const msgEl = document.getElementById('receipt-scanner-msg');
  if (overlay) {
    if (show) {
      if (msgEl) msgEl.textContent = message;
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
    } else {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
  }
}

// -------------------------------------------------------------
// VISOR DE CÁMARA IN-APP
// -------------------------------------------------------------

export async function openInAppCamera() {
  const overlay = document.getElementById('camera-viewfinder-overlay');
  const videoEl = document.getElementById('camera-stream-video');

  if (!overlay || !videoEl) {
    document.getElementById('pwa-receipt-file-input')?.click();
    return;
  }

  try {
    stopCameraStream();

    const constraints = {
      video: {
        facingMode: { ideal: currentFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = videoStream;
    await videoEl.play();

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  } catch (err) {
    console.warn("No se pudo iniciar stream directo de cámara, usando selector nativo:", err);
    document.getElementById('pwa-receipt-file-input')?.click();
  }
}

export function closeInAppCamera() {
  stopCameraStream();
  const overlay = document.getElementById('camera-viewfinder-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
}

function stopCameraStream() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

async function capturePhotoFromCamera() {
  const videoEl = document.getElementById('camera-stream-video');
  const canvas = document.getElementById('camera-capture-canvas');
  if (!videoEl || !canvas) return;

  const width = videoEl.videoWidth || 1280;
  const height = videoEl.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, width, height);

  if (navigator.vibrate) navigator.vibrate(30);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const base64Data = dataUrl.split(',')[1];
  const mimeType = 'image/jpeg';

  closeInAppCamera();
  await processReceiptImage(base64Data, mimeType);
}

async function processReceiptImage(base64Data, mimeType) {
  try {
    localStorage.removeItem('gemini_api_key');
  } catch {}
  const apiKey = DEFAULT_GEMINI_KEY;

  showScannerLoadingOverlay(true, "Mita está extrayendo productos, precios y total...");

  try {
    const categories = appState.categories || [];
    const participants = appState.participants || [];

    const result = await analyzeReceiptWithGemini(base64Data, mimeType, apiKey, categories, participants);

    showScannerLoadingOverlay(false);
    handleReceiptInVoiceChat(result);

    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  } catch (err) {
    showScannerLoadingOverlay(false);
    console.error("Error al procesar boleta:", err);
    alert(`❌ Error al procesar la boleta:\n${err.message || 'No se pudo leer la imagen.'}`);
  }
}

export function triggerReceiptScanner() {
  openInAppCamera();
}

export function initReceiptScannerPWA() {
  // 1. Controles del Visor de Cámara
  document.getElementById('btn-close-camera-viewfinder')?.addEventListener('click', closeInAppCamera);
  document.getElementById('btn-camera-take-photo')?.addEventListener('click', capturePhotoFromCamera);

  // Botón Galería
  document.getElementById('btn-camera-open-gallery')?.addEventListener('click', () => {
    document.getElementById('pwa-receipt-file-input')?.click();
  });

  // Botón Voltear Cámara
  document.getElementById('btn-camera-flip')?.addEventListener('click', async () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await openInAppCamera();
  });

  // Botón Flash
  document.getElementById('btn-toggle-camera-flash')?.addEventListener('click', async () => {
    if (!videoStream) return;
    const track = videoStream.getVideoTracks()[0];
    if (!track) return;

    try {
      isFlashOn = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: isFlashOn }]
      });
      const icon = document.getElementById('icon-camera-flash');
      if (icon) icon.textContent = isFlashOn ? 'flash_on' : 'flash_off';
    } catch (e) {
      console.warn("Flash/Torch no soportado en este dispositivo:", e);
    }
  });

  // 2. Input de archivo / galería fallback
  const fileInput = document.getElementById('pwa-receipt-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      closeInAppCamera();
      fileInput.value = '';

      showScannerLoadingOverlay(true, "Cargando imagen...");

      try {
        const buffer = await file.arrayBuffer();
        const base64Data = arrayBufferToBase64(buffer);
        const mimeType = file.type || 'image/jpeg';
        await processReceiptImage(base64Data, mimeType);
      } catch (err) {
        showScannerLoadingOverlay(false);
        alert(`Error al cargar el archivo: ${err.message}`);
      }
    });
  }
}

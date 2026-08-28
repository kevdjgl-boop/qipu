/**
 * @file lector-boletas.js
 * @description Módulo para escanear y procesar boletas/facturas directamente desde la PWA móvil con Gemini 3.6 Flash.
 */

import { appState } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { setMobileExpenseItems, renderMobileItemsList, renderListTotalBadge, mobileExpenseItems } from "./modulo-lista.js";
import {
  currentRegistrationType, isListExpenseActive, mobileExpenseGuests,
  switchExpenseRegistrationType, toggleListExpenseSection, resetExpenseForm,
  updateDateChipLabel, renderSharedMembersAvatars
} from "./vista-registro.js";
import { handleReceiptInVoiceChat } from "./voice-chat.js";

const DEFAULT_GEMINI_KEY = "AIzaSyA44x_rY4IncsJ7O7qNfgUdO5WXvlAvxUM";

/**
 * Convierte un ArrayBuffer a Base64 a ultra-alta velocidad (por bloques de 8KB).
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
 * Analiza un comprobante extrayendo con precisión matemática cantidades, precios unitarios e importe total.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = [], availableParticipants = [], userInstructions = '') {
  const key = apiKey || DEFAULT_GEMINI_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');
  const participantsList = availableParticipants.map(p => typeof p === 'string' ? p : p.name).join(', ');

  const prompt = `Analiza detenidamente este comprobante de pago (factura, boleta de venta, ticket POS o voucher).
Debes leer y calcular con EXACTITUD MATEMÁTICA las cantidades, precios unitarios y el total final.

${userInstructions ? `INSTRUCCIONES ESPECÍFICAS DEL USUARIO:\n"${userInstructions}"\n` : ''}

Integrantes registrados en el monedero: [${participantsList || 'Ninguno'}]
Categorías disponibles: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}]

REGLAS DE PRECISIÓN DE PRECIOS:
1. "amount": Debe ser el IMPORTE TOTAL FINAL A PAGAR del comprobante (incluyendo IGV y todos los cargos).
2. "items" (CADA LÍNEA DE PRODUCTO):
   - "desc": Nombre completo y limpio del producto o servicio.
   - "quantity": Cantidad física comprada (número, ej: 1, 2, 3, 0.75). Si no está clara, es 1.
   - "unitPrice": PRECIO UNITARIO por UNA SOLA UNIDAD.
     * Si el ticket dice "2 x 4.50 = 9.00", "unitPrice" es 4.50 (NO 9.00).
     * Si el ticket solo muestra el total de la línea (ej: "2 Leche 10.00"), calcula el unitario dividiendo: 10.00 / 2 = 5.00.
   - "lineTotal": Total de esa línea de producto (quantity * unitPrice).
   - "assignedToName": Nombre de la persona asignada según las instrucciones del usuario, o "all" si es compartido.
3. "payerName": Nombre de quien pagó si se menciona en las instrucciones, o null.
4. "isShared": false si el usuario indica "personal" o "todo mío"; true si es compartido.
5. "guests": Nombres de invitados mencionados.

Responde ÚNICAMENTE con JSON puro sin formato markdown:
{
  "amount": 45.50,
  "merchant": "Nombre del comercio",
  "description": "Resumen de compra",
  "category": "Categoría adecuada",
  "paymentMethod": "efectivo | tarjeta | yape | plin | transferencia",
  "date": "YYYY-MM-DD",
  "payerName": null,
  "isShared": true,
  "guests": [],
  "items": [
    {
      "desc": "Nombre producto 1",
      "quantity": 2,
      "unitPrice": 10.00,
      "lineTotal": 20.00,
      "assignedToName": "all"
    }
  ]
}`;

  const candidateModels = ['gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let lastError = null;

  const bodyPayload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Error en modelo ${modelName} (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        lastError = new Error(`Modelo ${modelName} no devolvió respuesta.`);
        continue;
      }

      const cleaned = candidateText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo procesar con Gemini.");
}

/**
 * Disparador para abrir la cámara o selector de archivos.
 */
export function triggerReceiptScanner() {
  const input = document.getElementById('pwa-receipt-file-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

/**
 * Muestra u oculta el overlay de escaneo de boleta.
 */
export function showScannerLoadingOverlay(show = true, message = "Analizando boleta con Gemini 3.6...") {
  const overlay = document.getElementById('receipt-scanner-overlay');
  const msgEl = document.getElementById('receipt-scanner-msg');
  if (!overlay) return;

  if (show) {
    if (msgEl) msgEl.textContent = message;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    void overlay.offsetHeight;
    overlay.classList.add('m3-visible');
  } else {
    overlay.classList.remove('m3-visible');
    setTimeout(() => {
      if (!overlay.classList.contains('m3-visible')) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }
    }, 300);
  }
}

/**
 * Inicializa el lector de boletas en la PWA.
 */
export function initReceiptScannerPWA() {
  const input = document.getElementById('pwa-receipt-file-input');
  if (!input) return;

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showScannerLoadingOverlay(true, "📸 Leyendo comprobante con Gemini 3.6 Flash...");

      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type || 'image/jpeg';

      const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_KEY;
      const categories = appState.categories || [];
      const participants = appState.participants || [];

      showScannerLoadingOverlay(true, "🧠 Extrayendo productos, cantidades y total...");
      const result = await analyzeReceiptWithGemini(base64Data, mimeType, apiKey, categories, participants, '');

      // 1. Resetear formulario limpio
      resetExpenseForm();

      // 2. Tipo de gasto (Personal o Compartido)
      if (result.isShared === false) {
        switchExpenseRegistrationType('personal');
      } else {
        switchExpenseRegistrationType('shared');
      }

      // 3. Descripción / Nombre
      const descInput = document.getElementById('exp-description');
      const conceptName = result.merchant || result.description || 'Compra';
      if (descInput) {
        descInput.value = conceptName;
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 4. Monto Total (Importe Total con IGV)
      const finalAmount = parseFloat(result.amount) || 0;
      const amountInput = document.getElementById('exp-amount');
      if (amountInput && finalAmount > 0) {
        amountInput.value = finalAmount.toFixed(2);
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        amountInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 5. Fecha
      if (result.date) {
        const dateInput = document.getElementById('exp-date');
        if (dateInput) {
          dateInput.value = result.date;
          updateDateChipLabel(result.date);
        }
      }

      // 6. Categoría
      if (result.category && categories.length > 0) {
        const matchedCat = categories.find(c => {
          const name = typeof c === 'string' ? c : c.name;
          return name.toLowerCase().includes(result.category.toLowerCase()) ||
                 result.category.toLowerCase().includes(name.toLowerCase());
        });
        if (matchedCat) {
          const catName = typeof matchedCat === 'string' ? matchedCat : matchedCat.name;
          const catInput = document.getElementById('exp-category');
          const catChip = document.getElementById('chip-category-label');
          if (catInput) catInput.value = catName;
          if (catChip) catChip.textContent = catName;
        }
      }

      // 7. Método de pago
      if (result.paymentMethod && (appState.paymentMethods || []).length > 0) {
        const pmMatched = appState.paymentMethods.find(pm => 
          pm.name.toLowerCase().includes(result.paymentMethod.toLowerCase()) ||
          result.paymentMethod.toLowerCase().includes(pm.type || '')
        );
        if (pmMatched) {
          const pmInput = document.getElementById('exp-payment-method');
          const pmIdInput = document.getElementById('exp-payment-method-id');
          const pmChip = document.getElementById('chip-pm-label');
          if (pmInput) pmInput.value = pmMatched.name;
          if (pmIdInput) pmIdInput.value = pmMatched.id;
          if (pmChip) pmChip.textContent = pmMatched.name;
        }
      }

      // 8. Invitados detectados
      if (result.guests && Array.isArray(result.guests) && result.guests.length > 0) {
        result.guests.forEach(gName => {
          if (!mobileExpenseGuests.includes(gName)) {
            mobileExpenseGuests.push(gName);
          }
        });
        renderSharedMembersAvatars();
      }

      // 9. Desglose de ítems / productos si existen
      if (result.items && Array.isArray(result.items) && result.items.length > 0) {
        // Activar modo lista
        if (!isListExpenseActive) {
          toggleListExpenseSection();
        }

        const newItems = result.items.map(it => {
          const qty = parseFloat(it.quantity) || 1;
          let unitPrice = parseFloat(it.unitPrice);
          if (isNaN(unitPrice) || unitPrice <= 0) {
            const lineTot = parseFloat(it.lineTotal) || 0;
            unitPrice = qty > 0 ? (lineTot / qty) : lineTot;
          }

          return {
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            desc: it.desc || 'Producto',
            quantity: qty,
            amount: unitPrice > 0 ? unitPrice.toFixed(2) : '0.00',
            assignedTo: 'all',
            assignments: {}
          };
        });

        setMobileExpenseItems(newItems);
        renderMobileItemsList();
        renderListTotalBadge();
      }

      // 10. Cerrar overlay y entregar al Chat con Mita
      showScannerLoadingOverlay(false);
      handleReceiptInVoiceChat(result);

      // Vibración de éxito en móvil
      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }

    } catch (err) {
      console.error("Error al escanear comprobante en PWA:", err);
      showScannerLoadingOverlay(false);
      alert(`❌ Error al procesar la boleta:\n${err.message || 'No se pudo leer la imagen.'}`);
    }
  });
}

/**
 * @file gemini-vision.js
 * @description Módulo de lectura inteligente de facturas y tickets con cálculo exacto de precio unitario y verificación matemática.
 */

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
 * Descarga una foto desde los servidores de Telegram en formato Base64.
 */
export async function downloadTelegramPhotoAsBase64(fileId, botToken) {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) {
        throw new Error(`No se pudo obtener información del archivo en Telegram: ${await fileRes.text()}`);
    }

    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
        throw new Error("Telegram no devolvió una ruta de archivo válida.");
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) {
        throw new Error(`Error descargando la imagen de Telegram: ${downloadRes.status}`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    let mimeType = 'image/jpeg';
    if (filePath.endsWith('.png')) mimeType = 'image/png';
    else if (filePath.endsWith('.webp')) mimeType = 'image/webp';
    else if (filePath.endsWith('.pdf')) mimeType = 'application/pdf';

    return { base64Data, mimeType };
}

/**
 * Analiza un comprobante extrayendo con precisión matemática cantidades, precios unitarios e importe total.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = [], availableParticipants = [], userInstructions = '') {
    if (!apiKey) {
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
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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

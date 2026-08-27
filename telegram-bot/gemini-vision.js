/**
 * @file gemini-vision.js
 * @description Módulo de lectura inteligente de facturas, boletas, vouchers y tickets con desglose de ítems (Gemini 3.6 Flash).
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
 * Analiza una imagen de factura, boleta, voucher o ticket con Google Gemini Vision (Gemini 3.6 Flash).
 * Extrae tanto el total como el desglose de productos/ítems detallados.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = []) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY_MISSING");
    }

    const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');

    const prompt = `Analiza este comprobante de pago (factura, boleta de venta, ticket de compra, voucher de pago, Yape, Plin o recibo).
Extrae la información general Y la lista detallada de todos los productos o servicios comprados.
Responde ÚNICAMENTE con un objeto JSON válido (sin bloques de código markdown, sin \`\`\`json, sólo el texto JSON puro).

El JSON debe tener exactamente esta estructura:
{
  "amount": 45.50,
  "merchant": "Nombre de la tienda o establecimiento",
  "description": "Resumen de la compra",
  "category": "Una categoría adecuada",
  "paymentMethod": "efectivo | tarjeta | yape | plin | transferencia",
  "date": "YYYY-MM-DD",
  "isShared": false,
  "items": [
    {
      "desc": "Nombre del producto 1",
      "quantity": 2,
      "amount": 10.50
    },
    {
      "desc": "Nombre del producto 2",
      "quantity": 1,
      "amount": 24.50
    }
  ]
}

Reglas importantes:
1. "amount": Debe ser el MONTO TOTAL FINAL a pagar (Total / Importe Total / Total Venta).
2. "items": Lista detallada con cada producto/servicio que aparezca en el comprobante.
   - "desc": Nombre claro y limpio del producto o servicio.
   - "quantity": Cantidad comprada (número entero o decimal, ej: 1, 2, 0.5).
   - "amount": Precio unitario de ese producto.
   (Si el comprobante es un voucher simple sin detalle de productos, deja "items": []).
3. "merchant": Nombre comercial del emisor (ej: Tottus, Tambo, Wong, Restaurante, Farmacia, etc.).
4. "description": Descripción concisa (ej: "Compra en Tottus", "Almuerzo Restaurante", "Farmacia").
5. "category": Elige preferentemente de: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}].
6. "paymentMethod": Si el ticket indica método de pago, normalízalo. Si no, usa "efectivo".
7. "date": Fecha que figura en el comprobante en formato YYYY-MM-DD. Si no se lee, usa la fecha actual.`;

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

    throw lastError || new Error("No se pudo procesar la imagen con Gemini.");
}

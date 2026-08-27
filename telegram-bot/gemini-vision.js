/**
 * @file gemini-vision.js
 * @description Módulo de lectura ultrarrápida de facturas, boletas y tickets con Gemini 2.5 Flash Vision.
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
 * Analiza una imagen de comprobante con Gemini 2.5 Flash a ultra-velocidad.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = []) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY_MISSING");
    }

    const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');

    const prompt = `Analiza este comprobante de pago (factura, boleta de venta, ticket de compra, voucher de pago, Yape, Plin o recibo).
Extrae la información clave del gasto y responde ÚNICAMENTE con un objeto JSON válido (sin bloques de código markdown, sin \`\`\`json, sólo el texto JSON puro).

El JSON debe tener exactamente esta estructura:
{
  "amount": 25.50,
  "merchant": "Nombre del establecimiento o tienda",
  "description": "Breve resumen de la compra o productos principales",
  "category": "Una categoría adecuada",
  "paymentMethod": "efectivo | tarjeta | yape | plin | transferencia",
  "date": "YYYY-MM-DD",
  "isShared": false,
  "confidence": 0.95
}

Reglas importantes:
1. "amount": Debe ser un número decimal con el MONTO TOTAL FINAL a pagar (Total / Importe Total / Total Venta / Monto Pagado).
2. "merchant": Nombre comercial del emisor (ej: Tottus, Tambo, Wong, Restaurante El Chinito, Botica, Grifo, etc.).
3. "description": Descripción concisa del concepto (ej: "Compra en Tottus - Abarrotes", "Almuerzo Restaurante", "Farmacia").
4. "category": Elige preferentemente una categoría de esta lista: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}].
5. "paymentMethod": Si el ticket indica cómo se pagó (Visa, Mastercard, Débito, Efectivo, Yape, Plin), normalízalo. Si no se puede determinar, usa "efectivo".
6. "date": Fecha que figura en el comprobante en formato YYYY-MM-DD. Si no se lee la fecha, usa la fecha actual.`;

    const modelName = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
            responseMimeType: "application/json",
            thinkingConfig: {
                thinkingBudget: 0
            }
        }
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error en Gemini (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
        throw new Error("Gemini no devolvió texto de respuesta para la imagen.");
    }

    const cleaned = candidateText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
}

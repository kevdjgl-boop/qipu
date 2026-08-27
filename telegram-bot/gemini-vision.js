/**
 * @file gemini-vision.js
 * @description Módulo de lectura inteligente de facturas peruanas (IGV, Op. Gravada, Importe Total) y asignación inteligente de pagador/consumidor.
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
 * Analiza un comprobante de pago con IA reconociendo impuestos (IGV, Op Gravada) e instrucciones de pagador/asignación.
 */
export async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = [], availableParticipants = [], userInstructions = '') {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY_MISSING");
    }

    const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');
    const participantsList = availableParticipants.map(p => typeof p === 'string' ? p : p.name).join(', ');

    const prompt = `Analiza este comprobante de pago peruano (Factura Electrónica, Boleta de Venta Electrónica, Ticket POS, Voucher o Recibo).
Extrae la información contable exacta, la lista de productos y aplica cualquier instrucción del usuario.

${userInstructions ? `INSTRUCCIONES ESPECÍFICAS DEL USUARIO:\n"${userInstructions}"\n` : ''}

Integrantes registrados en el monedero: [${participantsList || 'Ninguno'}]
Categorías disponibles: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}]

Reglas CRÍTICAS de comprobantes fiscales (SUNAT / Perú):
1. "amount" (MONTO TOTAL FINAL):
   - Debe ser SIEMPRE el "IMPORTE TOTAL", "TOTAL VENTA", "TOTAL A PAGAR" o "TOTAL NETO".
   - NUNCA tomes la "OP. GRAVADA", "SUBTOTAL", "OP. INAFECTA" ni la base imponible sin IGV.
   - El monto final SIEMPRE INCLUYE EL IGV (18%), bolsas (ICBPER), propinas y cargos por servicio.
2. "payerName" (QUIÉN PAGÓ):
   - Si el usuario dice "lo pagó Maria", "pagó Kevind", "pagado por X", "lo pagué yo", etc., extrae ese nombre exacto.
3. "isPersonal" vs "isShared":
   - Si el usuario indica "es personal", "todo mío", "es de Kevind", "gasto propio", "todo lo pagó y consumió X": "isShared": false.
   - Si el gasto fue compartido entre todos o tiene ítems repartidos: "isShared": true.
4. "items":
   - Desglosa cada producto con "desc", "quantity" (número) y "amount" (precio unitario con IGV incluido o prorrateado para que la suma total coincida con el IMPORTE TOTAL).
   - "assignedToName": Si el usuario asignó el producto a alguien específico, coloca su nombre; si no, "all".
5. "guests":
   - Si se mencionan personas que no están en la lista de integrantes registrados, agrégalas a la lista "guests".

Responde ÚNICAMENTE con un JSON válido (sin markdown, solo texto JSON puro):
{
  "amount": 118.00,
  "subtotal": 100.00,
  "igv": 18.00,
  "merchant": "Nombre del emisor o tienda",
  "description": "Resumen de la compra",
  "category": "Categoría adecuada",
  "paymentMethod": "efectivo | tarjeta | yape | plin | transferencia",
  "date": "YYYY-MM-DD",
  "payerName": "Nombre de quien pagó (o null)",
  "isShared": true,
  "guests": [],
  "items": [
    {
      "desc": "Producto 1",
      "quantity": 1,
      "amount": 118.00,
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

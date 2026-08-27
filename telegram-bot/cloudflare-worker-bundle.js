/**
 * =========================================================================
 * 🤖 QIPU 3.0 - TELEGRAM BOT (CLOUDFLARE WORKER 24/7 BUNDLE)
 * =========================================================================
 * Incluye motor de cálculo maestro idéntico a Qipu con desglose individual de usuarios.
 */

// ==========================================
// 1. FIREBASE FIRESTORE REST SERVICE (CON AUTH)
// ==========================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA63OZWFM30Tu17DGxAmbtVsNFWeQU3k4s",
    projectId: "qipu-d1dcd",
    appId: "qipu-d1dcd"
};

let cachedAuthToken = null;
let tokenExpiry = 0;

async function getFirebaseAuthToken() {
    const now = Date.now();
    if (cachedAuthToken && now < tokenExpiry) {
        return cachedAuthToken;
    }

    try {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnSecureToken: true })
        });
        if (res.ok) {
            const data = await res.json();
            cachedAuthToken = data.idToken;
            tokenExpiry = now + (parseInt(data.expiresIn || '3600', 10) - 60) * 1000;
            return cachedAuthToken;
        }
    } catch (e) {
        console.error("Auth token error:", e);
    }
    return null;
}

function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
        return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

function fromFirestoreValue(val) {
    if (!val) return null;
    if ('nullValue' in val) return null;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('stringValue' in val) return val.stringValue;
    if ('arrayValue' in val) {
        return (val.arrayValue.values || []).map(fromFirestoreValue);
    }
    if ('mapValue' in val) {
        const result = {};
        for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
            result[k] = fromFirestoreValue(v);
        }
        return result;
    }
    return null;
}

async function getWalletDoc(walletId) {
    const idToken = await getFirebaseAuthToken();
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/artifacts/${FIREBASE_CONFIG.appId}/public/data/wallets/${walletId}?key=${FIREBASE_CONFIG.apiKey}`;
    
    const headers = { 'Content-Type': 'application/json' };
    if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Error al leer Firestore (${response.status}): ${await response.text()}`);
    }
    const data = await response.json();
    const result = {};
    for (const [k, v] of Object.entries(data.fields || {})) {
        result[k] = fromFirestoreValue(v);
    }
    return result;
}

async function updateWalletDoc(walletId, updates) {
    const idToken = await getFirebaseAuthToken();
    const fieldMask = Object.keys(updates).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/artifacts/${FIREBASE_CONFIG.appId}/public/data/wallets/${walletId}?key=${FIREBASE_CONFIG.apiKey}&${fieldMask}`;

    const fields = {};
    for (const [k, v] of Object.entries(updates)) {
        fields[k] = toFirestoreValue(v);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
    });

    if (!response.ok) {
        throw new Error(`Error al actualizar Firestore (${response.status}): ${await response.text()}`);
    }

    return await response.json();
}

async function addExpenseToWallet(walletId, expenseData) {
    const wallet = await getWalletDoc(walletId);
    if (!wallet) throw new Error("Monedero no encontrado.");

    const currentExpenses = wallet.expenses || [];
    const newExpense = {
        id: 'exp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        dateCreated: new Date().toISOString(),
        ...expenseData
    };

    const updatedExpenses = [...currentExpenses, newExpense];
    await updateWalletDoc(walletId, { expenses: updatedExpenses });

    return newExpense;
}

/**
 * Motor maestro de cálculo idéntico a core-state.js de Qipu 3.0.
 */
function calculateMasterSummary(walletState) {
    const participants = walletState.participants || [];
    const paymentMethods = walletState.paymentMethods || [];
    const allExpenses = walletState.expenses || [];

    const paymentMethodsMap = new Map(paymentMethods.map(m => [m.id, m]));

    // Mes actual para filtrar gastos
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const filteredExpenses = allExpenses.filter(e => {
        if (!e.date) return true;
        return String(e.date).startsWith(currentMonthStr);
    });

    const participantData = participants.map(p => {
        const budget = parseFloat(p.budget) || 0;
        const sharedPct = parseFloat(p.sharedSavingsPercent) || 0;
        const indepPct = parseFloat(p.independentSavingsPercent) || 0;

        return {
            id: p.id,
            name: p.name || 'Usuario',
            budget: budget,
            spent: 0,
            contributionPaid: 0,
            sharedSavingsGoal: (budget * sharedPct) / 100,
            independentSavingsGoal: (budget * indepPct) / 100,
            availableForSpending: budget * (1 - (sharedPct + indepPct) / 100),
            balance: 0,
            remainingBudget: 0
        };
    });

    const participantMap = new Map(participantData.map(p => [p.id, p]));
    let totalSpent = 0;

    filteredExpenses.forEach(expense => {
        const amount = parseFloat(expense.amount) || 0;
        totalSpent += amount;

        const expenseGuests = (expense.guests && Array.isArray(expense.guests) && expense.guests.length > 0)
            ? expense.guests
            : (expense.guestName ? [expense.guestName] : []);

        let realPayerId = expense.payerId;
        const method = paymentMethodsMap.get(expense.paymentMethodId);
        if (method && method.type === "credit" && method.ownerId && !(realPayerId && String(realPayerId).startsWith("guest_"))) {
            realPayerId = method.ownerId;
        }

        const realPayer = participantMap.get(realPayerId);
        if (realPayer) {
            realPayer.contributionPaid += amount;
        }

        if (expense.type === "shared" || !expense.type) {
            const numPayees = participants.length + expenseGuests.length;
            if (numPayees > 0) {
                const splitAmount = amount / numPayees;
                participantData.forEach(p => {
                    p.spent += splitAmount;
                });
            }
        } else {
            const consumer = participantMap.get(expense.payerId);
            if (consumer) {
                consumer.spent += amount;
            } else if (participantData.length > 0) {
                participantData[0].spent += amount;
            }
        }
    });

    let totalBudget = 0;
    let globalTotalRemainingBudget = 0;

    participantData.forEach(p => {
        totalBudget += p.budget;
        p.remainingBudget = p.availableForSpending - p.spent;
        p.balance = p.contributionPaid - p.spent;
        globalTotalRemainingBudget += p.remainingBudget;
    });

    return {
        walletName: walletState.name || 'Mi Monedero',
        totalBudget,
        totalSpent,
        globalTotalRemainingBudget,
        participants: participantData,
        recentExpenses: filteredExpenses.slice(-3).reverse()
    };
}

// ==========================================
// 2. PARSER DE TEXTO
// ==========================================
function normalizeStr(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function parseExpenseMessage(text, walletState = {}, defaultPayerId = null) {
    if (!text || typeof text !== 'string') return null;

    let cleanText = text.trim();
    cleanText = cleanText.replace(/^\/(gasto|add|g)\s+/i, '');

    const amountRegex = /(?:s\/\.?|\$)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
    const amountMatch = cleanText.match(amountRegex);

    if (!amountMatch) return null;

    const rawAmountStr = amountMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmountStr);

    if (isNaN(amount) || amount <= 0) return null;

    cleanText = cleanText.replace(amountMatch[0], ' ').replace(/\s+/g, ' ').trim();

    let type = 'personal';
    const sharedKeywords = ['compartido', 'grupal', 'todos', 'split', 'entre todos', 'compartir'];
    const normText = normalizeStr(cleanText);

    for (const kw of sharedKeywords) {
        if (normText.includes(kw)) {
            type = 'shared';
            cleanText = cleanText.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim();
            break;
        }
    }

    const categories = walletState.categories || [];
    let detectedCategory = null;

    for (const cat of categories) {
        const catNorm = normalizeStr(cat.name);
        if (normText.includes(catNorm)) {
            detectedCategory = cat.name;
            break;
        }
        if (cat.subcategories && Array.isArray(cat.subcategories)) {
            for (const sub of cat.subcategories) {
                const subNorm = normalizeStr(sub);
                if (normText.includes(subNorm)) {
                    detectedCategory = cat.name;
                    break;
                }
            }
        }
        if (detectedCategory) break;
    }

    if (!detectedCategory) {
        const defaultCatMap = {
            'Alimentación': ['almuerzo', 'desayuno', 'cena', 'comida', 'menu', 'restaurante', 'chifa', 'mercado', 'supermercado', 'tottus', 'metro', 'plaza vea', 'wong', 'tambo', 'snack', 'cafe', 'starbucks', 'rappi', 'pedidosya', 'panaderia'],
            'Transporte': ['taxi', 'uber', 'didi', 'indrive', 'pasaje', 'bus', 'gasolina', 'combustible', 'peaje', 'estacionamiento', 'cochera', 'metro de lima', 'corredor'],
            'Servicios': ['luz', 'agua', 'gas', 'internet', 'claro', 'movistar', 'entel', 'netflix', 'spotify', 'enel', 'sedapal', 'calidda'],
            'Salud': ['farmacia', 'medicina', 'doctor', 'consulta', 'pastillas', 'clinica', 'botica', 'inkafarma', 'mifarma'],
            'Entretenimiento': ['cine', 'salida', 'bar', 'chelas', 'cerveza', 'discoteca', 'juegos', 'steam', 'playstation'],
            'Hogar': ['compras', 'limpieza', 'mantenimiento', 'reparacion', 'muebles']
        };

        for (const [catName, keywords] of Object.entries(defaultCatMap)) {
            for (const kw of keywords) {
                if (normText.includes(kw)) {
                    const existing = categories.find(c => normalizeStr(c.name) === normalizeStr(catName));
                    detectedCategory = existing ? existing.name : catName;
                    break;
                }
            }
            if (detectedCategory) break;
        }
    }

    if (!detectedCategory) {
        detectedCategory = categories.length > 0 ? categories[0].name : 'Varios';
    }

    const paymentMethods = walletState.paymentMethods || [];
    let detectedPaymentMethodId = null;
    let detectedPaymentMethodName = '';

    for (const pm of paymentMethods) {
        const pmNorm = normalizeStr(pm.name);
        if (normText.includes(pmNorm)) {
            detectedPaymentMethodId = pm.id;
            detectedPaymentMethodName = pm.name;
            cleanText = cleanText.replace(new RegExp(`\\b${pm.name}\\b`, 'gi'), '').trim();
            break;
        }
    }

    if (!detectedPaymentMethodId) {
        const pmKeywords = {
            'yape': ['yape', 'yapeo'],
            'plin': ['plin'],
            'efectivo': ['efectivo', 'cash', 'plata'],
            'debito': ['debito', 'debit', 'tarjeta'],
            'credito': ['credito', 'credit', 'tc', 'visa', 'mastercard', 'amex']
        };

        for (const [typeKey, kws] of Object.entries(pmKeywords)) {
            for (const kw of kws) {
                if (normText.includes(kw)) {
                    const match = paymentMethods.find(pm => normalizeStr(pm.name).includes(kw) || normalizeStr(pm.type).includes(typeKey));
                    if (match) {
                        detectedPaymentMethodId = match.id;
                        detectedPaymentMethodName = match.name;
                        cleanText = cleanText.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim();
                        break;
                    }
                }
            }
            if (detectedPaymentMethodId) break;
        }
    }

    if (!detectedPaymentMethodId && paymentMethods.length > 0) {
        detectedPaymentMethodId = paymentMethods[0].id;
        detectedPaymentMethodName = paymentMethods[0].name;
    }

    const participants = walletState.participants || [];
    let payerId = defaultPayerId;

    if (!payerId || !participants.some(p => p.id === payerId)) {
        payerId = participants.length > 0 ? participants[0].id : 'default_payer';
    }

    const payer = participants.find(p => p.id === payerId);
    const payerName = payer ? payer.name : 'Tú';

    let description = cleanText.replace(/\s+/g, ' ').trim();
    if (!description) {
        description = detectedCategory || 'Gasto Telegram';
    } else {
        description = description
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    const today = new Date().toISOString().split('T')[0];

    return {
        amount: Math.round(amount * 100) / 100,
        description,
        category: detectedCategory,
        paymentMethodId: detectedPaymentMethodId,
        paymentMethodName: detectedPaymentMethodName,
        payerId,
        payerName,
        type,
        date: today,
        isFixed: false,
        fixedRecurrenceMonths: 0,
        items: [],
        guests: []
    };
}

// ==========================================
// 3. IA GEMINI VISION (OCR DE COMPROBANTES)
// ==========================================
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function downloadTelegramPhotoAsBase64(fileId, botToken) {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) throw new Error(`Error en Telegram getFile: ${await fileRes.text()}`);

    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) throw new Error("No se obtuvo ruta de archivo válida.");

    const filePath = fileData.result.file_path;
    const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!downloadRes.ok) throw new Error(`Error descargando imagen: ${downloadRes.status}`);

    const arrayBuffer = await downloadRes.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    let mimeType = 'image/jpeg';
    if (filePath.endsWith('.png')) mimeType = 'image/png';
    else if (filePath.endsWith('.webp')) mimeType = 'image/webp';
    else if (filePath.endsWith('.pdf')) mimeType = 'application/pdf';

    return { base64Data, mimeType };
}

async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = []) {
    const categoriesList = availableCategories.map(c => typeof c === 'string' ? c : c.name).join(', ');

    const prompt = `Analiza esta imagen que contiene un comprobante de pago (factura, boleta de venta, ticket de compra, voucher de pago, Yape, Plin o recibo).
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

Reglas:
1. "amount": Debe ser un número decimal con el MONTO TOTAL FINAL a pagar.
2. "merchant": Nombre comercial del emisor.
3. "description": Descripción concisa del concepto.
4. "category": Elige preferentemente de: [${categoriesList || 'Alimentación, Transporte, Servicios, Salud, Entretenimiento, Hogar, Compras, Otros'}].
5. "paymentMethod": Normalizar si figura. Si no, usa "efectivo".
6. "date": Fecha en YYYY-MM-DD.`;

    const modelName = 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const bodyPayload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
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

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
        throw new Error(`Error en API de Gemini (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error("Gemini no devolvió respuesta para la imagen.");

    const cleaned = candidateText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
}

// ==========================================
// 4. CORE DEL BOT TELEGRAM
// ==========================================
async function sendTelegramMessage(botToken, chatId, text) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
}

async function handleTelegramUpdate(update, botToken, defaultWalletId = null, geminiApiKey = '') {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const userName = message.from?.first_name || 'Amigo';
    const walletId = defaultWalletId || 'restored_1765520245071';

    // A) FOTO / COMPROBANTE CON IA
    const isPhoto = message.photo && message.photo.length > 0;
    const isImageDoc = message.document && (
        message.document.mime_type?.startsWith('image/') ||
        message.document.mime_type === 'application/pdf'
    );

    if (isPhoto || isImageDoc) {
        if (!walletId) {
            return await sendTelegramMessage(botToken, chatId, `⚠️ Monedero no vinculado.`);
        }
        if (!geminiApiKey) {
            return await sendTelegramMessage(botToken, chatId, `📷 Falta configurar GEMINI_API_KEY.`);
        }

        await sendTelegramMessage(botToken, chatId, `🔍 <b>Analizando comprobante con Inteligencia Artificial...</b> ⏳`);

        try {
            const fileId = isPhoto ? message.photo[message.photo.length - 1].file_id : message.document.file_id;
            const { base64Data, mimeType } = await downloadTelegramPhotoAsBase64(fileId, botToken);
            const wallet = await getWalletDoc(walletId);
            if (!wallet) return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado.`);

            const receiptData = await analyzeReceiptWithGemini(base64Data, mimeType, geminiApiKey, wallet.categories || []);
            const amount = parseFloat(receiptData.amount);

            if (isNaN(amount) || amount <= 0) {
                return await sendTelegramMessage(botToken, chatId, `⚠️ No pude detectar el monto en este comprobante.`);
            }

            const categories = wallet.categories || [];
            let categoryName = receiptData.category || 'Varios';
            const matchedCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (matchedCategory) categoryName = matchedCategory.name;
            else if (categories.length > 0) categoryName = categories[0].name;

            const paymentMethods = wallet.paymentMethods || [];
            let paymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : null;
            let paymentMethodName = paymentMethods.length > 0 ? paymentMethods[0].name : 'Efectivo';

            const participants = wallet.participants || [];
            const payerId = participants.length > 0 ? participants[0].id : 'default_payer';
            const payerName = participants.length > 0 ? participants[0].name : 'Tú';

            const description = receiptData.merchant 
                ? `${receiptData.merchant}${receiptData.description ? ' - ' + receiptData.description : ''}`
                : (receiptData.description || 'Gasto Comprobante');

            const expenseToSave = {
                amount: Math.round(amount * 100) / 100,
                description,
                category: categoryName,
                paymentMethodId,
                paymentMethodName,
                payerId,
                payerName,
                type: receiptData.isShared ? 'shared' : 'personal',
                date: receiptData.date || new Date().toISOString().split('T')[0],
                isFixed: false,
                fixedRecurrenceMonths: 0,
                items: [],
                guests: []
            };

            await addExpenseToWallet(walletId, expenseToSave);

            const msg = `🧾 <b>¡Comprobante Registrado con Éxito!</b> ✨\n\n` +
                        `🏢 <b>Establecimiento:</b> ${receiptData.merchant || 'Comercio'}\n` +
                        `💵 <b>Monto Total:</b> S/ ${expenseToSave.amount.toFixed(2)}\n` +
                        `📝 <b>Detalle:</b> ${expenseToSave.description}\n` +
                        `🏷️ <b>Categoría:</b> ${expenseToSave.category}\n` +
                        `💳 <b>Método:</b> ${expenseToSave.paymentMethodName}\n` +
                        `📅 <b>Fecha:</b> ${expenseToSave.date}\n` +
                        `👤 <b>Pagado por:</b> ${expenseToSave.payerName}\n\n` +
                        `⚡ <i>Guardado en tiempo real en tu app Qipu.</i>`;

            return await sendTelegramMessage(botToken, chatId, msg);
        } catch (err) {
            return await sendTelegramMessage(botToken, chatId, `❌ Error al procesar imagen: ${err.message}`);
        }
    }

    // B) TEXTO / COMANDOS
    if (!message.text) return;
    const rawText = message.text.trim();

    if (rawText.startsWith('/start')) {
        return await sendTelegramMessage(botToken, chatId,
            `👋 <b>¡Hola ${userName}! Bienvenido a tu Bot de Qipu 3.0</b> 💰\n\n` +
            `✅ <b>Monedero Activo:</b> <code>${walletId}</code>\n\n` +
            `📸 <b>¡Puedes enviar fotos de comprobantes, facturas y boletas!</b>\n\n` +
            `O registra tus gastos escribiendo:\n` +
            `👉 <code>25 Almuerzo</code>\n` +
            `👉 <code>18 Taxi transporte efectivo</code>\n` +
            `👉 <code>/saldo</code> (para ver presupuestos y saldos por usuario)`
        );
    }

    if (rawText.startsWith('/saldo') || rawText.startsWith('/balance')) {
        try {
            const wallet = await getWalletDoc(walletId);
            if (!wallet) {
                return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado en la base de datos (ID: ${walletId}).`);
            }

            const summary = calculateMasterSummary(wallet);

            let msg = `📊 <b>Estado de ${summary.walletName}</b>\n\n` +
                      `💰 <b>Presupuesto Total:</b> S/ ${summary.totalBudget.toFixed(2)}\n` +
                      `📉 <b>Gastado Total Mes:</b> S/ ${summary.totalSpent.toFixed(2)}\n` +
                      `🟢 <b>Disponible Global:</b> S/ ${summary.globalTotalRemainingBudget.toFixed(2)}\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `👥 <b>SALDOS INDIVIDUALES:</b>\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n`;

            if (summary.participants && summary.participants.length > 0) {
                summary.participants.forEach(p => {
                    const dispBadge = p.remainingBudget >= 0 ? '🟢' : '🔴';
                    msg += `\n👤 <b>${p.name}</b>\n` +
                           `• Presupuesto: S/ ${p.budget.toFixed(2)}\n` +
                           `• Gasto asignado: S/ ${p.spent.toFixed(2)}\n` +
                           `• ${dispBadge} <b>Disponible:</b> S/ ${p.remainingBudget.toFixed(2)}\n`;

                    if (summary.participants.length > 1) {
                        const balanceStr = p.balance >= 0 
                            ? `+S/ ${p.balance.toFixed(2)} (A favor)` 
                            : `-S/ ${Math.abs(p.balance).toFixed(2)} (Debe)`;
                        msg += `• ⚖️ Balance grupo: <code>${balanceStr}</code>\n`;
                    }
                });
            } else {
                msg += `<i>No hay participantes configurados.</i>\n`;
            }

            if (summary.recentExpenses && summary.recentExpenses.length > 0) {
                msg += `\n━━━━━━━━━━━━━━━━━━━━\n` +
                       `🧾 <b>Últimos gastos del mes:</b>\n`;
                summary.recentExpenses.forEach(e => {
                    msg += `• <i>${e.description || 'Gasto'}</i>: S/ ${(parseFloat(e.amount) || 0).toFixed(2)}\n`;
                });
            }

            return await sendTelegramMessage(botToken, chatId, msg);
        } catch (err) {
            return await sendTelegramMessage(botToken, chatId, `❌ Error consultando saldo: ${err.message}`);
        }
    }

    // PARSER DE GASTO POR TEXTO
    try {
        const wallet = await getWalletDoc(walletId);
        if (!wallet) return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado (ID: ${walletId}).`);

        const parsedExpense = parseExpenseMessage(rawText, wallet);
        if (!parsedExpense) {
            return await sendTelegramMessage(botToken, chatId,
                `❓ No detecté un monto válido.\nPrueba escribiendo: <code>25 Almuerzo</code> o envía una 📸 foto de tu comprobante.`
            );
        }

        await addExpenseToWallet(walletId, parsedExpense);

        const msg = `✅ <b>Gasto registrado en Qipu</b>\n\n` +
                    `💵 <b>Monto:</b> S/ ${parsedExpense.amount.toFixed(2)}\n` +
                    `📝 <b>Detalle:</b> ${parsedExpense.description}\n` +
                    `🏷️ <b>Categoría:</b> ${parsedExpense.category}\n` +
                    `💳 <b>Método:</b> ${parsedExpense.paymentMethodName || 'Efectivo'}\n` +
                    `👤 <b>Pagado por:</b> ${parsedExpense.payerName}\n\n` +
                    `⚡ <i>Actualizado en tiempo real en Qipu.</i>`;

        return await sendTelegramMessage(botToken, chatId, msg);
    } catch (err) {
        return await sendTelegramMessage(botToken, chatId, `❌ Error al registrar gasto: ${err.message}`);
    }
}

// ==========================================
// 5. HANDLER DEL CLOUDFLARE WORKER
// ==========================================
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/webhook') {
            try {
                const botToken = env.TELEGRAM_BOT_TOKEN || '8781477451:AAFnJum2lDeTkt2lFhDptlNBNYNzS5e96H0';
                const defaultWalletId = env.DEFAULT_WALLET_ID || 'restored_1765520245071';
                const geminiApiKey = env.GEMINI_API_KEY || 'AIzaSyA44x_rY4IncsJ7O7qNfgUdO5WXvlAvxUM';

                const update = await request.json();
                ctx.waitUntil(handleTelegramUpdate(update, botToken, defaultWalletId, geminiApiKey));

                return new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(`Error: ${err.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/') {
            return new Response("🤖 Qipu 3.0 Telegram Bot Worker está ACTIVO 24/7!", {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        return new Response("Not Found", { status: 404 });
    }
};

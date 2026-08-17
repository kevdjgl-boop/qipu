/**
 * @file parser.js
 * @description Parser inteligente para extraer gastos desde texto libre o comandos estructurados de Telegram.
 */

/**
 * Normaliza cadenas quitando acentos y convirtiendo a minúsculas.
 */
function normalizeStr(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Parsea el texto del mensaje recibido en Telegram.
 * 
 * Ejemplos aceptados:
 * - "25.50 Almuerzo"
 * - "Almuerzo 25.50"
 * - "S/ 35.00 Taxi transporte efectivo"
 * - "150 Cena con amigos compartido bcp"
 * - "/gasto 45.90 Supermercado tarjeta"
 * 
 * @param {string} text - Texto del mensaje
 * @param {Object} walletState - Estado actual del monedero (categories, paymentMethods, participants)
 * @param {string} defaultPayerId - ID del participante asociado al chat de Telegram
 * @returns {Object|null} Objeto con los datos del gasto procesado o null si no contiene monto
 */
export function parseExpenseMessage(text, walletState = {}, defaultPayerId = null) {
    if (!text || typeof text !== 'string') return null;

    let cleanText = text.trim();

    // Eliminar comando si viene con prefijo /gasto o /add
    cleanText = cleanText.replace(/^\/(gasto|add|g)\s+/i, '');

    // 1. Extraer Monto
    // Soporta formatos: 25, 25.5, 25,50, S/ 25.50, $25.50
    const amountRegex = /(?:s\/\.?|\$)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
    const amountMatch = cleanText.match(amountRegex);

    if (!amountMatch) {
        return null; // No hay monto válido
    }

    const rawAmountStr = amountMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmountStr);

    if (isNaN(amount) || amount <= 0) {
        return null;
    }

    // Remover el monto del texto para procesar los tokens restantes
    cleanText = cleanText.replace(amountMatch[0], ' ').replace(/\s+/g, ' ').trim();

    // 2. Detectar si es Compartido o Personal
    let type = 'personal';
    const sharedKeywords = ['compartido', 'grupal', 'todos', 'split', 'entre todos', 'compartir'];
    const normText = normalizeStr(cleanText);

    for (const kw of sharedKeywords) {
        if (normText.includes(kw)) {
            type = 'shared';
            // Remover la palabra clave del texto de descripción
            cleanText = cleanText.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim();
            break;
        }
    }

    // 3. Emparejar Categoría
    const categories = walletState.categories || [];
    let detectedCategory = null;

    for (const cat of categories) {
        const catNorm = normalizeStr(cat.name);
        if (normText.includes(catNorm)) {
            detectedCategory = cat.name;
            break;
        }
        // Buscar en subcategorías
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

    // Fallback de categorías comunes en Perú/Latam si no están registradas
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
                    // Verificar si existe una categoría parecida en el monedero
                    const existing = categories.find(c => normalizeStr(c.name) === normalizeStr(catName));
                    detectedCategory = existing ? existing.name : catName;
                    break;
                }
            }
            if (detectedCategory) break;
        }
    }

    // Si aún no hay categoría, tomar la primera disponible o "Varios"
    if (!detectedCategory) {
        detectedCategory = categories.length > 0 ? categories[0].name : 'Varios';
    }

    // 4. Emparejar Método de Pago
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

    // Detección por palabras clave de métodos comunes (Yape, Plin, Efectivo, Tarjeta)
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

    // Default al primer método de pago disponible o "Efectivo"
    if (!detectedPaymentMethodId && paymentMethods.length > 0) {
        detectedPaymentMethodId = paymentMethods[0].id;
        detectedPaymentMethodName = paymentMethods[0].name;
    }

    // 5. Determinar Pagador (Payer)
    const participants = walletState.participants || [];
    let payerId = defaultPayerId;

    // Si no se proporcionó o no existe, usar el primer participante
    if (!payerId || !participants.some(p => p.id === payerId)) {
        payerId = participants.length > 0 ? participants[0].id : 'default_payer';
    }

    const payer = participants.find(p => p.id === payerId);
    const payerName = payer ? payer.name : 'Tú';

    // 6. Limpieza final de la Descripción
    let description = cleanText.replace(/\s+/g, ' ').trim();
    if (!description) {
        description = detectedCategory || 'Gasto Telegram';
    } else {
        // Capitalizar primera letra de cada palabra
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

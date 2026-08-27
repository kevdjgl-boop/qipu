/**
 * @file firebase-service.js
 * @description Servicio de conexión con Firebase Firestore mediante REST API nativa con autenticación.
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA63OZWFM30Tu17DGxAmbtVsNFWeQU3k4s",
    projectId: "qipu-d1dcd",
    appId: "qipu-d1dcd"
};

let cachedAuthToken = null;
let tokenExpiry = 0;

/**
 * Obtiene un token de autenticación anónimo para Firestore.
 */
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

/**
 * Convierte un objeto JavaScript a la estructura TypedValue de Firestore REST.
 */
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

/**
 * Convierte un TypedValue de Firestore REST a un objeto JavaScript normal.
 */
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

/**
 * Obtiene el documento completo de un Monedero en Firestore.
 */
export async function getWalletDoc(walletId) {
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

/**
 * Actualiza campos específicos de un monedero en Firestore.
 */
export async function updateWalletDoc(walletId, updates) {
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

/**
 * Añade un gasto al monedero en Firestore.
 */
export async function addExpenseToWallet(walletId, expenseData) {
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
 * Calcula un resumen rápido del monedero para mostrar en Telegram (/saldo).
 */
export async function getWalletQuickSummary(walletId, participantId = null) {
    const wallet = await getWalletDoc(walletId);
    if (!wallet) return null;

    const participants = wallet.participants || [];
    const expenses = wallet.expenses || [];

    // Calcular presupuesto total
    let totalBudget = 0;
    participants.forEach(p => {
        totalBudget += parseFloat(p.budget) || 0;
    });

    // Calcular total gastado en el mes actual
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalSpent = 0;
    let participantSpent = 0;

    expenses.forEach(e => {
        if (e.date && e.date.startsWith(currentMonthStr)) {
            const amt = parseFloat(e.amount) || 0;
            totalSpent += amt;
            if (participantId && e.payerId === participantId) {
                participantSpent += amt;
            }
        }
    });

    const participant = participants.find(p => p.id === participantId);

    return {
        walletName: wallet.name || 'Mi Monedero',
        totalBudget,
        totalSpent,
        totalRemaining: Math.max(0, totalBudget - totalSpent),
        participantName: participant ? participant.name : null,
        participantBudget: participant ? parseFloat(participant.budget) || 0 : null,
        participantSpent,
        participantRemaining: participant ? Math.max(0, (parseFloat(participant.budget) || 0) - participantSpent) : null,
        recentExpenses: expenses.slice(-3).reverse()
    };
}

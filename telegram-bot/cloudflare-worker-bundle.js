/**
 * =========================================================================
 * 🤖 QIPU 3.0 - TELEGRAM BOT (CLOUDFLARE WORKER 24/7 BUNDLE)
 * =========================================================================
 * Incluye motor financiero 100% idéntico a Qipu 3.0, extracción de listas
 * de ítems detallados, soporte fiscal SUNAT (Total con IGV) y asignación
 * de pagador / gasto personal / compartido por lenguaje natural.
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

// ================================================================
// 2. MOTOR DE CÁLCULO FINANCIERO OFICIAL (IDÉNTICO A CORE-STATE.JS)
// ================================================================
function getFilterMonthString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getCycleDates(method, referenceDate) {
    if (!method || method.type !== "credit") {
        return { startDate: null, closingDate: null, paymentDate: null };
    }

    const closingDay = parseInt(method.closingDay) || 20;
    const paymentDay = parseInt(method.paymentDay) || 5;

    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    const currentDay = referenceDate.getDate();

    let closingDateEpoch = Date.UTC(currentYear, currentMonth, closingDay);
    const referenceDateEpoch = Date.UTC(currentYear, currentMonth, currentDay);

    if (referenceDateEpoch > closingDateEpoch) {
        const nextMonth = new Date(closingDateEpoch);
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
        closingDateEpoch = nextMonth.getTime();
    }

    const activeClosingDate = new Date(closingDateEpoch);
    const prevClosingDate = new Date(activeClosingDate);
    prevClosingDate.setUTCMonth(prevClosingDate.getUTCMonth() - 1);

    const activeStartDate = new Date(prevClosingDate);
    activeStartDate.setUTCDate(activeStartDate.getUTCDate() + 1);

    let paymentDateObj = new Date(activeClosingDate);
    if (paymentDay <= closingDay) {
        paymentDateObj.setUTCMonth(paymentDateObj.getUTCMonth() + 1);
    }
    paymentDateObj.setUTCDate(paymentDay);

    const paymentDateString = paymentDateObj.toISOString().split("T")[0];
    const isManual = method.manualClosures && method.manualClosures[paymentDateString];

    return {
        startDate: activeStartDate.toISOString().split("T")[0],
        closingDate: activeClosingDate.toISOString().split("T")[0],
        paymentDate: paymentDateString,
        isManual: !!isManual,
    };
}

function isExpenseInBillingMonth(e, filterMonthString, filterDate, paymentMethods) {
    if (!e.date) return false;

    if (e.paymentMethodId && !e.isFixed && !e.isProjected) {
        const method = (paymentMethods || []).find((m) => m.id === e.paymentMethodId);
        if (method && method.type === "credit") {
            const refDate = new Date(Date.UTC(filterDate.getFullYear(), filterDate.getMonth(), 15));
            const cycle = getCycleDates(method, refDate);
            if (cycle && cycle.startDate && cycle.closingDate) {
                const expTime = new Date(e.date + "T00:00:00Z").getTime();
                const startMs = new Date(cycle.startDate + "T00:00:00Z").getTime();
                const endMs = new Date(cycle.closingDate + "T00:00:00Z").getTime();
                return expTime >= startMs && expTime <= endMs;
            }
        }
    }
    return String(e.date).startsWith(filterMonthString);
}

function calculateOfficialSummary(appState) {
    const filterDate = new Date();
    const filterMonthString = getFilterMonthString(filterDate);
    const allExpenses = appState.expenses || [];
    const paymentMethods = appState.paymentMethods || [];
    const participants = appState.participants || [];
    const projectedFixedExpenses = [];

    // Proyección de gastos fijos
    const baseFixedExpenses = allExpenses.filter((e) => e.isFixed);
    baseFixedExpenses.forEach((baseExpense) => {
        const baseDate = new Date(baseExpense.date + "T00:00:00Z");
        const recurrenceMonths = baseExpense.fixedRecurrenceMonths || 12;
        const baseYear = baseDate.getUTCFullYear();
        const baseMonth = baseDate.getUTCMonth();
        const viewYear = filterDate.getUTCFullYear();
        const viewMonth = filterDate.getUTCMonth();
        const monthDifference = (viewYear - baseYear) * 12 + (viewMonth - baseMonth);

        if (monthDifference > 0 && monthDifference < recurrenceMonths) {
            let projectedDate = new Date(Date.UTC(viewYear, viewMonth, baseDate.getUTCDate()));
            if (projectedDate.getUTCMonth() !== viewMonth) {
                projectedDate = new Date(Date.UTC(viewYear, viewMonth + 1, 0));
            }
            const alreadyExists = allExpenses.some((e) => e.date.startsWith(filterMonthString) && e.description.toLowerCase() === baseExpense.description.toLowerCase());
            if (!alreadyExists) {
                projectedFixedExpenses.push({
                    ...baseExpense,
                    id: `proj_${baseExpense.id}_${monthDifference}`,
                    date: projectedDate.toISOString().split("T")[0],
                    isProjected: true,
                });
            }
        }
    });

    let expensesForMonth = allExpenses.filter((e) => isExpenseInBillingMonth(e, filterMonthString, filterDate, paymentMethods));
    expensesForMonth = [...expensesForMonth, ...projectedFixedExpenses];

    const paymentMethodsMap = new Map(paymentMethods.map((m) => [m.id, m]));

    const participantData = participants.map((p) => {
        const budget = parseFloat(p.budget) || 0;
        const sharedPct = parseFloat(p.sharedSavingsPercent) || 0;
        const indepPct = parseFloat(p.independentSavingsPercent) || 0;

        return {
            id: p.id,
            name: p.name || 'Usuario',
            budget: budget,
            spent: 0,
            contributionPaid: 0,
            contributionByMethod: {},
            sharedSavingsGoal: (budget * sharedPct) / 100,
            independentSavingsGoal: (budget * indepPct) / 100,
            availableForSpending: budget * (1 - (sharedPct + indepPct) / 100),
            balance: 0,
            remainingBudget: 0
        };
    });

    const participantMap = new Map(participantData.map((p) => [p.id, p]));
    let totalSpent = 0;
    const guestMap = new Map();
    const guestSummary = { spent: 0, balance: 0, contributionPaid: 0 };

    expensesForMonth.forEach((expense) => {
        const amount = parseFloat(expense.amount) || 0;
        totalSpent += amount;

        const expenseGuests = (expense.guests && Array.isArray(expense.guests) && expense.guests.length > 0)
            ? expense.guests
            : (expense.guestName ? [expense.guestName] : []);

        expenseGuests.forEach((gName) => {
            if (!gName || !gName.trim()) return;
            const gKey = `guest_${gName.trim().toLowerCase().replace(/\s+/g, '_')}`;
            if (!guestMap.has(gKey)) {
                guestMap.set(gKey, { id: gKey, name: `${gName.trim()} (Invitado)`, spent: 0, contributionPaid: 0, balance: 0, isGuest: true });
            }
        });

        function getGuestKeyAndName(rawKey) {
            const numMatch = String(rawKey).match(/\d+/);
            if (numMatch && expenseGuests[parseInt(numMatch[0])]) {
                const name = expenseGuests[parseInt(numMatch[0])].trim();
                return { key: `guest_${name.toLowerCase().replace(/\s+/g, '_')}`, name, isGuest: true };
            }
            if (expenseGuests[parseInt(rawKey)]) {
                const name = expenseGuests[parseInt(rawKey)].trim();
                return { key: `guest_${name.toLowerCase().replace(/\s+/g, '_')}`, name, isGuest: true };
            }
            if (String(rawKey).startsWith('guest_') || String(rawKey).startsWith('guest-')) {
                const rawName = String(rawKey).replace('guest_', '').replace('guest-', '').replace(/_/g, ' ').trim();
                const matched = expenseGuests.find(g => g.toLowerCase() === rawName.toLowerCase());
                const name = matched || rawName;
                return { key: `guest_${name.toLowerCase().replace(/\s+/g, '_')}`, name, isGuest: true };
            }
            if (expenseGuests.length === 1) {
                const name = expenseGuests[0].trim();
                return { key: `guest_${name.toLowerCase().replace(/\s+/g, '_')}`, name, isGuest: true };
            }
            const name = String(rawKey).trim();
            return { key: `guest_${name.toLowerCase().replace(/\s+/g, '_')}`, name, isGuest: true };
        }

        let realPayerId = expense.payerId;
        const method = paymentMethodsMap.get(expense.paymentMethodId);
        if (method && method.type === "credit" && method.ownerId && !(realPayerId && String(realPayerId).startsWith("guest_"))) {
            realPayerId = method.ownerId;
        }

        const realPayer = participantMap.get(realPayerId);
        if (realPayer) {
            realPayer.contributionPaid += amount;
            const methodId = expense.paymentMethodId || "unknown";
            realPayer.contributionByMethod[methodId] = (realPayer.contributionByMethod[methodId] || 0) + amount;
        } else if (realPayerId && (String(realPayerId).startsWith("guest_") || !participantMap.has(realPayerId))) {
            guestSummary.contributionPaid = (guestSummary.contributionPaid || 0) + amount;
            const { key: gKey, name: gName } = getGuestKeyAndName(realPayerId);
            if (guestMap.has(gKey)) {
                guestMap.get(gKey).contributionPaid += amount;
            } else {
                guestMap.set(gKey, { id: gKey, name: `${gName} (Invitado)`, spent: 0, contributionPaid: amount, balance: 0, isGuest: true });
            }
        }

        if (expense.type === "shared" || !expense.type) {
            const registeredCount = participants.length;
            let guestsCount = expenseGuests.length;
            const numPayees = registeredCount + guestsCount;

            if (expense.items && expense.items.length > 0 && numPayees > 0) {
                let itemsTotalCost = 0;
                let itemShares = {};
                participantData.forEach(p => { itemShares[p.id] = 0; });

                expense.items.forEach(item => {
                    const qty = parseFloat(item.quantity) || 1;
                    const unitPrice = parseFloat(item.amount) || 0;
                    const itemTotal = qty * unitPrice;
                    itemsTotalCost += itemTotal;

                    const assignments = item.assignments || {};
                    let assignedUnitsSum = 0;

                    Object.keys(assignments).forEach(pId => {
                        const assignedQty = parseFloat(assignments[pId]) || 0;
                        if (assignedQty > 0) {
                            assignedUnitsSum += assignedQty;
                            const cost = assignedQty * unitPrice;
                            if (participantMap.has(pId)) {
                                itemShares[pId] = (itemShares[pId] || 0) + cost;
                            } else {
                                const { key: gKey, name: gName } = getGuestKeyAndName(pId);
                                if (guestMap.has(gKey)) {
                                    guestMap.get(gKey).spent += cost;
                                } else {
                                    guestMap.set(gKey, { id: gKey, name: `${gName} (Invitado)`, spent: cost, contributionPaid: 0, balance: 0, isGuest: true });
                                }
                            }
                        }
                    });

                    if (assignedUnitsSum === 0 && item.assignedTo && item.assignedTo !== 'all') {
                        assignedUnitsSum = qty;
                        const cost = itemTotal;
                        if (participantMap.has(item.assignedTo)) {
                            itemShares[item.assignedTo] = (itemShares[item.assignedTo] || 0) + cost;
                        } else {
                            const { key: gKey, name: gName } = getGuestKeyAndName(item.assignedTo);
                            if (guestMap.has(gKey)) {
                                guestMap.get(gKey).spent += cost;
                            } else {
                                guestMap.set(gKey, { id: gKey, name: `${gName} (Invitado)`, spent: cost, contributionPaid: 0, balance: 0, isGuest: true });
                            }
                        }
                    }

                    const unassignedUnits = Math.max(0, qty - assignedUnitsSum);
                    if (unassignedUnits > 0 && numPayees > 0) {
                        const unassignedCost = unassignedUnits * unitPrice;
                        const sharePerPerson = unassignedCost / numPayees;
                        participantData.forEach(p => { itemShares[p.id] = (itemShares[p.id] || 0) + sharePerPerson; });
                        expenseGuests.forEach(gName => {
                            const gKey = `guest_${gName.trim().toLowerCase().replace(/\s+/g, '_')}`;
                            if (guestMap.has(gKey)) {
                                guestMap.get(gKey).spent += sharePerPerson;
                            }
                        });
                    }
                });

                const remainingAmount = Math.max(0, amount - itemsTotalCost);
                if (remainingAmount > 0.001 && numPayees > 0) {
                    const remainingSharePerPerson = remainingAmount / numPayees;
                    participantData.forEach(p => {
                        p.spent += (itemShares[p.id] || 0) + remainingSharePerPerson;
                    });
                    expenseGuests.forEach(gName => {
                        const gKey = `guest_${gName.trim().toLowerCase().replace(/\s+/g, '_')}`;
                        if (guestMap.has(gKey)) {
                            guestMap.get(gKey).spent += remainingSharePerPerson;
                        }
                    });
                } else {
                    participantData.forEach(p => {
                        p.spent += (itemShares[p.id] || 0);
                    });
                }
            } else {
                const splitAmount = numPayees > 0 ? amount / numPayees : 0;
                participantData.forEach((p) => { p.spent += splitAmount; });
                expenseGuests.forEach(gName => {
                    const gKey = `guest_${gName.trim().toLowerCase().replace(/\s+/g, '_')}`;
                    if (guestMap.has(gKey)) {
                        guestMap.get(gKey).spent += splitAmount;
                    }
                });
                if (guestsCount > 0) guestSummary.spent += splitAmount * guestsCount;
            }
        } else {
            const consumer = participantMap.get(expense.payerId);
            if (consumer) {
                consumer.spent += amount;
            } else if (expense.payerId && (String(expense.payerId).startsWith("guest_"))) {
                guestSummary.spent += amount;
                if (guestMap.has(expense.payerId)) guestMap.get(expense.payerId).spent += amount;
            } else if (participantData.length > 0) {
                participantData[0].spent += amount;
            }
        }
    });

    let totalBudget = 0;
    let globalTotalRemainingBudget = 0;
    let globalSharedSavingsGoal = 0;

    participantData.forEach((p) => {
        totalBudget += p.budget;
        p.balance = p.contributionPaid - p.spent;
        p.remainingBudget = p.availableForSpending - p.spent;
        globalTotalRemainingBudget += p.remainingBudget;
        globalSharedSavingsGoal += p.sharedSavingsGoal;
    });

    return {
        walletName: appState.name || 'Mi Monedero',
        totalBudget,
        totalSpent,
        globalTotalRemainingBudget,
        globalSharedSavingsGoal,
        participantData,
        recentExpenses: expensesForMonth.slice(-3).reverse()
    };
}

// ==========================================
// 3. PARSER DE TEXTO
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

// ================================================================
// 4. IA GEMINI 3.6 FLASH VISION (REGLAS FISCALES SUNAT Y ASIGNACIÓN)
// ================================================================
function arrayBufferToBase64(buffer) {
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

async function downloadTelegramPhotoAsBase64(fileId, botToken) {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) throw new Error(`Error en Telegram getFile: ${await fileRes.text()}`);

    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) throw new Error("No se obtuvo ruta de archivo válida.");

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) throw new Error(`Error descargando imagen: ${downloadRes.status}`);

    const arrayBuffer = await downloadRes.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    let mimeType = 'image/jpeg';
    if (filePath.endsWith('.png')) mimeType = 'image/png';
    else if (filePath.endsWith('.webp')) mimeType = 'image/webp';
    else if (filePath.endsWith('.pdf')) mimeType = 'application/pdf';

    return { base64Data, mimeType };
}

async function analyzeReceiptWithGemini(base64Image, mimeType, apiKey, availableCategories = [], availableParticipants = [], userInstructions = '') {
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

    throw lastError || new Error("No se pudo procesar la imagen con Gemini.");
}

// ==========================================
// 5. CORE DEL BOT TELEGRAM
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

        await sendTelegramMessage(botToken, chatId, `🔍 <b>Analizando comprobante fiscal e impuestos con IA...</b> ⏳`);

        try {
            let fileId;
            if (isPhoto) {
                const targetIdx = message.photo.length > 2 ? message.photo.length - 2 : message.photo.length - 1;
                fileId = message.photo[targetIdx].file_id;
            } else {
                fileId = message.document.file_id;
            }

            const userCaption = (message.caption || '').trim();
            const { base64Data, mimeType } = await downloadTelegramPhotoAsBase64(fileId, botToken);
            const wallet = await getWalletDoc(walletId);
            if (!wallet) return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado.`);

            const participants = wallet.participants || [];
            const receiptData = await analyzeReceiptWithGemini(
                base64Data,
                mimeType,
                geminiApiKey,
                wallet.categories || [],
                participants,
                userCaption
            );
            const amount = parseFloat(receiptData.amount);

            if (isNaN(amount) || amount <= 0) {
                return await sendTelegramMessage(botToken, chatId, `⚠️ No pude detectar el importe total en este comprobante.`);
            }

            const categories = wallet.categories || [];
            let categoryName = receiptData.category || 'Varios';
            const matchedCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (matchedCategory) categoryName = matchedCategory.name;
            else if (categories.length > 0) categoryName = categories[0].name;

            const paymentMethods = wallet.paymentMethods || [];
            let paymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : null;
            let paymentMethodName = paymentMethods.length > 0 ? paymentMethods[0].name : 'Efectivo';

            // Detectar quién pagó
            let payerId = participants.length > 0 ? participants[0].id : 'default_payer';
            let payerName = participants.length > 0 ? participants[0].name : 'Tú';

            if (receiptData.payerName) {
                const matchedPayer = participants.find(p => p.name.toLowerCase().includes(receiptData.payerName.toLowerCase()) || receiptData.payerName.toLowerCase().includes(p.name.toLowerCase()));
                if (matchedPayer) {
                    payerId = matchedPayer.id;
                    payerName = matchedPayer.name;
                }
            }

            const description = receiptData.merchant 
                ? `${receiptData.merchant}${receiptData.description ? ' - ' + receiptData.description : ''}`
                : (receiptData.description || 'Gasto Comprobante');

            // Procesar invitados
            const rawGuests = Array.isArray(receiptData.guests) ? receiptData.guests : [];
            const guestsList = rawGuests.filter(g => g && typeof g === 'string' && g.trim().length > 0);

            // Mapear cada ítem a su participante o invitado correspondiente
            const rawItems = Array.isArray(receiptData.items) ? receiptData.items : [];
            const formattedItems = rawItems.map(item => {
                const qty = parseFloat(item.quantity) || 1;
                const unitPrice = parseFloat(item.amount) || 0;
                const assignedName = (item.assignedToName || 'all').trim();
                
                let assignedTo = 'all';
                let assignments = {};

                if (assignedName && assignedName.toLowerCase() !== 'all') {
                    const matchedP = participants.find(p => p.name.toLowerCase().includes(assignedName.toLowerCase()) || assignedName.toLowerCase().includes(p.name.toLowerCase()));
                    if (matchedP) {
                        assignedTo = matchedP.id;
                        assignments[matchedP.id] = qty;
                    } else {
                        const gKey = `guest_${assignedName.toLowerCase().replace(/\s+/g, '_')}`;
                        assignedTo = gKey;
                        assignments[gKey] = qty;
                        if (!guestsList.some(g => g.toLowerCase() === assignedName.toLowerCase())) {
                            guestsList.push(assignedName);
                        }
                    }
                }

                return {
                    id: 'item_' + Math.random().toString(36).substring(2, 9),
                    desc: item.desc || item.name || 'Producto',
                    quantity: qty,
                    amount: unitPrice,
                    assignedTo,
                    assignments,
                    assignedDisplayName: assignedName !== 'all' ? assignedName : 'Compartido'
                };
            });

            // Determinar si es personal o compartido
            let expenseType = 'shared';
            const normCaption = normalizeStr(userCaption);
            const isPersonalCaption = normCaption.includes('personal') || normCaption.includes('mio') || normCaption.includes('propio') || normCaption.includes('solo yo');

            if (receiptData.isShared === false || isPersonalCaption) {
                expenseType = 'personal';
            }

            const expenseToSave = {
                amount: Math.round(amount * 100) / 100,
                description,
                category: categoryName,
                paymentMethodId,
                paymentMethodName,
                payerId,
                payerName,
                type: expenseType,
                date: receiptData.date || new Date().toISOString().split('T')[0],
                isFixed: false,
                fixedRecurrenceMonths: 0,
                items: formattedItems,
                guests: guestsList
            };

            await addExpenseToWallet(walletId, expenseToSave);

            let itemsSummaryHtml = '';
            if (formattedItems.length > 0) {
                itemsSummaryHtml = `\n🛒 <b>Desglose de Productos (${formattedItems.length}):</b>\n`;
                formattedItems.forEach(it => {
                    const subtotal = it.quantity * it.amount;
                    const asgnBadge = it.assignedDisplayName !== 'Compartido' ? ` 👤 <i>[${it.assignedDisplayName}]</i>` : '';
                    itemsSummaryHtml += `• ${it.quantity}x <b>${it.desc}</b>: S/ ${subtotal.toFixed(2)}${asgnBadge}\n`;
                });
            }

            let typeBadge = expenseType === 'personal' ? '🔒 <b>Tipo:</b> Personal (100% tuyo)' : '👥 <b>Tipo:</b> Compartido grupal';

            const msg = `🧾 <b>¡Comprobante Registrado con Éxito!</b> ✨\n\n` +
                        `🏢 <b>Establecimiento:</b> ${receiptData.merchant || 'Comercio'}\n` +
                        `💵 <b>Importe Total (con IGV):</b> S/ ${expenseToSave.amount.toFixed(2)}\n` +
                        `📝 <b>Detalle:</b> ${expenseToSave.description}\n` +
                        `🏷️ <b>Categoría:</b> ${expenseToSave.category}\n` +
                        `💳 <b>Método:</b> ${expenseToSave.paymentMethodName}\n` +
                        `👤 <b>Pagado por:</b> ${expenseToSave.payerName}\n` +
                        `${typeBadge}\n` +
                        `📅 <b>Fecha:</b> ${expenseToSave.date}\n` +
                        itemsSummaryHtml +
                        `\n⚡ <i>Guardado en tiempo real en Qipu.</i>`;

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
            `📸 <b>Envía fotos de tus comprobantes:</b>\n` +
            `Puedes escribir en el pie de foto:\n` +
            `👉 <i>"Gasto personal de Kevind"</i> (para gasto 100% individual)\n` +
            `👉 <i>"El ceviche es de Maria y lo demás compartido"</i>\n\n` +
            `✍️ <b>O registra gastos por texto:</b>\n` +
            `👉 <code>25 Almuerzo</code>\n` +
            `👉 <code>18 Taxi transporte efectivo</code>\n` +
            `👉 <code>/saldo</code> (para ver presupuestos)`
        );
    }

    if (rawText.startsWith('/saldo') || rawText.startsWith('/balance')) {
        try {
            const wallet = await getWalletDoc(walletId);
            if (!wallet) {
                return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado en la base de datos (ID: ${walletId}).`);
            }

            const summary = calculateOfficialSummary(wallet);

            const spentPct = summary.totalBudget > 0 ? ((summary.totalSpent / summary.totalBudget) * 100).toFixed(0) : 0;
            const remainingPct = Math.max(0, 100 - parseInt(spentPct));

            let msg = `📊 <b>Estado de ${summary.walletName}</b>\n\n` +
                      `🟢 <b>DISPONIBLE GLOBAL:</b> S/ ${summary.globalTotalRemainingBudget.toFixed(2)} (${remainingPct}% restante)\n` +
                      `💰 <b>Presupuesto Base:</b> S/ ${summary.totalBudget.toFixed(2)}\n` +
                      `📉 <b>Gastado Total Mes:</b> S/ ${summary.totalSpent.toFixed(2)} (${spentPct}% gastado)\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `👥 <b>SALDOS INDIVIDUALES:</b>\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n`;

            if (summary.participantData && summary.participantData.length > 0) {
                summary.participantData.forEach(p => {
                    const dispBadge = p.remainingBudget >= 0 ? '🟢' : '🔴';
                    msg += `\n👤 <b>${p.name}</b>\n` +
                           `• Presupuesto Base: S/ ${p.budget.toFixed(2)}\n` +
                           `• Gastado mensual: S/ ${p.spent.toFixed(2)}\n` +
                           `• ${dispBadge} <b>Disponible:</b> S/ ${p.remainingBudget.toFixed(2)}\n`;

                    if (summary.participantData.length > 1) {
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
                       `🧾 <b>Últimos gastos del ciclo:</b>\n`;
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
// 6. HANDLER DEL CLOUDFLARE WORKER
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

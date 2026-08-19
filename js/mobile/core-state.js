import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración Firebase idéntica a app.html
export const firebaseConfig = {
  apiKey: "AIzaSyA63OZWFM30Tu17DGxAmbtVsNFWeQU3k4s",
  authDomain: "qipu-d1dcd.firebaseapp.com",
  projectId: "qipu-d1dcd",
  storageBucket: "qipu-d1dcd.firebasestorage.app",
  messagingSenderId: "398775085739",
  appId: "1:398775085739:web:be8643b5d9fea9ef8da5ee"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "qipu-d1dcd";

export let currentUserId = null;
export let currentWalletId = null;
export let appState = {
  participants: [],
  categories: [],
  paymentMethods: [],
  expenses: []
};

export let filterDate = new Date();
export let currentTab = 'all'; // 'all', 'expenses', 'incomes'
export let searchTerm = '';

export const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function setCurrentUserId(val) { currentUserId = val; }
export function setCurrentWalletId(val) { currentWalletId = val; }
export function setFilterDate(val) { filterDate = val; }
export function setCurrentTab(val) { currentTab = val; }
export function setSearchTerm(val) { searchTerm = val; }

// Formateador de moneda
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getFilterMonthString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

// ================================================================
// CÁLCULO DE CICLOS Y FACTURACIÓN (IDÉNTICO A APP.HTML)
// ================================================================
export function getCycleDates(method, referenceDate) {
  if (!method || method.type !== "credit") {
    return { startDate: null, closingDate: null, paymentDate: null };
  }

  const closingDay = parseInt(method.closingDay) || 20;
  const paymentDay = parseInt(method.paymentDay) || 5;

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  let activeClosingDate = new Date(Date.UTC(refYear, refMonth, closingDay));
  const todayCheck = new Date(referenceDate);
  todayCheck.setUTCHours(0, 0, 0, 0);

  if (todayCheck.getTime() > activeClosingDate.getTime()) {
    activeClosingDate.setUTCMonth(activeClosingDate.getUTCMonth() + 1);
  }

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

export function isExpenseInBillingMonth(e, filterMonthString, filterDate, paymentMethods) {
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
  return e.date.startsWith(filterMonthString);
}

// ================================================================
// MOTOR DE CÁLCULO FINANCIERO UNIVERSAL (IDÉNTICO A APP.HTML)
// ================================================================
export function calculateSummary(state, filteredExpenses) {
  const participants = state.participants || [];
  const paymentMethodsMap = new Map((state.paymentMethods || []).map((m) => [m.id, m]));

  const participantData = participants.map((p) => {
    const budget = parseFloat(p.budget) || 0;
    const sharedPct = parseFloat(p.sharedSavingsPercent) || 0;
    const indepPct = parseFloat(p.independentSavingsPercent) || 0;

    return {
      ...p,
      budget: budget,
      spent: 0,
      contributionPaid: 0,
      contributionByMethod: {},
      sharedSavingsGoal: (budget * sharedPct) / 100,
      independentSavingsGoal: (budget * indepPct) / 100,
      availableForSpending: budget * (1 - (sharedPct + indepPct) / 100),
    };
  });

  const participantMap = new Map(participantData.map((p) => [p.id, p]));
  let totalSpent = 0;
  const guestMap = new Map();
  const guestSummary = { spent: 0, balance: 0, contributionPaid: 0 };

  filteredExpenses.forEach((expense) => {
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
    if (method && method.type === "credit" && method.ownerId && !(realPayerId && (realPayerId.startsWith("guest_") || realPayerId.startsWith("guest-")))) {
      realPayerId = method.ownerId;
    }

    const realPayer = participantMap.get(realPayerId);
    if (realPayer) {
      realPayer.contributionPaid += amount;
      const methodId = expense.paymentMethodId || "unknown";
      realPayer.contributionByMethod[methodId] = (realPayer.contributionByMethod[methodId] || 0) + amount;
    } else if (realPayerId && (realPayerId.startsWith("guest_") || realPayerId.startsWith("guest-") || !participantMap.has(realPayerId))) {
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
      } else if (expense.payerId && (expense.payerId.startsWith("guest_") || expense.payerId.startsWith("guest-"))) {
        guestSummary.spent += amount;
        if (guestMap.has(expense.payerId)) guestMap.get(expense.payerId).spent += amount;
      }
    }
  });

  let globalTotalRemainingBudget = 0;
  let globalSharedSavingsGoal = 0;

  participantData.forEach((p) => {
    p.balance = p.contributionPaid - p.spent;
    p.remainingBudget = p.availableForSpending - p.spent;
    globalTotalRemainingBudget += p.remainingBudget;
    globalSharedSavingsGoal += p.sharedSavingsGoal;
  });

  const guestList = Array.from(guestMap.values()).map(g => {
    g.balance = (g.contributionPaid || 0) - (g.spent || 0);
    return g;
  });

  return {
    globalTotalRemainingBudget,
    globalSharedSavingsGoal,
    totalSpent,
    participantData,
    guestList,
    guestSummary
  };
}

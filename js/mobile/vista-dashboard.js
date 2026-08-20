import { appState, currentUserId, currentWalletId, filterDate, formatCurrency, getFilterMonthString, isExpenseInBillingMonth, calculateSummary, MONTHS, db, appId } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { renderHistoryList } from "./vista-historial.js";
import { populateSelectOptions } from "./modal-pickers.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export let currentSettlementDebts = [];

export function renderMobileUI() {
  const currentMonthEl = document.getElementById('mobile-current-month');
  if (currentMonthEl) {
    currentMonthEl.textContent = `${MONTHS[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
  }

  const filterMonthString = getFilterMonthString(filterDate);
  const allExpenses = appState.expenses || [];
  const projectedFixedExpenses = [];
  const filterViewDate = new Date(filterDate.getTime());

  // Proyección de gastos fijos
  const baseFixedExpenses = allExpenses.filter((e) => e.isFixed);
  baseFixedExpenses.forEach((baseExpense) => {
    const baseDate = new Date(baseExpense.date + "T00:00:00Z");
    const recurrenceMonths = baseExpense.fixedRecurrenceMonths || 12;
    const baseYear = baseDate.getUTCFullYear();
    const baseMonth = baseDate.getUTCMonth();
    const viewYear = filterViewDate.getUTCFullYear();
    const viewMonth = filterViewDate.getUTCMonth();
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

  let expensesForMonth = allExpenses.filter((e) => isExpenseInBillingMonth(e, filterMonthString, filterDate, appState.paymentMethods));
  expensesForMonth = [...expensesForMonth, ...projectedFixedExpenses];

  // Ejecutar motor de cálculo maestro
  const summary = calculateSummary(appState, expensesForMonth);

  // Totales
  let totalBudget = 0;
  let totalAccumulatedSavings = 0;
  appState.participants.forEach(p => {
    totalBudget += (parseFloat(p.budget) || 0);
    (p.goals || []).forEach(g => {
      totalAccumulatedSavings += (parseFloat(g.current) || 0);
    });
  });

  let totalFixed = 0;
  expensesForMonth.forEach(e => {
    if (e.isFixed) totalFixed += (parseFloat(e.amount) || 0);
  });

  const spentPercent = totalBudget > 0 ? Math.min(100, (summary.totalSpent / totalBudget) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - spentPercent);

  // Días restantes
  const lastDayOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const currentDay = (today.getFullYear() === filterDate.getFullYear() && today.getMonth() === filterDate.getMonth()) ? today.getDate() : 1;
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay + 1);
  const globalDailyBudget = Math.max(0, summary.globalTotalRemainingBudget / daysRemaining);

  // Actualizar Bloque 1: Presupuesto Global
  const elGlobalRemaining = document.getElementById('display-global-remaining');
  const elGlobalBudget = document.getElementById('display-global-budget');
  const elGlobalSpentPct = document.getElementById('display-global-spent-percent');
  const elGlobalPctBadge = document.getElementById('global-percent-badge');
  const elGlobalProgressBar = document.getElementById('global-progress-bar');
  const elTotalSpent = document.getElementById('display-total-spent');
  const elTotalFixed = document.getElementById('display-total-fixed');
  const elGlobalSavings = document.getElementById('display-global-savings');
  const elSharedSavings = document.getElementById('display-shared-savings');
  const elDailyBudget = document.getElementById('display-daily-budget');
  const elDaysRemaining = document.getElementById('display-days-remaining');

  if (elGlobalRemaining) elGlobalRemaining.textContent = formatCurrency(summary.globalTotalRemainingBudget);
  if (elGlobalBudget) elGlobalBudget.textContent = formatCurrency(totalBudget);
  if (elGlobalSpentPct) elGlobalSpentPct.textContent = `${spentPercent.toFixed(0)}%`;
  if (elGlobalPctBadge) elGlobalPctBadge.textContent = `${remainingPercent.toFixed(0)}% restante`;
  if (elGlobalProgressBar) elGlobalProgressBar.style.width = `${remainingPercent}%`;

  if (elTotalSpent) elTotalSpent.textContent = formatCurrency(summary.totalSpent);
  if (elTotalFixed) elTotalFixed.textContent = `Fijos: ${formatCurrency(totalFixed)}`;
  if (elGlobalSavings) elGlobalSavings.textContent = formatCurrency(totalAccumulatedSavings);
  if (elSharedSavings) elSharedSavings.textContent = `Mutuo: ${formatCurrency(summary.globalSharedSavingsGoal)}`;
  if (elDailyBudget) elDailyBudget.textContent = formatCurrency(globalDailyBudget);
  if (elDaysRemaining) elDaysRemaining.textContent = `${daysRemaining} días rest.`;

  // Actualizar Bloque 2: Lista en Modal de Saldos de Usuarios
  renderParticipantsModalList(summary, daysRemaining);

  // Actualizar Bloque 2B: Modal de Liquidación y Deudas
  renderSettlementModal(summary);

  // Actualizar Bloque 3: Historial de Transacciones
  renderHistoryList(expensesForMonth);

  // Actualizar opciones de los selectores de modales
  populateSelectOptions();
}

export function renderParticipantsModalList(summary, daysRemaining) {
  const container = document.getElementById('mobile-participants-modal-list');
  if (!container) return;

  if (!summary.participantData || summary.participantData.length === 0) {
    container.innerHTML = `<div class="w-full text-center py-6 text-xs text-slate-400 italic">No hay participantes configurados en este monedero.</div>`;
    return;
  }

  container.innerHTML = summary.participantData.map(p => {
    const pRemaining = p.remainingBudget || 0;
    const pBudget = parseFloat(p.budget) || 0;
    const pSpent = p.spent || 0;
    const pDaily = Math.max(0, pRemaining / daysRemaining);
    const isMe = p.firebaseUid === currentUserId;
    const isPositive = pRemaining >= 0;
    const pPercent = pBudget > 0 ? Math.min(100, Math.max(0, (pRemaining / pBudget) * 100)) : 0;
    const pBalance = p.balance || 0;

    let balanceBadge = '';
    if (pBalance > 0.01) {
      balanceBadge = `<span class="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">A favor: +${formatCurrency(pBalance)}</span>`;
    } else if (pBalance < -0.01) {
      balanceBadge = `<span class="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">Debe: ${formatCurrency(pBalance)}</span>`;
    } else {
      balanceBadge = `<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">Al día</span>`;
    }

    return `
      <div class="bg-white border ${isMe ? 'border-indigo-400 ring-1 ring-indigo-500/20' : 'border-slate-200'} rounded-2xl p-3 space-y-2 shadow-2xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              ${(p.name || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h4 class="font-extrabold text-xs text-slate-900">${p.name}</h4>
                ${isMe ? '<span class="text-[8px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">TÚ</span>' : ''}
              </div>
              <div class="mt-0.5">${balanceBadge}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-sm font-black ${isPositive ? 'text-slate-900' : 'text-rose-600'}">${formatCurrency(pRemaining)}</span>
            <span class="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Disponible</span>
          </div>
        </div>

        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div class="h-full ${isPositive ? 'bg-indigo-500' : 'bg-rose-500'} rounded-full transition-all duration-500" style="width: ${pPercent}%"></div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span>Base: <strong class="text-slate-800 font-bold">${formatCurrency(pBudget)}</strong></span>
          <span>•</span>
          <span>Gastado: <strong class="text-slate-800 font-bold">${formatCurrency(pSpent)}</strong></span>
          <span>•</span>
          <span>Máx/día: <strong class="text-indigo-600 font-bold">${formatCurrency(pDaily)}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

export function renderSettlementModal(summary) {
  const containerTransfers = document.getElementById('settlement-transfers-list');
  const containerBalances = document.getElementById('settlement-balances-list');
  const countBadge = document.getElementById('settlement-count-badge');
  if (!containerTransfers || !containerBalances) return;

  const participantData = summary.participantData || [];
  const guestList = summary.guestList || [];

  const balances = [
    ...participantData.map(p => ({
      id: p.id,
      name: p.name,
      balance: p.balance || 0,
      contributionPaid: p.contributionPaid || 0,
      spent: p.spent || 0,
      isGuest: false
    })),
    ...guestList.filter(g => (g.spent > 0.001 || g.contributionPaid > 0.001)).map(g => ({
      id: g.id,
      name: g.name,
      balance: g.balance || 0,
      contributionPaid: g.contributionPaid || 0,
      spent: g.spent || 0,
      isGuest: true
    }))
  ];

  containerBalances.innerHTML = balances.map(p => {
    const isPositive = p.balance > 0.01;
    const isNegative = p.balance < -0.01;
    const statusClass = isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : (isNegative ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-50 border-slate-200');
    const statusText = isPositive ? `A favor: +${formatCurrency(p.balance)}` : (isNegative ? `Debe pagar: ${formatCurrency(Math.abs(p.balance))}` : 'Cuentas al día');
    const guestBadge = p.isGuest ? `<span class="text-[8px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1">INVITADO</span>` : '';

    return `
      <div class="bg-white border ${p.isGuest ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} rounded-2xl p-3 flex items-center justify-between text-xs shadow-2xs">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl ${p.isGuest ? 'bg-amber-500' : 'bg-slate-900'} text-white flex items-center justify-center font-black text-xs shadow-xs">
            ${(p.name || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div class="flex items-center">
              <h4 class="font-extrabold text-xs text-slate-900">${p.name}</h4>
              ${guestBadge}
            </div>
            <p class="text-[10px] text-slate-400 font-medium">Aportó: ${formatCurrency(p.contributionPaid)} • Consumo: ${formatCurrency(p.spent)}</p>
          </div>
        </div>
        <span class="text-[10px] font-black px-2 py-0.5 rounded-lg border ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join('');

  const debtors = balances.filter(p => p.balance < -0.01).map(p => ({ ...p, remainingBalance: Math.abs(p.balance) })).sort((a, b) => b.remainingBalance - a.remainingBalance);
  const creditors = balances.filter(p => p.balance > 0.01).map(p => ({ ...p, remainingBalance: p.balance })).sort((a, b) => b.remainingBalance - a.remainingBalance);

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remainingBalance, creditor.remainingBalance);

    if (amount > 0.01) {
      transfers.push({
        debtorId: debtor.id,
        from: debtor.name,
        creditorId: creditor.id,
        to: creditor.name,
        amount: amount
      });
      debtor.remainingBalance -= amount;
      creditor.remainingBalance -= amount;
    }

    if (debtor.remainingBalance < 0.01) i++;
    if (creditor.remainingBalance < 0.01) j++;
  }

  currentSettlementDebts = transfers;
  if (countBadge) countBadge.textContent = `${transfers.length} transferencia${transfers.length === 1 ? '' : 's'}`;

  if (transfers.length === 0) {
    containerTransfers.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1 text-emerald-800">
        <i class="fas fa-check-circle text-2xl text-emerald-500"></i>
        <p class="text-xs font-black">¡Las cuentas están al día!</p>
        <p class="text-[10px] text-emerald-600">No existen deudas pendientes entre los miembros para este mes.</p>
      </div>
    `;
    document.getElementById('btn-execute-settlement')?.classList.add('hidden');
  } else {
    document.getElementById('btn-execute-settlement')?.classList.remove('hidden');
    containerTransfers.innerHTML = transfers.map(t => `
      <div class="bg-rose-50/50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
            <i class="fas fa-arrow-right"></i>
          </div>
          <div>
            <p class="text-xs font-extrabold text-slate-900"><strong class="text-rose-700 font-black">${t.from}</strong> ➔ <strong class="text-emerald-700 font-black">${t.to}</strong></p>
            <p class="text-[10px] text-slate-400 font-medium">Transferencia directa sugerida</p>
          </div>
        </div>
        <span class="text-sm font-black text-rose-600 bg-white px-2.5 py-1 rounded-xl border border-rose-100 shadow-2xs">
          ${formatCurrency(t.amount)}
        </span>
      </div>
    `).join('');
  }
}

export async function liquidateMonthMobile() {
  if (!currentWalletId) return alert('No hay un monedero cargado.');
  if (currentSettlementDebts.length === 0) return alert('Las cuentas ya están al día.');

  if (!confirm(`Se crearán ${currentSettlementDebts.length} transacciones de ajuste para dejar las cuentas saldadas. ¿Deseas continuar?`)) {
    return;
  }

  try {
    const now = new Date().toISOString().split('T')[0];
    const newExpenses = [...(appState.expenses || [])];

    currentSettlementDebts.forEach(t => {
      newExpenses.push({
        id: 'settle_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'personal',
        description: `REEMBOLSO: ${t.from} a ${t.to}`,
        amount: t.amount,
        payerId: t.debtorId,
        category: 'Liquidación',
        paymentMethodId: 'm1',
        date: now,
        dateCreated: new Date().toISOString()
      });
    });

    const walletRef = doc(db, 'artifacts', appId, 'public/data/wallets', currentWalletId);
    await updateDoc(walletRef, { expenses: newExpenses });

    closeModal('modal-settlement');
    alert('🎉 ¡Liquidación completada con éxito! Cuentas saldadas.');
  } catch (err) {
    console.error('Error al liquidar cuentas:', err);
    alert('Error al liquidar cuentas: ' + err.message);
  }
}

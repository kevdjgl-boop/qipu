// ================================================================
// MÓDULO DE RESUMEN DE MÉTODOS DE PAGO Y TARJETAS (CUADRÍCULA 2 COLUMNAS)
// CON SOPORTE COMPLETO DE GASTOS FIJOS, PROYECCIONES Y ESTADOS DE CUENTA ANTERIORES
// ================================================================

import { appState, filterDate, formatCurrency, getFilterMonthString, getCycleDates, getCardStatementCycles, MONTHS } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";

// Estilos limpios y minimalistas por tipo de método para cuadrícula de 2 columnas
const METHOD_STYLES = {
  credit: {
    badge: "Crédito",
    icon: "fa-credit-card",
    iconBg: "bg-indigo-50 text-indigo-600",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-100",
    amountColor: "text-slate-900",
  },
  debit: {
    badge: "Débito",
    icon: "fa-credit-card",
    iconBg: "bg-cyan-50 text-cyan-600",
    badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-100",
    amountColor: "text-slate-900",
  },
  cash: {
    badge: "Efectivo",
    icon: "fa-money-bill-wave",
    iconBg: "bg-emerald-50 text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amountColor: "text-slate-900",
  },
  transfer: {
    badge: "Transfer",
    icon: "fa-arrow-right-arrow-left",
    iconBg: "bg-purple-50 text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-100",
    amountColor: "text-slate-900",
  },
  other: {
    badge: "Cuenta",
    icon: "fa-wallet",
    iconBg: "bg-slate-100 text-slate-700",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    amountColor: "text-slate-900",
  }
};

// Variables de estado del módulo
let currentActiveMethodId = null;
let currentActiveCycle = null;

// ================================================================
// HELPER MAESTRO: Cálculo de gastos reales + fijos proyectados en el rango
// ================================================================
export function getExpensesForMethodRange(allExpenses, methodId, range) {
  if (!range || !range.startDate || !range.closingDate) {
    return { total: 0, expenses: [] };
  }

  const startObj = new Date(range.startDate + "T00:00:00Z");
  const endObj = new Date(range.closingDate + "T00:00:00Z");
  const startMs = startObj.getTime();
  const endMs = endObj.getTime();

  // 1. Filtrar gastos REALES
  let filtered = allExpenses.filter((exp) => {
    if (exp.isFixed) return false;
    if (exp.paymentMethodId !== methodId || !exp.date) return false;
    const expDate = new Date(exp.date + "T00:00:00Z").getTime();
    return expDate >= startMs && expDate <= endMs;
  });

  // 2. PROYECTAR GASTOS FIJOS
  const fixedDefinitions = allExpenses.filter((e) => e.isFixed && e.paymentMethodId === methodId);

  fixedDefinitions.forEach((base) => {
    const baseDate = new Date(base.date + "T00:00:00Z");
    const baseTime = baseDate.getTime();
    const dayOfExpense = baseDate.getUTCDate();
    const recurrenceMonths = base.fixedRecurrenceMonths || 12;

    let iterYear = startObj.getUTCFullYear();
    let iterMonth = startObj.getUTCMonth();
    const endYear = endObj.getUTCFullYear();
    const endMonth = endObj.getUTCMonth();

    while (iterYear * 12 + iterMonth <= endYear * 12 + endMonth) {
      let projectedDate = new Date(Date.UTC(iterYear, iterMonth, dayOfExpense));
      if (projectedDate.getUTCMonth() !== iterMonth) {
        projectedDate = new Date(Date.UTC(iterYear, iterMonth + 1, 0));
      }
      const projStr = projectedDate.toISOString().split("T")[0];
      const projTime = projectedDate.getTime();

      if (base.cancelledAt) {
        const cancelledMs = new Date(base.cancelledAt + "T00:00:00Z").getTime();
        if (projTime >= cancelledMs) {
          break;
        }
      }

      const isInsideCycle = projTime >= startMs && projTime <= endMs;
      const isAfterCreation = projTime >= baseTime;
      const monthsDiff = (iterYear - baseDate.getUTCFullYear()) * 12 + (iterMonth - baseDate.getUTCMonth());
      const isWithinRecurrence = monthsDiff >= 0 && monthsDiff < recurrenceMonths;

      if (isInsideCycle && isAfterCreation && isWithinRecurrence) {
        const manualEntryExists = allExpenses.some(
          (e) => !e.isFixed && e.date === projStr && e.description.toLowerCase().trim() === base.description.toLowerCase().trim()
        );

        if (!manualEntryExists) {
          filtered.push({
            ...base,
            id: `proj_${base.id}_${projStr}`,
            date: projStr,
            isProjected: true,
            payerId: base.payerId,
          });
        }
      }
      iterMonth++;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear++;
      }
    }
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = filtered.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return { total, expenses: filtered };
}

// ================================================================
// HELPER MAESTRO: Desglose de Deuda por Miembro e Invitados
// (Paridad Matemática Total con Desktop)
// ================================================================
export function calculateMethodDebtBreakdown(expenses, method, participants) {
  const debtPerPerson = {};
  participants.forEach(p => { debtPerPerson[p.id] = 0; });
  let guestDebt = 0;

  expenses.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    const expenseGuests = (e.guests && Array.isArray(e.guests) && e.guests.length > 0)
      ? e.guests
      : (e.guestName ? [e.guestName] : []);
    const totalPeople = participants.length + expenseGuests.length;

    if (e.type === "personal") {
      const payerId = e.payerId || e.paidBy || (method ? method.ownerId : null) || (participants[0]?.id);
      if (debtPerPerson[payerId] !== undefined) {
        debtPerPerson[payerId] += amount;
      } else if (payerId && (payerId.startsWith("guest_") || payerId.startsWith("guest-") || payerId.startsWith("guest"))) {
        guestDebt += amount;
      } else if (method && method.ownerId && debtPerPerson[method.ownerId] !== undefined) {
        debtPerPerson[method.ownerId] += amount;
      }
    } else {
      // Gasto Compartido
      if (e.items && e.items.length > 0 && totalPeople > 0) {
        let itemsTotalCost = 0;
        let itemShares = {};
        participants.forEach(p => { itemShares[p.id] = 0; });
        let guestItemShares = 0;

        e.items.forEach(item => {
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
              if (itemShares[pId] !== undefined) {
                itemShares[pId] += cost;
              } else if (pId.startsWith("guest_") || pId.startsWith("guest-") || pId.startsWith("guest")) {
                guestItemShares += cost;
              }
            }
          });

          if (assignedUnitsSum === 0 && item.assignedTo) {
            assignedUnitsSum = qty;
            const cost = itemTotal;
            if (itemShares[item.assignedTo] !== undefined) {
              itemShares[item.assignedTo] += cost;
            } else if (item.assignedTo.startsWith("guest_") || item.assignedTo.startsWith("guest-") || item.assignedTo.startsWith("guest")) {
              guestItemShares += cost;
            }
          }

          const unassignedUnits = Math.max(0, qty - assignedUnitsSum);
          if (unassignedUnits > 0) {
            const unassignedCost = unassignedUnits * unitPrice;
            const sharePerPerson = unassignedCost / totalPeople;
            participants.forEach(p => {
              itemShares[p.id] += sharePerPerson;
            });
            guestItemShares += sharePerPerson * expenseGuests.length;
          }
        });

        const remainingAmount = Math.max(0, amount - itemsTotalCost);
        const remainingSharePerPerson = totalPeople > 0 ? remainingAmount / totalPeople : 0;

        participants.forEach(p => {
          if (debtPerPerson[p.id] !== undefined) {
            debtPerPerson[p.id] += (itemShares[p.id] || 0) + remainingSharePerPerson;
          }
        });
        guestDebt += guestItemShares + (remainingSharePerPerson * expenseGuests.length);
      } else {
        const splitAmount = totalPeople > 0 ? amount / totalPeople : 0;
        participants.forEach(p => {
          if (debtPerPerson[p.id] !== undefined) {
            debtPerPerson[p.id] += splitAmount;
          }
        });
        if (expenseGuests.length > 0) {
          guestDebt += splitAmount * expenseGuests.length;
        }
      }
    }
  });

  return { debtPerPerson, guestDebt };
}

// ================================================================
// RECOPILAR DATOS CONSOLIDADOS DE TODOS LOS MÉTODOS DE PAGO
// ================================================================
export function getAllPaymentMethodsData() {
  const paymentMethods = appState.paymentMethods || [];
  const allExpenses = appState.expenses || [];
  const participants = appState.participants || [];
  const today = new Date();

  let totalCombinedSpent = 0;
  let totalCreditDebt = 0;

  const methodsData = paymentMethods.map((method) => {
    const isCredit = method.type === "credit";
    let range = {};
    let dateRangeLabel = "";
    let paymentDateLabel = "";
    let cycle = null;

    if (isCredit) {
      cycle = getCycleDates(method, today);
      if (cycle.closingDate) {
        range = cycle;
        const s = new Date(range.startDate + "T00:00:00Z");
        const c = new Date(range.closingDate + "T00:00:00Z");
        const sStr = `${s.getUTCDate()} ${s.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
        const cStr = `${c.getUTCDate()} ${c.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
        dateRangeLabel = `${sStr} - ${cStr}`;
      } else {
        range = { startDate: null, closingDate: null };
        dateRangeLabel = "Ciclo no conf.";
      }

      if (cycle.paymentDate) {
        const p = new Date(cycle.paymentDate + "T00:00:00Z");
        paymentDateLabel = `Paga: ${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      }
    } else {
      const y = filterDate.getFullYear();
      const m = filterDate.getMonth();
      range = {
        startDate: new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0],
        closingDate: new Date(Date.UTC(y, m + 1, 0)).toISOString().split("T")[0],
      };
      dateRangeLabel = `${MONTHS[m]}`;
      paymentDateLabel = "Mes en curso";
    }

    // Cálculo maestro con gastos fijos proyectados
    const calculation = getExpensesForMethodRange(allExpenses, method.id, range);
    const methodExpenses = calculation.expenses;
    const totalSpent = calculation.total;

    totalCombinedSpent += totalSpent;
    if (isCredit) {
      totalCreditDebt += totalSpent;
    }

    // Titular
    let ownerName = "Compartido";
    if (method.ownerId) {
      const owner = participants.find(p => p.id === method.ownerId);
      if (owner) ownerName = owner.name;
    }

    const style = METHOD_STYLES[method.type] || METHOD_STYLES.other;

    return {
      method,
      isCredit,
      cycle,
      dateRangeLabel,
      paymentDateLabel,
      ownerName,
      totalSpent,
      methodExpenses,
      style
    };
  });

  return { methodsData, totalCombinedSpent, totalCreditDebt };
}

// ================================================================
// ABRIR MODAL RESUMEN GLOBAL DE MÉTODOS DE PAGO
// ================================================================
export function openPaymentMethodsSummaryModal() {
  const { methodsData, totalCombinedSpent, totalCreditDebt } = getAllPaymentMethodsData();

  const totalGlobalEl = document.getElementById('modal-pm-summary-total-global');
  const creditDebtEl = document.getElementById('modal-pm-summary-credit-debt');
  const countBadgeEl = document.getElementById('modal-pm-summary-count-badge');
  const listContainer = document.getElementById('modal-pm-summary-cards-list');

  if (totalGlobalEl) totalGlobalEl.textContent = formatCurrency(totalCombinedSpent);
  if (creditDebtEl) creditDebtEl.textContent = `Deuda tarjetas: ${formatCurrency(totalCreditDebt)}`;
  if (countBadgeEl) countBadgeEl.textContent = `${methodsData.length} métodos`;

  if (listContainer) {
    if (methodsData.length === 0) {
      listContainer.innerHTML = `
        <div class="col-span-2 text-center py-10 text-slate-400 italic space-y-2 bg-white rounded-2xl border border-slate-100">
          <i class="fas fa-credit-card text-3xl opacity-30"></i>
          <p class="text-xs">No hay métodos de pago configurados en este monedero.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = methodsData.map(item => `
        <div onclick="openCreditCardDetailModal('${item.method.id}')"
          class="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-md active:scale-95 transition-all flex flex-col justify-between cursor-pointer min-h-[136px] relative group select-none">
          
          <!-- Encabezado de la Tarjeta en Cuadrícula -->
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-xl ${item.style.iconBg} flex items-center justify-center text-xs shrink-0 shadow-2xs">
              <i class="fas ${item.style.icon}"></i>
            </div>
            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.style.badgeBg}">
              ${item.style.badge}
            </span>
          </div>

          <!-- Nombre y Consumo -->
          <div class="my-2">
            <span class="text-xs font-black text-slate-900 truncate block">${item.method.name}</span>
            <span class="text-base sm:text-lg font-black ${item.style.amountColor} tracking-tight block mt-0.5">
              ${formatCurrency(item.totalSpent)}
            </span>
          </div>

          <!-- Pie de Tarjeta: Titular y Cantidad de Movimientos -->
          <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px]">
            <span class="text-slate-400 font-bold truncate max-w-[65px]">${item.ownerName}</span>
            <span class="font-extrabold text-slate-600 group-hover:text-indigo-600 flex items-center gap-0.5 transition-colors">
              <span>${item.methodExpenses.length}</span>
              <i class="fas fa-chevron-right text-[7px]"></i>
            </span>
          </div>
        </div>
      `).join('');
    }
  }

  openModal('modal-payment-methods-summary');
}

// ================================================================
// ABRIR MODAL DETALLE DE TARJETA (ACTUAL O CICLO HISTÓRICO SELECCIONADO)
// ================================================================
export function openCreditCardDetailModal(methodId, targetCycle = null) {
  const paymentMethods = appState.paymentMethods || [];
  const allExpenses = appState.expenses || [];
  const participants = appState.participants || [];

  const method = paymentMethods.find(m => m.id === methodId);
  if (!method) return;

  currentActiveMethodId = methodId;
  currentActiveCycle = targetCycle;

  const isCredit = method.type === "credit";
  const today = new Date();
  let range = {};
  let dateRangeLabel = "";
  let paymentDateLabel = "";
  let isHistorical = false;

  if (targetCycle && targetCycle.startDate && targetCycle.closingDate) {
    range = targetCycle;
    isHistorical = !targetCycle.isCurrent;
    const s = new Date(range.startDate + "T00:00:00Z");
    const c = new Date(range.closingDate + "T00:00:00Z");
    const sStr = `${s.getUTCDate()} ${s.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
    const cStr = `${c.getUTCDate()} ${c.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
    dateRangeLabel = targetCycle.label || `${sStr} - ${cStr}`;

    if (range.paymentDate) {
      const p = new Date(range.paymentDate + "T00:00:00Z");
      paymentDateLabel = `Paga: ${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
    }
  } else if (isCredit) {
    const cycle = getCycleDates(method, today);
    if (cycle.closingDate) {
      range = cycle;
      const s = new Date(range.startDate + "T00:00:00Z");
      const c = new Date(range.closingDate + "T00:00:00Z");
      const sStr = `${s.getUTCDate()} ${s.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      const cStr = `${c.getUTCDate()} ${c.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      dateRangeLabel = `${sStr} - ${cStr}`;
    } else {
      range = { startDate: null, closingDate: null };
      dateRangeLabel = "Ciclo no configurado";
    }

    if (cycle.paymentDate) {
      const p = new Date(cycle.paymentDate + "T00:00:00Z");
      paymentDateLabel = `Paga: ${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
    }
  } else {
    const y = filterDate.getFullYear();
    const m = filterDate.getMonth();
    range = {
      startDate: new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0],
      closingDate: new Date(Date.UTC(y, m + 1, 0)).toISOString().split("T")[0],
    };
    dateRangeLabel = `${MONTHS[m]}`;
    paymentDateLabel = "Mes en curso";
  }

  // Cálculo de gastos y totales
  const calculation = getExpensesForMethodRange(allExpenses, method.id, range);
  const methodExpenses = calculation.expenses;
  const totalSpent = calculation.total;

  let ownerName = "Compartido";
  if (method.ownerId) {
    const owner = participants.find(p => p.id === method.ownerId);
    if (owner) ownerName = owner.name;
  }

  const style = METHOD_STYLES[method.type] || METHOD_STYLES.other;

  // Actualización del DOM
  const modalTitle = document.getElementById('modal-card-detail-title');
  const modalCycle = document.getElementById('modal-card-detail-cycle');
  const modalTotal = document.getElementById('modal-card-detail-total');
  const modalOwner = document.getElementById('modal-card-detail-owner');
  const listContainer = document.getElementById('modal-card-detail-expenses-list');
  const debtContainer = document.getElementById('modal-card-detail-debt-breakdown');
  const historyBanner = document.getElementById('modal-card-detail-history-banner');
  const bannerCycleLabel = document.getElementById('modal-card-detail-history-banner-label');

  if (modalTitle) modalTitle.textContent = method.name;
  if (modalCycle) modalCycle.textContent = `${dateRangeLabel} ${paymentDateLabel ? ' • ' + paymentDateLabel : ''}`;
  if (modalTotal) modalTotal.textContent = formatCurrency(totalSpent);
  if (modalOwner) modalOwner.textContent = `Titular: ${ownerName}`;

  if (historyBanner) {
    if (isHistorical) {
      historyBanner.classList.remove('hidden');
      if (bannerCycleLabel) bannerCycleLabel.textContent = dateRangeLabel;
    } else {
      historyBanner.classList.add('hidden');
    }
  }

  // Desglose de Deuda por Miembro e Invitados
  const { debtPerPerson, guestDebt } = calculateMethodDebtBreakdown(methodExpenses, method, participants);

  if (debtContainer) {
    debtContainer.innerHTML = participants.map(p => {
      const owed = debtPerPerson[p.id] || 0;
      const isOwner = p.id === method.ownerId;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
              ${p.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <span class="text-xs font-black text-slate-800 block">${p.name} ${isOwner ? '<span class="text-[9px] text-indigo-600 font-bold">(Titular)</span>' : ''}</span>
              <span class="text-[10px] text-slate-400 font-medium">Consumo total</span>
            </div>
          </div>
          <span class="text-xs font-black text-slate-900">${formatCurrency(owed)}</span>
        </div>
      `;
    }).join('') + (guestDebt > 0 ? `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-100">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
            INV
          </div>
          <div>
            <span class="text-xs font-black text-amber-950 block">Invitados</span>
            <span class="text-[10px] text-amber-700 font-medium">Consumo externo</span>
          </div>
        </div>
        <span class="text-xs font-black text-amber-950">${formatCurrency(guestDebt)}</span>
      </div>
    ` : '');
  }

  // Lista de Movimientos con soporte visual de Fijos/Proyectados
  if (listContainer) {
    if (methodExpenses.length === 0) {
      listContainer.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">Sin consumos en este período</p>`;
    } else {
      listContainer.innerHTML = methodExpenses.map(e => {
        const isFixed = e.isFixed || e.isProjected;
        return `
          <div onclick="${isFixed ? '' : `closeModal('modal-card-detail'); window.openTransactionDetailModal ? window.openTransactionDetailModal('${e.id}') : null;`}"
            class="flex items-center justify-between p-3 rounded-2xl bg-white border ${isFixed ? 'border-dashed border-indigo-200 bg-indigo-50/20' : 'border-slate-100 shadow-2xs'} ${isFixed ? '' : 'cursor-pointer active:scale-98'} transition-all">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-8 h-8 rounded-xl ${style.iconBg} flex items-center justify-center text-xs shrink-0">
                <i class="fas ${isFixed ? 'fa-repeat' : style.icon}"></i>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-black text-slate-900 truncate">${e.description || e.name || 'Gasto'}</span>
                  ${isFixed ? '<span class="text-[8px] font-black uppercase text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded shrink-0">Fijo</span>' : ''}
                </div>
                <span class="text-[10px] text-slate-400 font-medium block">${e.date} • ${e.category || 'General'}</span>
              </div>
            </div>
            <span class="text-xs font-black text-slate-900 ml-2 shrink-0">${formatCurrency(parseFloat(e.amount) || 0)}</span>
          </div>
        `;
      }).join('');
    }
  }

  openModal('modal-card-detail');
}

// ================================================================
// VOLVER AL CICLO ACTUAL DESDE UN ESTADO DE CUENTA ANTERIOR
// ================================================================
export function restoreCurrentCardCycle() {
  if (!currentActiveMethodId) return;
  openCreditCardDetailModal(currentActiveMethodId, null);
}

// ================================================================
// ABRIR MODAL HISTORIAL DE ESTADOS DE CUENTA ANTERIORES
// ================================================================
export function openCardStatementsHistoryModal(methodId = null) {
  const targetId = methodId || currentActiveMethodId;
  const paymentMethods = appState.paymentMethods || [];
  const allExpenses = appState.expenses || [];

  const method = paymentMethods.find(m => m.id === targetId);
  if (!method) return;

  const cycles = getCardStatementCycles(method, 12);

  const modalTitle = document.getElementById('modal-statements-history-title');
  const modalSubtitle = document.getElementById('modal-statements-history-subtitle');
  const listContainer = document.getElementById('modal-statements-history-list');

  if (modalTitle) modalTitle.textContent = `Estados de Cuenta: ${method.name}`;
  if (modalSubtitle) modalSubtitle.textContent = method.type === 'credit' ? 'Historial de ciclos y fechas de corte' : 'Historial de meses anteriores';

  if (listContainer) {
    if (cycles.length === 0) {
      listContainer.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">No hay estados de cuenta disponibles.</p>`;
    } else {
      listContainer.innerHTML = cycles.map((cycle, index) => {
        const calc = getExpensesForMethodRange(allExpenses, method.id, cycle);
        const isCurrentActive = currentActiveCycle ? (currentActiveCycle.startDate === cycle.startDate && currentActiveCycle.closingDate === cycle.closingDate) : cycle.isCurrent;
        
        let paymentBadge = '';
        if (cycle.paymentDate) {
          const p = new Date(cycle.paymentDate + "T00:00:00Z");
          const pStr = `${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
          paymentBadge = `<span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1"><i class="fas fa-calendar-check text-[9px] text-indigo-500"></i> Paga: ${pStr}</span>`;
        }

        return `
          <div onclick="selectStatementCycle('${method.id}', ${index})"
            class="p-3.5 rounded-2xl bg-white border ${isCurrentActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200/80 hover:border-slate-300'} shadow-2xs hover:shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-between">
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-900">${cycle.label}</span>
                ${cycle.isCurrent ? '<span class="text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">Ciclo Activo</span>' : ''}
              </div>
              <div class="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <span><i class="far fa-calendar-alt text-[9px] mr-1 text-slate-400"></i>${cycle.dateRangeLabel}</span>
                <span>•</span>
                <span>${calc.expenses.length} consumos</span>
              </div>
              ${paymentBadge}
            </div>

            <div class="text-right pl-3 shrink-0">
              <span class="text-sm font-black text-slate-900 block">${formatCurrency(calc.total)}</span>
              <span class="text-[10px] font-bold text-indigo-600 flex items-center justify-end gap-1 mt-0.5">
                <span>Ver detalle</span>
                <i class="fas fa-chevron-right text-[8px]"></i>
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  openModal('modal-card-statements-history');
}

// ================================================================
// SELECCIONAR CICLO HISTÓRICO Y ABRIR DETALLE
// ================================================================
export function selectStatementCycle(methodId, cycleIndex) {
  const paymentMethods = appState.paymentMethods || [];
  const method = paymentMethods.find(m => m.id === methodId);
  if (!method) return;

  const cycles = getCardStatementCycles(method, 12);
  const selectedCycle = cycles[cycleIndex];

  closeModal('modal-card-statements-history');
  openCreditCardDetailModal(methodId, selectedCycle);
}

// Global window mappings
window.openPaymentMethodsSummaryModal = openPaymentMethodsSummaryModal;
window.openCreditCardDetailModal = openCreditCardDetailModal;
window.openCardStatementsHistoryModal = openCardStatementsHistoryModal;
window.restoreCurrentCardCycle = restoreCurrentCardCycle;
window.selectStatementCycle = selectStatementCycle;


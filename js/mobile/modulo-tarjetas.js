// ================================================================
// MÓDULO DE RESUMEN DE MÉTODOS DE PAGO Y TARJETAS (VISTA DEDICADA MOBILE)
// ================================================================

import { appState, filterDate, formatCurrency, getFilterMonthString, getCycleDates, MONTHS } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";

// Paleta de gradientes y estilos para los métodos de pago
const METHOD_THEMES = {
  credit: {
    badge: "Crédito",
    icon: "fa-credit-card",
    gradient: "from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30 text-white",
    chipBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    glow: "bg-indigo-500/20",
    accent: "text-indigo-400"
  },
  debit: {
    badge: "Débito",
    icon: "fa-credit-card",
    gradient: "from-slate-900 via-cyan-950 to-slate-900 border-cyan-500/30 text-white",
    chipBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    glow: "bg-cyan-500/20",
    accent: "text-cyan-400"
  },
  cash: {
    badge: "Efectivo",
    icon: "fa-money-bill-wave",
    gradient: "from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30 text-white",
    chipBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    glow: "bg-emerald-500/20",
    accent: "text-emerald-400"
  },
  transfer: {
    badge: "Transferencia",
    icon: "fa-arrow-right-arrow-left",
    gradient: "from-slate-900 via-purple-950 to-slate-900 border-purple-500/30 text-white",
    chipBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    glow: "bg-purple-500/20",
    accent: "text-purple-400"
  },
  other: {
    badge: "Cuenta",
    icon: "fa-wallet",
    gradient: "from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 text-white",
    chipBg: "bg-slate-700/50 text-slate-300 border-slate-600/50",
    glow: "bg-slate-500/10",
    accent: "text-slate-300"
  }
};

export function getAllPaymentMethodsData() {
  const paymentMethods = appState.paymentMethods || [];
  const allExpenses = appState.expenses || [];
  const participants = appState.participants || [];
  const today = new Date();
  const filterMonthString = getFilterMonthString(filterDate);

  let totalCombinedSpent = 0;
  let totalCreditDebt = 0;

  const methodsData = paymentMethods.map((method, idx) => {
    const isCredit = method.type === "credit";
    let dateRangeLabel = "";
    let paymentDateLabel = "";
    let cycle = null;
    let methodExpenses = [];

    if (isCredit) {
      cycle = getCycleDates(method, today);
      const s = cycle.startDate ? new Date(cycle.startDate + "T00:00:00Z") : null;
      const c = cycle.closingDate ? new Date(cycle.closingDate + "T00:00:00Z") : null;
      if (s && c) {
        const sStr = `${s.getUTCDate()} ${s.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
        const cStr = `${c.getUTCDate()} ${c.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
        dateRangeLabel = `${sStr} - ${cStr}`;
      } else {
        dateRangeLabel = "Ciclo no configurado";
      }

      if (cycle.paymentDate) {
        const p = new Date(cycle.paymentDate + "T00:00:00Z");
        paymentDateLabel = `Paga: ${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      }

      methodExpenses = allExpenses.filter(e => {
        if (e.paymentMethodId !== method.id || e.isFixed || e.isProjected || !e.date) return false;
        if (cycle.startDate && cycle.closingDate) {
          return e.date >= cycle.startDate && e.date <= cycle.closingDate;
        }
        return true;
      });
    } else {
      dateRangeLabel = `${MONTHS[filterDate.getMonth()]} ${filterDate.getFullYear()}`;
      paymentDateLabel = "Mes en curso";
      methodExpenses = allExpenses.filter(e => {
        if (e.paymentMethodId !== method.id || e.isFixed || e.isProjected || !e.date) return false;
        return e.date.startsWith(filterMonthString);
      });
    }

    const totalSpent = methodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
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

    const theme = METHOD_THEMES[method.type] || METHOD_THEMES.other;

    return {
      method,
      isCredit,
      cycle,
      dateRangeLabel,
      paymentDateLabel,
      ownerName,
      totalSpent,
      methodExpenses,
      theme
    };
  });

  return { methodsData, totalCombinedSpent, totalCreditDebt };
}

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
        <div class="text-center py-10 text-slate-400 italic space-y-2">
          <i class="fas fa-credit-card text-3xl opacity-30"></i>
          <p class="text-xs">No hay métodos de pago configurados en este monedero.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = methodsData.map(item => `
        <div onclick="openCreditCardDetailModal('${item.method.id}')"
          class="w-full bg-gradient-to-br ${item.theme.gradient} rounded-3xl p-4.5 border shadow-lg cursor-pointer active:scale-98 transition-all relative overflow-hidden select-none group">
          
          <!-- Decoración resplandor -->
          <div class="absolute -right-6 -bottom-6 w-28 h-28 ${item.theme.glow} rounded-full blur-xl"></div>

          <div class="relative z-10 space-y-3">
            <!-- Fila Superior: Tipo / Chip + Nombre del Método -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                ${item.isCredit ? `
                  <div class="w-7 h-5 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 border border-yellow-600/60 shadow-xs flex items-center justify-center p-0.5">
                    <div class="w-full h-[1px] bg-amber-800/30"></div>
                  </div>
                  <i class="fas fa-wifi text-slate-400 rotate-90 text-[10px]"></i>
                ` : `
                  <div class="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-xs text-white">
                    <i class="fas ${item.theme.icon}"></i>
                  </div>
                `}
                <span class="font-extrabold text-sm text-white">${item.method.name}</span>
              </div>
              <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${item.theme.chipBg}">
                ${item.theme.badge}
              </span>
            </div>

            <!-- Fila Central: Monto Consumido -->
            <div class="pt-0.5">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                ${item.isCredit ? 'Consumo del Ciclo' : 'Consumo del Mes'}
              </span>
              <span class="text-2xl font-black tracking-tight text-white block mt-0.5">
                ${formatCurrency(item.totalSpent)}
              </span>
            </div>

            <!-- Fila Inferior: Rango de Fechas + Titular -->
            <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
              <div>
                <span class="text-slate-400 block text-[8px] font-bold uppercase">${item.isCredit ? 'Ciclo Corte' : 'Período'}</span>
                <span class="font-bold text-slate-200">${item.dateRangeLabel}</span>
              </div>
              <div class="text-right">
                <span class="text-slate-400 block text-[8px] font-bold uppercase">Titular</span>
                <span class="font-black text-slate-200 truncate max-w-[110px] block">${item.ownerName}</span>
              </div>
            </div>

            <!-- Enlace inferior: Ver detalle de compras -->
            <div class="pt-1 flex items-center justify-between text-[10px] text-slate-300 font-bold group-hover:text-white transition-colors">
              <span>Ver ${item.methodExpenses.length} consumo(s) ${item.paymentDateLabel ? '• ' + item.paymentDateLabel : ''}</span>
              <i class="fas fa-chevron-right text-[8px] opacity-70"></i>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  openModal('modal-payment-methods-summary');
}

export function openCreditCardDetailModal(methodId) {
  const { methodsData } = getAllPaymentMethodsData();
  const cardData = methodsData.find(c => c.method.id === methodId);
  if (!cardData) return;

  const modalTitle = document.getElementById('modal-card-detail-title');
  const modalCycle = document.getElementById('modal-card-detail-cycle');
  const modalTotal = document.getElementById('modal-card-detail-total');
  const modalOwner = document.getElementById('modal-card-detail-owner');
  const listContainer = document.getElementById('modal-card-detail-expenses-list');
  const debtContainer = document.getElementById('modal-card-detail-debt-breakdown');

  if (modalTitle) modalTitle.textContent = cardData.method.name;
  if (modalCycle) modalCycle.textContent = `${cardData.dateRangeLabel} ${cardData.paymentDateLabel ? ' • ' + cardData.paymentDateLabel : ''}`;
  if (modalTotal) modalTotal.textContent = formatCurrency(cardData.totalSpent);
  if (modalOwner) modalOwner.textContent = `Titular: ${cardData.ownerName}`;

  // Desglose de Deuda por Miembro dentro de este método / ciclo
  const participants = appState.participants || [];
  const debtPerPerson = {};
  participants.forEach(p => { debtPerPerson[p.id] = 0; });
  let guestDebt = 0;

  cardData.methodExpenses.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    const guests = (e.guests && Array.isArray(e.guests) && e.guests.length > 0)
      ? e.guests
      : (e.guestName ? [e.guestName] : []);
    const totalPeople = participants.length + guests.length;

    if (e.type === "personal") {
      const payerId = e.paidBy || cardData.method.ownerId || (participants[0]?.id);
      if (debtPerPerson[payerId] !== undefined) {
        debtPerPerson[payerId] += amount;
      }
    } else {
      // Gasto Compartido
      if (e.items && e.items.length > 0) {
        e.items.forEach(item => {
          const qty = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.amount) || 0;
          const assignments = item.assignments || {};
          const assignedKeys = Object.keys(assignments).filter(k => (parseFloat(assignments[k]) || 0) > 0);

          if (assignedKeys.length > 0) {
            assignedKeys.forEach(k => {
              const u = parseFloat(assignments[k]) || 0;
              const cost = u * unitPrice;
              if (debtPerPerson[k] !== undefined) {
                debtPerPerson[k] += cost;
              } else {
                guestDebt += cost;
              }
            });
          } else {
            const share = (qty * unitPrice) / (totalPeople || 1);
            participants.forEach(p => { debtPerPerson[p.id] += share; });
            guestDebt += share * guests.length;
          }
        });
      } else {
        const share = amount / (totalPeople || 1);
        participants.forEach(p => { debtPerPerson[p.id] += share; });
        guestDebt += share * guests.length;
      }
    }
  });

  if (debtContainer) {
    debtContainer.innerHTML = participants.map(p => {
      const owed = debtPerPerson[p.id] || 0;
      const isOwner = p.id === cardData.method.ownerId;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
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

  // Lista de Movimientos
  if (listContainer) {
    if (cardData.methodExpenses.length === 0) {
      listContainer.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">Sin consumos en este período</p>`;
    } else {
      listContainer.innerHTML = cardData.methodExpenses.map(e => `
        <div onclick="closeModal('modal-card-detail'); openTransactionDetailModal('${e.id}');"
          class="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs cursor-pointer active:scale-98 transition-all">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs shrink-0">
              <i class="fas ${cardData.theme.icon}"></i>
            </div>
            <div class="min-w-0 flex-1">
              <span class="text-xs font-black text-slate-900 truncate block">${e.description || e.name || 'Gasto'}</span>
              <span class="text-[10px] text-slate-400 font-medium">${e.date} • ${e.category || 'General'}</span>
            </div>
          </div>
          <span class="text-xs font-black text-slate-900 ml-2 shrink-0">${formatCurrency(parseFloat(e.amount) || 0)}</span>
        </div>
      `).join('');
    }
  }

  openModal('modal-card-detail');
}

window.openPaymentMethodsSummaryModal = openPaymentMethodsSummaryModal;
window.openCreditCardDetailModal = openCreditCardDetailModal;

// ================================================================
// MÓDULO DE RESUMEN DE TARJETAS DE CRÉDITO MOBILE
// ================================================================

import { appState, filterDate, formatCurrency, getCycleDates } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";

// Paleta de gradientes elegantes para las tarjetas mobile
const CARD_GRADIENTS = [
  "from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30 text-white",
  "from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30 text-white",
  "from-slate-900 via-purple-950 to-slate-900 border-purple-500/30 text-white",
  "from-slate-900 via-rose-950 to-slate-900 border-rose-500/30 text-white",
  "from-slate-900 via-amber-950 to-slate-900 border-amber-500/30 text-white",
  "from-slate-900 via-cyan-950 to-slate-900 border-cyan-500/30 text-white",
];

const CARD_ACCENTS = [
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
];

export function getCreditCardsData() {
  const paymentMethods = (appState.paymentMethods || []).filter(m => m.type === "credit");
  const allExpenses = appState.expenses || [];
  const participants = appState.participants || [];
  const today = new Date();

  let globalTotalCardDebt = 0;

  const cards = paymentMethods.map((method, idx) => {
    const cycle = getCycleDates(method, today);
    const startDate = cycle.startDate;
    const closingDate = cycle.closingDate;
    const paymentDate = cycle.paymentDate;

    // Filtrar consumos del ciclo
    const cycleExpenses = allExpenses.filter(e => {
      if (e.paymentMethodId !== method.id || e.isFixed || e.isProjected || !e.date) return false;
      if (startDate && closingDate) {
        return e.date >= startDate && e.date <= closingDate;
      }
      return true;
    });

    const totalSpent = cycleExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    globalTotalCardDebt += totalSpent;

    // Titular
    let ownerName = "Sin titular";
    if (method.ownerId) {
      const owner = participants.find(p => p.id === method.ownerId);
      if (owner) ownerName = owner.name;
    }

    // Formatear fechas cortas (ej. 18 Jun - 17 Jul)
    let dateRangeLabel = "Ciclo no configurado";
    if (startDate && closingDate) {
      const s = new Date(startDate + "T00:00:00Z");
      const c = new Date(closingDate + "T00:00:00Z");
      const sStr = `${s.getUTCDate()} ${s.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      const cStr = `${c.getUTCDate()} ${c.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
      dateRangeLabel = `${sStr} - ${cStr}`;
    }

    let paymentDateLabel = "";
    if (paymentDate) {
      const p = new Date(paymentDate + "T00:00:00Z");
      paymentDateLabel = `Paga: ${p.getUTCDate()} ${p.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' })}`;
    }

    return {
      method,
      cycle,
      dateRangeLabel,
      paymentDateLabel,
      ownerName,
      totalSpent,
      cycleExpenses,
      gradientClass: CARD_GRADIENTS[idx % CARD_GRADIENTS.length],
      accentClass: CARD_ACCENTS[idx % CARD_ACCENTS.length],
    };
  });

  return { cards, globalTotalCardDebt };
}

export function renderCreditCardsSummary() {
  const section = document.getElementById('section-credit-cards-summary');
  const carousel = document.getElementById('mobile-cards-carousel');
  const globalDebtBadge = document.getElementById('cards-total-debt-badge');
  if (!section || !carousel) return;

  const { cards, globalTotalCardDebt } = getCreditCardsData();

  if (cards.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  if (globalDebtBadge) {
    globalDebtBadge.textContent = `Deuda activa: ${formatCurrency(globalTotalCardDebt)}`;
  }

  carousel.innerHTML = cards.map(c => `
    <div onclick="openCreditCardDetailModal('${c.method.id}')"
      class="w-[260px] sm:w-[280px] shrink-0 snap-start bg-gradient-to-br ${c.gradientClass} rounded-3xl p-4.5 border shadow-xl cursor-pointer active:scale-98 transition-all relative overflow-hidden select-none group">
      
      <!-- Decoración fondo -->
      <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full blur-xl"></div>
      
      <div class="relative z-10 space-y-3">
        <!-- Cabecera de la Tarjeta: Chip bancario + Logo Contactless -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <!-- Chip Dorado Visual -->
            <div class="w-7 h-5 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 border border-yellow-600/60 shadow-xs flex items-center justify-center p-0.5">
              <div class="w-full h-[1px] bg-amber-800/30"></div>
            </div>
            <i class="fas fa-wifi text-slate-400 rotate-90 text-[10px]"></i>
          </div>
          <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c.accentClass}">
            ${c.method.name}
          </span>
        </div>

        <!-- Consumo y Monto -->
        <div class="pt-1">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Consumo del Ciclo</span>
          <span class="text-2xl font-black tracking-tight text-white block mt-0.5">
            ${formatCurrency(c.totalSpent)}
          </span>
        </div>

        <!-- Fechas de Corte y Titular -->
        <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
          <div>
            <span class="text-slate-400 block text-[8px] font-bold uppercase">Ciclo</span>
            <span class="font-bold text-slate-200">${c.dateRangeLabel}</span>
          </div>
          <div class="text-right">
            <span class="text-slate-400 block text-[8px] font-bold uppercase">Titular</span>
            <span class="font-black text-slate-200 truncate max-w-[80px] block">${c.ownerName}</span>
          </div>
        </div>

        <!-- Botón Ver Detalles -->
        <div class="pt-1 flex items-center justify-between text-[10px] text-slate-300 font-bold group-hover:text-white transition-colors">
          <span>Ver consumos (${c.cycleExpenses.length})</span>
          <i class="fas fa-chevron-right text-[8px] opacity-70"></i>
        </div>
      </div>
    </div>
  `).join('');
}

export function openCreditCardDetailModal(methodId) {
  const { cards } = getCreditCardsData();
  const cardData = cards.find(c => c.method.id === methodId);
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

  // Desglose de Deuda por Miembro dentro de este ciclo
  const participants = appState.participants || [];
  const debtPerPerson = {};
  participants.forEach(p => { debtPerPerson[p.id] = 0; });
  let guestDebt = 0;

  cardData.cycleExpenses.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    const guests = (e.guests && Array.isArray(e.guests) && e.guests.length > 0)
      ? e.guests
      : (e.guestName ? [e.guestName] : []);
    const totalPeople = participants.length + guests.length;

    if (e.type === "personal") {
      const payerId = e.paidBy || cardData.method.ownerId;
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
            // Reparto proporcional del ítem
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
              <span class="text-[10px] text-slate-400 font-medium">Consumo en tarjeta</span>
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

  // Lista de Movimientos en el Ciclo
  if (listContainer) {
    if (cardData.cycleExpenses.length === 0) {
      listContainer.innerHTML = `<p class="text-center text-xs text-slate-400 italic py-6">Sin consumos en este ciclo</p>`;
    } else {
      listContainer.innerHTML = cardData.cycleExpenses.map(e => `
        <div onclick="closeModal('modal-card-detail'); openTransactionDetailModal('${e.id}');"
          class="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs cursor-pointer active:scale-98 transition-all">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs shrink-0">
              <i class="fas fa-credit-card"></i>
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

window.openCreditCardDetailModal = openCreditCardDetailModal;

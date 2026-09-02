// ================================================================
// MÓDULO DE RESUMEN DE MÉTODOS DE PAGO Y TARJETAS (CUADRÍCULA 2 COLUMNAS)
// CON SOPORTE COMPLETO DE GASTOS FIJOS, PROYECCIONES Y ESTADOS DE CUENTA ANTERIORES
// ================================================================

import { appState, auth, currentUserId, filterDate, formatCurrency, getFilterMonthString, getCycleDates, getCardStatementCycles, isExpenseInBillingMonth, calculateSummary, MONTHS } from "./core-state.js";
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

  const currentParticipant = (participants && participants.length > 0)
    ? (participants.find(p => p.id === (typeof currentUserId !== 'undefined' ? currentUserId : null)) || participants[0])
    : null;
  const filterMonthString = getFilterMonthString(filterDate);

  let totalCombinedSpent = 0;
  let totalCreditDebt = 0;
  let walletCount = 0;
  let cardCount = 0;

  const methodsData = paymentMethods.map((method) => {
    const isCredit = method.type === "credit";
    const isDebit = method.type === "debit";
    const isCash = method.type === "cash" || method.type === "wallet";

    if (isCredit || isDebit) cardCount++;
    else walletCount++;

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

    // Cálculo de consumos
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

    const categoryType = isCredit ? "Crédito" : (isDebit ? "Débito" : "Compartido");

    // Gastos fijos asignados
    const methodFixedExpenses = methodExpenses.filter(e => e.isFixed || e.isProjected);
    const totalFixed = methodFixedExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // Saldo restante específico
    const baseLimit = parseFloat(method.creditLimit || method.initialBalance || method.limit || 0);
    const remainingBalance = isCredit ? Math.max(0, baseLimit - totalSpent) : Math.max(0, baseLimit - totalSpent);

    const style = METHOD_STYLES[method.type] || METHOD_STYLES.other;

    return {
      method,
      isCredit,
      categoryType,
      cycle,
      dateRangeLabel,
      paymentDateLabel,
      ownerName,
      totalSpent,
      spentFormatted: totalSpent.toFixed(2),
      totalFixed,
      fixedFormatted: totalFixed.toFixed(2),
      remainingFormatted: remainingBalance.toFixed(2),
      methodExpenses,
      style
    };
  });

  return { methodsData, totalCombinedSpent, totalCreditDebt, walletCount, cardCount, currentParticipant };
}

// ================================================================
// EFECTO DE SCROLL Y FÍSICA ORGÁNICA GSAP (MATCH EXACTO DE BOTONES DEL DOCK)
// INCLUYE INERCIA DE DESPLAZAMIENTO, VELOCIDAD Y REBOTES ELÁSTICOS (back.out 1.36)
// ================================================================
export function initCardsStackScroll() {
  const container = document.getElementById('modal-pm-summary-cards-container');
  const cards = Array.from(document.querySelectorAll('.card-deck-item'));
  if (!container || !cards.length) return;

  let rafId = null;
  let lastScrollTop = container.scrollTop;
  let scrollVelocity = 0;
  let scrollStopTimer = null;

  // 1. Física táctil orgánica en cada tarjeta (Press / Release con squash & stretch idéntico al Dock)
  cards.forEach(card => {
    if (card._hasDockPhysics) return;
    card._hasDockPhysics = true;

    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (window.gsap) {
        gsap.to(card, {
          scale: 0.96,
          scaleX: 1.02,
          scaleY: 0.94,
          duration: 0.07,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    });

    const releaseCard = (e) => {
      if (e && e.target && e.target.closest('button')) return;
      if (window.gsap) {
        gsap.timeline({ overwrite: "auto" })
          .to(card, {
            scaleX: 0.97,
            scaleY: 1.04,
            duration: 0.08,
            ease: "power2.out"
          })
          .to(card, {
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 0.18,
            ease: "back.out(1.36)"
          });
      }
    };

    card.addEventListener('pointerup', releaseCard);
    card.addEventListener('pointerleave', releaseCard);
    card.addEventListener('pointercancel', releaseCard);
  });

  // 2. Cálculo continuo de apilamiento en scroll con rebote elástico GSAP (back.out 1.8)
  const updateCardTransforms = () => {
    const containerRect = container.getBoundingClientRect();

    cards.forEach((card, i) => {
      const innerContent = card.querySelector('.card-inner-content');
      const nextCard = cards[i + 1];

      // 1. Cuántas tarjetas posteriores (j > i) han alcanzado el tope de fijación (~24px - 30px)
      let cardsInFront = 0;
      for (let j = i + 1; j < cards.length; j++) {
        const currentTop = cards[j].getBoundingClientRect().top - containerRect.top;
        if (currentTop <= 30) {
          cardsInFront++;
        }
      }

      // 2. REGLA ESTRICTA: Desvanecimiento progresivo marcado hacia atrás + Frenado con rebote elástico notorio
      // Nivel 0 (Frente): scale 1.0, y 0px, opacity 1.0 (100% nítida)
      // Nivel 1 (Detrás 1): scale 0.95, y -12px, opacity 0.50 (desvanecimiento visible)
      // Nivel 2 (Detrás 2): scale 0.90, y -24px, opacity 0.20 (desvanecimiento profundo)
      // Nivel 3+ (Excedente): opacity 0.0, visibility hidden (totalmente desvanecida)
      const isTooDeep = cardsInFront >= 3;
      const targetScale = cardsInFront === 0 ? 1 : (cardsInFront === 1 ? 0.95 : 0.90);
      const targetY = cardsInFront === 0 ? 0 : (cardsInFront === 1 ? -12 : -24);
      const targetOpacity = cardsInFront === 0 ? 1 : (cardsInFront === 1 ? 0.50 : (cardsInFront === 2 ? 0.20 : 0));

      const prevLevel = card._lastStackLevel !== undefined ? card._lastStackLevel : -1;
      const levelChanged = prevLevel !== cardsInFront;
      const isUnstacking = prevLevel > cardsInFront;
      card._lastStackLevel = cardsInFront;

      if (levelChanged && window.gsap) {
        // Rebote elástico simétrico: al apilar (back.out 1.8) y al desapilar/subir (back.out 2.4 para pop táctil)
        const bounceEase = isUnstacking ? "back.out(2.4)" : "back.out(1.8)";
        const bounceDuration = isUnstacking ? 0.34 : 0.30;

        gsap.to(card, {
          scale: targetScale,
          y: targetY,
          opacity: targetOpacity,
          duration: bounceDuration,
          ease: bounceEase,
          overwrite: "auto",
          onComplete: () => {
            card.style.visibility = isTooDeep ? 'hidden' : 'visible';
            card.style.pointerEvents = isTooDeep ? 'none' : 'auto';
          }
        });
        if (!isTooDeep) {
          card.style.visibility = 'visible';
          card.style.pointerEvents = 'auto';
        }
      } else if (!window.gsap) {
        card.style.transform = `translateY(${targetY}px) scale(${targetScale.toFixed(3)})`;
        card.style.opacity = `${targetOpacity}`;
        card.style.visibility = isTooDeep ? 'hidden' : 'visible';
        card.style.pointerEvents = isTooDeep ? 'none' : 'auto';
      }

      // 3. Desvanecimiento suave del contenido interno al quedar cubierta
      if (nextCard) {
        const nextRect = nextCard.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const overlapDistance = nextRect.top - cardRect.top;

        if (overlapDistance < 80) {
          const progress = Math.max(0, Math.min(1, (80 - overlapDistance) / 45));
          if (innerContent) {
            const op = Math.max(0, 1 - progress);
            innerContent.style.opacity = `${op}`;
            if (progress >= 0.85) {
              innerContent.style.visibility = 'hidden';
              innerContent.style.pointerEvents = 'none';
            } else {
              innerContent.style.visibility = 'visible';
              innerContent.style.pointerEvents = 'auto';
            }
          }
        } else {
          if (innerContent) {
            innerContent.style.opacity = '1';
            innerContent.style.visibility = 'visible';
            innerContent.style.pointerEvents = 'auto';
          }
        }
      } else {
        // La última tarjeta siempre se mantiene 100% visible y escala 1
        if (innerContent) {
          innerContent.style.opacity = '1';
          innerContent.style.visibility = 'visible';
          innerContent.style.pointerEvents = 'auto';
        }
      }
    });
  };

  const onScroll = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateCardTransforms);
  };

  container.removeEventListener('scroll', container._cardDeckScrollHandler);
  container._cardDeckScrollHandler = onScroll;
  container.addEventListener('scroll', onScroll, { passive: true });

  updateCardTransforms();
}

// ================================================================
// ABRIR VISTA RESUMEN GENERAL DE TARJETAS (PÁGINA DEDICADA MOBILE)
// ================================================================
export function openPaymentMethodsSummaryModal() {
  const { methodsData, totalCombinedSpent, totalCreditDebt, walletCount, cardCount, currentParticipant } = getAllPaymentMethodsData();

  // 1. Datos del Usuario y Saldo Consolidado Superior
  const userName = currentParticipant?.name || 'Emerson';
  const nameParts = userName.trim().split(' ').filter(Boolean);
  const userInitials = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : (nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : 'EB');

  const avatarEl = document.getElementById('card-view-user-avatar');
  const nameEl = document.getElementById('card-view-user-name');
  const remainingBalEl = document.getElementById('card-view-remaining-balance');
  const walletCountEl = document.getElementById('card-view-wallet-count');
  const cardCountEl = document.getElementById('card-view-card-count');
  const listContainer = document.getElementById('modal-pm-summary-cards-list');

  if (avatarEl) avatarEl.textContent = userInitials;
  if (nameEl) nameEl.textContent = nameParts[0] || userName;

  // Saldo Restante Superior
  const allExpenses = appState.expenses || [];
  const filterMonthString = getFilterMonthString(filterDate);
  const summary = calculateSummary(appState, allExpenses.filter(e => isExpenseInBillingMonth(e, filterMonthString, filterDate, appState.paymentMethods)));
  const userSummary = (summary.participantData || []).find(p => p.id === currentParticipant?.id);
  const userRemaining = userSummary ? (userSummary.remainingBudget || 0) : (summary.globalTotalRemainingBudget || 0);

  if (remainingBalEl) remainingBalEl.textContent = Math.max(0, userRemaining).toFixed(2);
  if (walletCountEl) walletCountEl.textContent = String(Math.max(1, walletCount));
  if (cardCountEl) cardCountEl.textContent = String(Math.max(1, cardCount));

  // 2. Renderizado de Tarjetas Sobrepuestas (Stacked Deck con Base Recta y Overlap)
  if (listContainer) {
    const cardsHTML = methodsData.map((item, index) => {
      const isFirst = index === 0;
      const mtClass = isFirst ? 'mt-0' : '-mt-[32px]';
      const isSavings = item.method.type === 'savings' || (item.method.name || '').toLowerCase().includes('ahorro');
      const thirdPillBadge = isSavings ? 'ahorrado' : 'Gastado';

      return `
        <div onclick="openCreditCardDetailModal('${item.method.id}')"
          class="card-deck-item relative bg-[#e9f7e4] rounded-t-[36px] rounded-b-none px-[16px] pt-[12px] pb-[16px] w-full max-w-[408px] mx-auto h-[154px] min-h-[154px] border-t-2 border-x-2 border-[#cbe8c4] border-b-0 shadow-[0_-6px_20px_rgba(0,0,0,0.03)] hover:shadow-md cursor-pointer select-none ${mtClass}"
          style="z-index: ${(index + 1) * 10}; position: sticky; top: 0px; background-color: #e9f7e4 !important; transform-origin: center top;">
          
          <!-- Contenedor interno: distribución vertical compacta para mantener píldoras 100% visibles -->
          <div class="card-inner-content transition-opacity duration-150 flex flex-col w-full">
            <!-- 1. Encabezado Tarjeta: Tipo a la izquierda, Botones a la derecha (Margen superior 12px) -->
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-[#406838] tracking-wide">
                ${item.categoryType}
              </span>

              <div class="flex items-center gap-2" onclick="event.stopPropagation()">
                <button type="button" onclick="editPaymentMethod('${item.method.id}')"
                  class="w-7 h-7 rounded-lg bg-[#84cc16] text-[#142314] flex items-center justify-center shadow-2xs hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                  title="Editar tarjeta">
                  <span class="material-symbols-rounded text-base font-bold">edit</span>
                </button>
                <button type="button" onclick="confirmDeletePaymentMethod('${item.method.id}')"
                  class="w-7 h-7 rounded-lg bg-[#ef4444] text-white flex items-center justify-center shadow-2xs hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                  title="Eliminar tarjeta">
                  <span class="material-symbols-rounded text-base font-bold">delete</span>
                </button>
              </div>
            </div>

            <!-- 2. Título Principal de la Tarjeta (Altura 34px, margen izquierdo 16px, Grande y Negrita) -->
            <div class="h-[34px] flex items-center mb-2">
              <h3 class="text-3xl font-black text-[#193217] tracking-tight truncate leading-none">
                ${item.method.name}
              </h3>
            </div>

            <!-- 3. Fila de 3 Píldoras de Métricas (Ancho total 376px, cada píldora 109px, Altura 24px) -->
            <div class="w-full max-w-[376px] mx-auto grid grid-cols-3 gap-2 items-center">
              
              <!-- 1. Píldora Saldo Restante (Ancho 109px, Altura 24px) -->
              <div class="relative bg-[#f2faf0] h-[24px] max-w-[109px] rounded-full px-2 border border-[#d6edd1] shadow-2xs flex items-center justify-center min-w-0">
                <span class="absolute -top-2 left-2.5 px-1.5 py-[1px] bg-[#e9f7e4] rounded-full text-[7.5px] font-extrabold text-[#2d6a4f] border border-[#cbe8c4] leading-none shadow-2xs">
                  saldo
                </span>
                <div class="flex items-baseline gap-0.5 truncate text-slate-900 font-black text-xs leading-none">
                  <span class="text-[8px] font-bold opacity-60">S/</span>
                  <span class="text-xs font-black">${item.remainingFormatted}</span>
                </div>
              </div>

              <!-- 2. Píldora Presupuesto / Gastos Fijos (Ancho 109px, Altura 24px) -->
              <div class="relative bg-[#1e2e1c] h-[24px] max-w-[109px] text-white rounded-full px-2 shadow-2xs flex items-center justify-center min-w-0">
                <span class="absolute -top-2 left-2.5 px-1.5 py-[1px] bg-[#1e2e1c] rounded-full text-[7.5px] font-extrabold text-[#86efac] leading-none shadow-2xs">
                  Presupuesto
                </span>
                <div class="flex items-baseline gap-0.5 truncate text-white font-black text-xs leading-none">
                  <span class="text-[8px] font-bold opacity-70">S/</span>
                  <span class="text-xs font-black text-white">${item.fixedFormatted}</span>
                </div>
              </div>

              <!-- 3. Píldora Total Gastado / Ahorrado (Ancho 109px, Altura 24px) -->
              <div class="relative bg-[#e11d48] h-[24px] max-w-[109px] text-white rounded-full px-2 shadow-2xs flex items-center justify-center min-w-0">
                <span class="absolute -top-2 left-2.5 px-1.5 py-[1px] bg-[#e11d48] rounded-full text-[7.5px] font-extrabold text-white leading-none shadow-2xs">
                  ${thirdPillBadge}
                </span>
                <div class="flex items-baseline gap-0.5 truncate text-white font-black text-xs leading-none">
                  <span class="text-[8px] font-bold opacity-70">S/</span>
                  <span class="text-xs font-black text-white">${item.spentFormatted}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      `;
    }).join('');

    // 4. Tarjeta Especial al Final: Crear / Agregar Nueva Tarjeta (Con margen natural)
    const addCardIndex = methodsData.length;
    const addCardHTML = `
      <div onclick="openCreatePaymentMethodModal()"
        class="card-deck-item relative bg-[#f4faf2] hover:bg-[#ebf7e8] active:scale-[0.98] transition-all rounded-t-[36px] rounded-b-none px-[16px] pt-[20px] pb-[20px] w-full max-w-[408px] mx-auto h-[154px] min-h-[154px] mb-6 border-t-2 border-x-2 border-dashed border-[#84cc16] border-b-0 shadow-[0_-6px_20px_rgba(0,0,0,0.03)] cursor-pointer select-none -mt-[32px] flex flex-col items-center justify-center text-center group"
        style="z-index: ${(addCardIndex + 1) * 10}; position: sticky; top: 0px; transform-origin: center top;">
        
        <div class="card-inner-content transition-opacity duration-150 flex flex-col items-center justify-center gap-2.5 w-full">
          <div class="w-11 h-11 rounded-2xl bg-[#84cc16] text-[#142314] flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform">
            <span class="material-symbols-rounded text-3xl font-black">add</span>
          </div>
          <div class="space-y-0.5">
            <h3 class="text-base font-black text-[#193217] tracking-tight leading-tight">
              Agregar Nueva Tarjeta
            </h3>
            <p class="text-[11px] font-bold text-[#406838] opacity-80 leading-none">
              Efectivo, Débito, Crédito o Billetera
            </p>
          </div>
        </div>
      </div>
    `;

    listContainer.innerHTML = cardsHTML + addCardHTML;
  }

  // 3. Mostrar Vista Dedicada #view-tarjetas y Ocultar Dashboard
  const topHeader = document.getElementById('mobile-top-header');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewTarjetas = document.getElementById('view-tarjetas');

  if (topHeader) topHeader.classList.add('hidden');
  if (viewDashboard && viewTarjetas) {
    viewDashboard.classList.add('hidden');
    viewTarjetas.classList.remove('hidden');
    viewTarjetas.classList.add('flex');
    const container = document.getElementById('modal-pm-summary-cards-container');
    if (container) container.scrollTop = 0;
    setTimeout(() => initCardsStackScroll(), 100);
  }
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

// ================================================================
// VOLVER AL DASHBOARD PRINCIPAL DESDE LA VISTA DEDICADA DE TARJETAS
// ================================================================
export function showDashboardView() {
  const topHeader = document.getElementById('mobile-top-header');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewTarjetas = document.getElementById('view-tarjetas');

  if (topHeader) topHeader.classList.remove('hidden');
  if (viewDashboard && viewTarjetas) {
    viewTarjetas.classList.add('hidden');
    viewTarjetas.classList.remove('flex');
    viewDashboard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ================================================================
// ABRIR ACCIÓN / MODAL PARA CREAR NUEVA TARJETA O BILLETERA
// ================================================================
export function openCreatePaymentMethodModal() {
  if (typeof window.showNotification === 'function') {
    window.showNotification('Crear nueva tarjeta o billetera', 'info');
  } else {
    alert('Crear nueva tarjeta o billetera');
  }
}

// Global window mappings
window.openPaymentMethodsSummaryModal = openPaymentMethodsSummaryModal;
window.openCreditCardDetailModal = openCreditCardDetailModal;
window.openCardStatementsHistoryModal = openCardStatementsHistoryModal;
window.restoreCurrentCardCycle = restoreCurrentCardCycle;
window.selectStatementCycle = selectStatementCycle;
window.showDashboardView = showDashboardView;
window.openCreatePaymentMethodModal = openCreatePaymentMethodModal;

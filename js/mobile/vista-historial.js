import { appState, currentTab, searchTerm, formatCurrency, db, appId, currentWalletId } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { openEditExpenseModal, openEditIncomeModal } from "./vista-registro.js";
import { openDetailItemBreakdownModal } from "./modal-asignacion.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { TRASH_ANIMATION_DATA } from "../Animaciones/trash-data.js";

export let currentDetailExpenseId = null;

// ================================================================
// SISTEMA DE GESTO SWIPE-TO-DELETE DE ALTO RENDIMIENTO (EXPANDING WIDTH)
// ================================================================
let activeSwipeCard = null;
let activeSwipeSlot = null;
let activeSwipeId = null;
let activeSwipeType = null;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeIsHorizontal = null;
let swipeHasMoved = false;
let openSwipeCardId = null;
let swipeBaseWidth = 0;
let suppressClickUntil = 0;

export function initHistorySwipeGestures() {
  if (window._historySwipeGesturesInitialized) return;
  window._historySwipeGesturesInitialized = true;

  const onStart = (e) => {
    // Si se hizo click en el botón de borrar, no interferir
    if (e.target.closest('[data-mov-delete-btn]')) return;

    const card = e.target.closest('[data-mov-card-id]');
    if (!card) return;

    const id = card.dataset.movCardId;
    const type = card.dataset.movType;

    // Si había otra tarjeta abierta y tocamos una diferente, la cerramos
    if (openSwipeCardId && openSwipeCardId !== id) {
      const prevSlot = document.getElementById(`mov-delete-slot-${openSwipeCardId}`);
      if (prevSlot) {
        prevSlot.style.transition = 'width 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease, margin-left 240ms ease';
        prevSlot.style.width = '0px';
        prevSlot.style.opacity = '0';
        prevSlot.style.marginLeft = '0px';
      }
      openSwipeCardId = null;
    }

    activeSwipeCard = card;
    activeSwipeId = id;
    activeSwipeType = type;
    activeSwipeSlot = document.getElementById(`mov-delete-slot-${id}`);

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    swipeStartX = clientX;
    swipeStartY = clientY;
    swipeIsHorizontal = null;
    swipeHasMoved = false;

    // Determinar ancho base si ya estaba abierta
    swipeBaseWidth = activeSwipeSlot ? (parseFloat(activeSwipeSlot.style.width) || 0) : 0;

    // Desactivar transiciones durante el arrastre directo
    if (activeSwipeSlot) {
      activeSwipeSlot.style.transition = 'none';
    }
  };

  const onMove = (e) => {
    if (!activeSwipeCard || !activeSwipeSlot) return;

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const diffX = clientX - swipeStartX;
    const diffY = clientY - swipeStartY;

    if (swipeIsHorizontal === null) {
      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        swipeIsHorizontal = Math.abs(diffX) > Math.abs(diffY);
        if (!swipeIsHorizontal) {
          // Desplazamiento vertical: restaurar ancho y cancelar swipe
          activeSwipeSlot.style.transition = 'width 200ms ease, opacity 200ms ease, margin-left 200ms ease';
          activeSwipeSlot.style.width = swipeBaseWidth ? `${swipeBaseWidth}px` : '0px';
          activeSwipeSlot.style.opacity = swipeBaseWidth ? '1' : '0';
          activeSwipeSlot.style.marginLeft = swipeBaseWidth ? '6px' : '0px';
          activeSwipeCard = null;
          activeSwipeSlot = null;
          return;
        }
      }
    }

    if (!swipeIsHorizontal) return;

    if (Math.abs(diffX) > 4) {
      swipeHasMoved = true;
    }

    if (e.cancelable && e.type && e.type.startsWith('touch')) {
      e.preventDefault();
    }

    // Ensanchar dinámicamente el contenedor del botón de eliminar (de 0px a 90px)
    const targetWidth = Math.max(0, Math.min(90, swipeBaseWidth - diffX));

    activeSwipeSlot.style.width = `${targetWidth}px`;
    activeSwipeSlot.style.opacity = `${Math.min(1, targetWidth / 25)}`;
    activeSwipeSlot.style.marginLeft = targetWidth > 0 ? '6px' : '0px';
  };

  const onEnd = () => {
    if (!activeSwipeCard || !activeSwipeSlot) return;

    const slot = activeSwipeSlot;
    const id = activeSwipeId;
    const moved = swipeHasMoved;

    if (moved) {
      suppressClickUntil = Date.now() + 450;
    }

    // Restaurar animación fluida de resorte para el cierre/apertura
    slot.style.transition = 'width 280ms cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 240ms ease, margin-left 280ms ease';

    const currentWidth = parseFloat(slot.style.width) || 0;

    if (currentWidth >= 32) {
      // Dejar ensanchado a 80px mostrando la papelera
      slot.style.width = '80px';
      slot.style.opacity = '1';
      slot.style.marginLeft = '6px';
      openSwipeCardId = id;
      if (navigator.vibrate) navigator.vibrate(25);
      // Reproducir animación una vez al abrir
      const lottieEl = document.getElementById(`lottie-trash-${id}`);
      if (lottieEl && lottieEl._lottieInstance) {
        lottieEl._lottieInstance.goToAndPlay(0, true);
      }
    } else {
      // Cerrar suavemente
      slot.style.width = '0px';
      slot.style.opacity = '0';
      slot.style.marginLeft = '0px';
      if (openSwipeCardId === id) openSwipeCardId = null;
    }

    activeSwipeCard = null;
    activeSwipeSlot = null;
    activeSwipeId = null;
    swipeIsHorizontal = null;
    swipeHasMoved = false;
  };

  if ('PointerEvent' in window) {
    document.addEventListener('pointerdown', onStart, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd, { passive: true });
    window.addEventListener('pointercancel', onEnd, { passive: true });
  } else {
    document.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
  }
}

export async function deleteMovementFromSwipe(e, type, id) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  if (!confirm('¿Deseas eliminar este movimiento definitivamente?')) {
    const slot = document.getElementById(`mov-delete-slot-${id}`);
    if (slot) {
      slot.style.transition = 'width 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease, margin-left 240ms ease';
      slot.style.width = '0px';
      slot.style.opacity = '0';
      slot.style.marginLeft = '0px';
    }
    if (openSwipeCardId === id) openSwipeCardId = null;
    return;
  }

  try {
    const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
    if (type === 'expense') {
      const updated = (appState.expenses || []).filter((item, idx) => {
        const fallbackId = `exp_fallback_${idx}_${item.date}_${item.amount}`;
        if (item.id === id || fallbackId === id) return false;
        if ((!item.id || item.id === 'undefined') && (id === 'undefined' || id.includes('undefined'))) return false;
        return true;
      });
      await updateDoc(walletRef, { expenses: updated });
    } else {
      const updatedParticipants = JSON.parse(JSON.stringify(appState.participants || []));
      updatedParticipants.forEach(p => {
        if (p.incomes) {
          p.incomes = p.incomes.filter((inc, idx) => {
            const fallbackId = `inc_fallback_${idx}_${inc.date}_${inc.amount}`;
            if (inc.id === id || fallbackId === id) return false;
            if ((!inc.id || inc.id === 'undefined') && (id === 'undefined' || id.includes('undefined'))) return false;
            return true;
          });
        }
        p.budget = (p.incomes || []).reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
      });
      await updateDoc(walletRef, { participants: updatedParticipants });
    }
  } catch (err) {
    console.error('Error al eliminar movimiento:', err);
    alert('Error al eliminar el movimiento.');
  }
}

export function handleMovementCardClick(e, type, id, hasItems) {
  if (Date.now() < suppressClickUntil) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    return;
  }

  const slot = document.getElementById(`mov-delete-slot-${id}`);
  if (slot && parseFloat(slot.style.width) > 0) {
    slot.style.transition = 'width 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease, margin-left 240ms ease';
    slot.style.width = '0px';
    slot.style.opacity = '0';
    slot.style.marginLeft = '0px';
    if (openSwipeCardId === id) openSwipeCardId = null;
    return;
  }

  if (type === 'expense') {
    if (hasItems) {
      openTransactionDetailModal(id);
    } else {
      openEditExpenseModal(id);
    }
  } else {
    openEditIncomeModal(id);
  }
}

export function renderHistoryList(monthlyExpenses) {
  const container = document.getElementById('mobile-history-list');
  if (!container) return;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let items = [];

  if (currentTab === 'all' || currentTab === 'expenses') {
    monthlyExpenses.forEach((e, idx) => {
      if (e.isProjected && e.date > todayStr) {
        return;
      }

      const hasItems = !!(e.items && Array.isArray(e.items) && e.items.length > 0);
      const itemId = e.id || `exp_fallback_${idx}_${e.date}_${e.amount}`;

      items.push({
        id: itemId,
        type: 'expense',
        description: e.description || 'Gasto sin concepto',
        amount: parseFloat(e.amount) || 0,
        date: e.date || '',
        createdAt: e.createdAt || e.dateCreated || '',
        category: e.category || 'General',
        payerId: e.payerId,
        paymentMethod: e.paymentMethod || 'Efectivo',
        isFixed: e.isFixed,
        isShared: e.type === 'shared' || !e.type,
        hasItems: hasItems,
        items: e.items || [],
        guests: e.guests || []
      });
    });
  }

  if (currentTab === 'all' || currentTab === 'incomes') {
    (appState.participants || []).forEach(p => {
      (p.incomes || []).forEach(inc => {
        if (inc.date) {
          items.push({
            id: inc.id,
            type: 'income',
            description: inc.name || inc.description || `Ingreso de ${p.name}`,
            amount: parseFloat(inc.amount) || 0,
            date: inc.date,
            createdAt: inc.createdAt || inc.dateCreated || '',
            category: 'Ingreso',
            payerName: p.name,
            paymentMethod: 'Depósito/Efectivo',
            hasItems: false
          });
        }
      });
    });
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    items = items.filter(i =>
      i.description.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term)
    );
  }

  // Ordenamiento cronológico estricto: por fecha y hora de creación (más reciente primero)
  items.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    const getTimestamp = (item) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.id) {
        const num = item.id.replace(/^\D+/g, '');
        if (num && !isNaN(Number(num))) return Number(num);
      }
      return 0;
    };
    return getTimestamp(b) - getTimestamp(a);
  });

  const countBadge = document.getElementById('history-total-count');
  if (countBadge) countBadge.textContent = `${items.length} registros`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 bg-white rounded-2xl border border-slate-100">
        <i class="fas fa-inbox text-slate-300 text-2xl mb-2"></i>
        <p class="text-xs text-slate-400 font-medium">No se encontraron movimientos para este período.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, idx) => {
    const isExpense = item.type === 'expense';
    const payer = (appState.participants || []).find(p => p.id === item.payerId)?.name || item.payerName || 'General';

    const dateObj = new Date(item.date + "T00:00:00Z");
    const dayNum = dateObj.getUTCDate() || 1;
    const monthShort = dateObj.toLocaleString("es-ES", { month: "short", timeZone: "UTC" }).toUpperCase().replace(".", "");

    let dateBoxClass = "bg-slate-50 border-slate-200 text-slate-600";
    let typeBadge = "";

    if (!isExpense) {
      dateBoxClass = "bg-emerald-50 border-emerald-200 text-emerald-600";
    } else if (item.isFixed) {
      dateBoxClass = "bg-purple-50 border-purple-200 text-purple-600";
      typeBadge = `<span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-600 text-[8px]" title="Gasto Fijo"><i class="fas fa-sync-alt"></i></span>`;
    } else if (item.hasItems) {
      dateBoxClass = "bg-indigo-50 border-indigo-200 text-indigo-600";
      typeBadge = `<span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[8px]" title="Lista de Ítems"><i class="fas fa-list-ul"></i></span>`;
    } else if (item.isShared) {
      dateBoxClass = "bg-orange-50 border-orange-200 text-orange-600";
      typeBadge = `<span class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[8px]" title="Compartido"><i class="fas fa-users"></i></span>`;
    }

    const staggerDelay = Math.min(idx * 35, 280);

    return `
      <div class="animate-item-enter relative overflow-hidden rounded-2xl mb-2 select-none flex items-stretch" id="mov-row-container-${item.id}" style="animation-delay: ${staggerDelay}ms;">
        <!-- Tarjeta Frontal Principal -->
        <div id="mov-card-content-${item.id}"
          data-mov-card-id="${item.id}"
          data-mov-type="${item.type}"
          onclick="handleMovementCardClick(event, '${item.type}', '${item.id}', ${item.hasItems})"
          style="touch-action: pan-y !important; user-select: none; -webkit-user-select: none;"
          class="flex-1 min-w-0 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 cursor-pointer">
          
          <div class="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
            <div class="shrink-0">
              <div class="w-11 h-11 flex flex-col items-center justify-center rounded-xl border ${dateBoxClass} shadow-sm">
                <span class="text-[9px] font-bold uppercase leading-none opacity-80">${monthShort}</span>
                <span class="text-base font-black leading-tight">${dayNum}</span>
              </div>
            </div>
            
            <div class="min-w-0 flex-1">
              <div class="flex items-center">
                <h4 class="font-extrabold text-xs text-slate-900 truncate leading-tight">${item.description}</h4>
                ${typeBadge}
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                <span class="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-[9px]">${item.category}</span>
                <span>•</span>
                <span class="truncate max-w-[90px]">${payer}</span>
              </div>
            </div>
          </div>

          <div class="text-right shrink-0 pointer-events-none">
            <span class="font-black text-xs ${isExpense ? 'text-slate-900' : 'text-emerald-600'} block">
              ${isExpense ? '-' : '+'} ${formatCurrency(item.amount)}
            </span>
            <span class="text-[9px] text-slate-400 font-medium">${item.paymentMethod}</span>
          </div>
        </div>

        <!-- Contenedor del Botón Eliminar que se ensancha dinámicamente -->
        <div id="mov-delete-slot-${item.id}"
          data-mov-delete-btn="true"
          onclick="deleteMovementFromSwipe(event, '${item.type}', '${item.id}')"
          class="shrink-0 overflow-hidden bg-[#ffe4e6] hover:bg-[#fecdd3] active:bg-[#fda4af] border border-rose-200/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none shadow-inner"
          style="width: 0px; opacity: 0; margin-left: 0px;">
          <div id="lottie-trash-${item.id}" class="w-8 h-8 pointer-events-none flex items-center justify-center -mb-0.5">
            <span class="material-symbols-rounded text-2xl text-rose-700 pointer-events-none">delete</span>
          </div>
          <span class="text-[9px] font-black text-rose-800 uppercase tracking-wider mt-0.5 pointer-events-none select-none whitespace-nowrap">Borrar</span>
        </div>
      </div>
    `;
  }).join('');

  // Inicializar gestos de arrastre nativos en la lista
  initHistorySwipeGestures();

  // Inicializar animaciones Lottie instantáneas en cada tarjeta
  if (window.lottie) {
    items.forEach(item => {
      const el = document.getElementById(`lottie-trash-${item.id}`);
      if (el) {
        el.innerHTML = '';
        el._lottieInstance = window.lottie.loadAnimation({
          container: el,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: TRASH_ANIMATION_DATA
        });
      }
    });
  }
}

export function openTransactionDetailModal(expenseId) {
  const exp = (appState.expenses || []).find(e => e.id === expenseId);
  if (!exp) return;

  currentDetailExpenseId = expenseId;

  const titleEl = document.getElementById('detail-modal-title');
  const subtitleEl = document.getElementById('detail-modal-subtitle');
  if (titleEl) titleEl.textContent = exp.description || 'Gasto';
  if (subtitleEl) {
    const typeLabel = exp.type === 'personal' ? 'Personal' : 'Compartido';
    subtitleEl.textContent = `${typeLabel} • ${exp.date || '--'}`;
  }

  const amountEl = document.getElementById('detail-amount');
  const catBadge = document.getElementById('detail-category-badge');
  const typeBadge = document.getElementById('detail-type-badge');
  const itemsPill = document.getElementById('detail-items-pill-badge');
  const payerEl = document.getElementById('detail-payer-info');
  const dateEl = document.getElementById('detail-date-info');
  const pmEl = document.getElementById('detail-pm-name');

  const items = exp.items || [];
  if (amountEl) amountEl.textContent = formatCurrency(exp.amount);
  if (catBadge) catBadge.textContent = exp.category || 'General';
  if (typeBadge) typeBadge.textContent = exp.type === 'personal' ? 'Personal' : 'Compartido';
  if (itemsPill) itemsPill.textContent = items.length > 0 ? `${items.length} ítems` : 'Gasto simple';

  const payerName = (appState.participants || []).find(p => p.id === exp.payerId)?.name || 'Desconocido';
  if (payerEl) payerEl.innerHTML = `Pagado por: <strong>${payerName}</strong>`;
  if (dateEl) dateEl.textContent = exp.date || '--';
  if (pmEl) pmEl.textContent = exp.paymentMethod || 'Efectivo';

  const expenseGuests = (exp.guests && Array.isArray(exp.guests)) ? exp.guests : (exp.guestName ? [exp.guestName] : []);

  const allMembersList = [
    ...(appState.participants || []).map(p => ({
      id: p.id,
      name: p.name,
      initials: (p.name || 'U').substring(0, 2).toUpperCase(),
      isGuest: false
    })),
    ...expenseGuests.map(g => {
      const cleanName = g.trim();
      const gKey = `guest_${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
      return {
        id: gKey,
        name: cleanName,
        initials: cleanName.substring(0, 2).toUpperCase(),
        isGuest: true
      };
    })
  ];

  function resolveMemberInfo(key) {
    const found = allMembersList.find(m => m.id === key);
    if (found) return found;

    const numMatch = String(key).match(/\d+/);
    if (numMatch && expenseGuests[parseInt(numMatch[0])]) {
      const gName = expenseGuests[parseInt(numMatch[0])];
      return { id: key, name: gName, initials: gName.substring(0, 2).toUpperCase(), isGuest: true };
    }
    if (String(key).startsWith('guest_') || String(key).startsWith('guest-')) {
      const rawName = String(key).replace('guest_', '').replace('guest-', '').replace(/_/g, ' ');
      const matched = expenseGuests.find(g => g.toLowerCase() === rawName.toLowerCase());
      const gName = matched || rawName;
      return { id: key, name: gName, initials: gName.substring(0, 2).toUpperCase(), isGuest: true };
    }
    return { id: key, name: key, initials: String(key).substring(0, 2).toUpperCase(), isGuest: true };
  }

  const memberStats = {};
  allMembersList.forEach(m => {
    memberStats[m.id] = { info: m, itemCount: 0, totalCost: 0 };
  });

  if (items.length > 0) {
    items.forEach(it => {
      const qty = parseFloat(it.quantity) || 1;
      const unitPrice = parseFloat(it.amount) || 0;
      const itemTotalCost = qty * unitPrice;
      const assignments = it.assignments || {};
      const assignedKeys = Object.keys(assignments).filter(k => (parseFloat(assignments[k]) || 0) > 0);

      if (assignedKeys.length > 0) {
        assignedKeys.forEach(k => {
          const uQty = parseFloat(assignments[k]) || 0;
          const info = resolveMemberInfo(k);
          if (!memberStats[info.id]) memberStats[info.id] = { info, itemCount: 0, totalCost: 0 };
          memberStats[info.id].itemCount += 1;
          memberStats[info.id].totalCost += uQty * unitPrice;
        });
      } else if (it.assignedTo && it.assignedTo !== 'all') {
        const info = resolveMemberInfo(it.assignedTo);
        if (!memberStats[info.id]) memberStats[info.id] = { info, itemCount: 0, totalCost: 0 };
        memberStats[info.id].itemCount += 1;
        memberStats[info.id].totalCost += itemTotalCost;
      } else {
        const perMemberCost = itemTotalCost / (allMembersList.length || 1);
        allMembersList.forEach(m => {
          memberStats[m.id].itemCount += 1;
          memberStats[m.id].totalCost += perMemberCost;
        });
      }
    });
  } else {
    const perMemberCost = (parseFloat(exp.amount) || 0) / (allMembersList.length || 1);
    allMembersList.forEach(m => {
      memberStats[m.id].itemCount = 1;
      memberStats[m.id].totalCost = perMemberCost;
    });
  }

  const participantsContainer = document.getElementById('detail-participants-container');
  const participantsCountBadge = document.getElementById('detail-participants-count-badge');
  const activeMembersWithCosts = Object.values(memberStats).filter(st => st.totalCost > 0 || st.itemCount > 0);

  if (participantsCountBadge) {
    participantsCountBadge.textContent = `${activeMembersWithCosts.length} miembros`;
  }

  if (participantsContainer) {
    participantsContainer.innerHTML = activeMembersWithCosts.map(st => `
      <div class="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:bg-slate-100/60 transition-all">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-xl ${st.info.isGuest ? 'bg-amber-500' : 'bg-slate-900'} text-white flex items-center justify-center font-black text-[10px] shrink-0">
            ${st.info.initials}
          </div>
          <div class="truncate">
            <h4 class="text-xs font-extrabold text-slate-900 truncate">${st.info.name}</h4>
            <p class="text-[10px] text-slate-400 font-bold">${st.itemCount} ${st.itemCount === 1 ? 'ítem' : 'ítems'}</p>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="text-xs font-black text-slate-900">${formatCurrency(st.totalCost)}</span>
        </div>
      </div>
    `).join('');
  }

  const itemsCountBadge = document.getElementById('detail-items-count-badge');
  const itemsContainer = document.getElementById('detail-items-container');

  if (itemsCountBadge) itemsCountBadge.textContent = `${items.length} ítems`;

  if (itemsContainer) {
    if (items.length > 0) {
      itemsContainer.innerHTML = items.map((it, idx) => {
        const qty = parseFloat(it.quantity) || 1;
        const unitPrice = parseFloat(it.amount) || 0;
        const totalItemCost = qty * unitPrice;

        let assignBadgesHtml = '';
        const assignments = it.assignments || {};
        const assignedKeys = Object.keys(assignments).filter(k => (parseFloat(assignments[k]) || 0) > 0);

        if (assignedKeys.length > 0) {
          assignBadgesHtml = assignedKeys.map(k => {
            const uQty = assignments[k];
            const info = resolveMemberInfo(k);
            return `<span class="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${info.isGuest ? 'bg-amber-100/80 text-amber-900' : 'bg-slate-100 text-slate-700'}">${info.name} (${uQty} u.)</span>`;
          }).join(' ');
        } else if (it.assignedTo && it.assignedTo !== 'all') {
          const info = resolveMemberInfo(it.assignedTo);
          assignBadgesHtml = `<span class="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${info.isGuest ? 'bg-amber-100/80 text-amber-900' : 'bg-slate-100 text-slate-700'}">${info.name} (${qty} u.)</span>`;
        } else {
          assignBadgesHtml = `<span class="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-500">Para todos</span>`;
        }

        return `
          <div onclick="openDetailItemBreakdownModal(${idx}, '${expenseId}')" class="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-300 hover:bg-slate-50/50 active:scale-98 transition-all group">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="w-4 h-4 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 text-[9px] font-black flex items-center justify-center shrink-0 transition-colors">
                  ${idx + 1}
                </span>
                <span class="text-xs font-extrabold text-slate-900 truncate">${it.desc || 'Ítem'}</span>
              </div>
              <div class="mt-1 pl-5">
                ${assignBadgesHtml}
              </div>
            </div>

            <div class="text-right shrink-0 flex items-center gap-2">
              <div>
                <span class="text-xs font-black text-slate-900 block">${formatCurrency(totalItemCost)}</span>
                <span class="text-[10px] text-slate-400 font-semibold block">${qty} × ${formatCurrency(unitPrice)}</span>
              </div>
              <i class="fas fa-chevron-right text-[8px] text-slate-300 group-hover:text-emerald-600 transition-colors"></i>
            </div>
          </div>
        `;
      }).join('');
    } else {
      itemsContainer.innerHTML = `
        <div class="text-center py-4 bg-slate-50 rounded-2xl text-xs text-slate-400 font-medium">
          Gasto registrado como monto global.
        </div>
      `;
    }
  }

  openModal('modal-transaction-detail');
}

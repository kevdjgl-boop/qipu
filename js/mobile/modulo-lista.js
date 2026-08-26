import { formatCurrency } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { normalizeItemAssignments, getAssignmentSummaryLabel } from "./modal-asignacion.js";
import { mobileExpenseGuests } from "./vista-registro.js";

export let mobileExpenseItems = [];
export let itemPendingDeleteId = null;

// Gestos táctiles de deslizamiento
let swipeTouchStartX = 0;
let swipeTouchStartY = 0;
let swipeActiveItemId = null;
let swipeIsHorizontal = null;

export function addMobileItemRow() {
  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    desc: '',
    quantity: 1,
    amount: '',
    assignedTo: 'all',
    assignments: {}
  };
  mobileExpenseItems.push(newItem);
  renderMobileItemsList();
  setTimeout(() => {
    const container = document.getElementById('mobile-items-scroll-wrapper') || document.getElementById('mobile-items-container');
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, 60);
}

export function removeMobileItemRow(id) {
  mobileExpenseItems = mobileExpenseItems.filter(item => item.id !== id);
  renderMobileItemsList();
  renderListTotalBadge();
}

let previousListTotal = null;

// Renderizador de dígitos animados escalonados (Utilizado exclusivamente en el Monto superior)
export function renderAnimatedDigits(text, prefix = '') {
  let digitIndex = 0;
  const chars = String(text).split('').map(char => {
    if (/[0-9.,]/.test(char)) {
      const delay = digitIndex * 32;
      digitIndex++;
      return `<span class="animate-digit-grow" style="animation-delay: ${delay}ms;">${char}</span>`;
    }
    return `<span>${char === ' ' ? '&nbsp;' : char}</span>`;
  }).join('');

  return `${prefix}${chars}`;
}

export function updateMobileItemField(id, field, value) {
  const item = mobileExpenseItems.find(i => i.id === id);
  if (item) {
    item[field] = value;
    
    // Subtotal estático en la fila del ítem (sin animación en la lista)
    const qty = parseFloat(item.quantity) || 1;
    const unitPrice = parseFloat(item.amount) || 0;
    const totalCost = (qty * unitPrice).toFixed(2);
    
    const badgeEl = document.getElementById(`item-total-badge-${id}`);
    if (badgeEl) {
      badgeEl.textContent = `Total: S/ ${totalCost}`;
    }

    renderListTotalBadge();
  }
}

export function renderListTotalBadge() {
  let total = 0;
  mobileExpenseItems.forEach(item => {
    const q = parseFloat(item.quantity) || 1;
    const p = parseFloat(item.amount) || 0;
    total += (q * p);
  });

  const formatted = total > 0 ? total.toFixed(2) : '';
  const totalChanged = (previousListTotal !== formatted);
  previousListTotal = formatted;

  // 1. Sincronizar y animar por dígito exclusivamente en el Monto principal (#exp-amount) SOLO si el monto cambió
  const expAmountInput = document.getElementById('exp-amount');
  const animatedDisplay = document.getElementById('exp-amount-animated-display');

  if (expAmountInput) {
    if (expAmountInput.value !== formatted) {
      expAmountInput.value = formatted;
      expAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
      expAmountInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (animatedDisplay) {
      if (total > 0) {
        animatedDisplay.classList.remove('hidden');
        if (totalChanged) {
          animatedDisplay.innerHTML = renderAnimatedDigits(formatted, '');
        }
        expAmountInput.classList.add('text-transparent');
      } else {
        animatedDisplay.classList.add('hidden');
        animatedDisplay.innerHTML = '';
        expAmountInput.classList.remove('text-transparent');
      }
    }
  }

  // 2. Actualizar badge general si existe
  const badge = document.getElementById('list-items-total-badge');
  if (badge) {
    badge.textContent = `Total: ${formatCurrency(total)}`;
  }

  return total;
}

export function renderMobileItemsList() {
  const container = document.getElementById('mobile-items-container');
  if (!container) return;

  if (mobileExpenseItems.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-white/90 rounded-[8px] shadow-2xs">
        <p class="text-xs text-slate-800 font-extrabold">No hay productos en la lista.</p>
        <p class="text-[10px] text-slate-500 mt-0.5">Toca "+ Agregar producto" para empezar.</p>
      </div>
    `;
    renderListTotalBadge();
    return;
  }

  container.innerHTML = mobileExpenseItems.map((item) => {
    const qty = parseFloat(item.quantity) || 1;
    const unitPrice = parseFloat(item.amount) || 0;
    const totalCost = (qty * unitPrice).toFixed(2);
    const assignLabel = getAssignmentSummaryLabel(item, mobileExpenseGuests);

    return `
      <div class="rounded-[8px] overflow-hidden shadow-2xs select-none transition-all mb-2" id="item-row-${item.id}"
        ontouchstart="handleItemSwipeStart(event, '${item.id}')"
        ontouchmove="handleItemSwipeMove(event, '${item.id}')"
        ontouchend="handleItemSwipeEnd(event, '${item.id}')">

        <!-- Fila Superior: 3 Bloques Blancos Continuos sin Gap, Altura 36px, Esquinas 8px -->
        <div class="flex items-center">
          <div class="grid grid-cols-[1fr_56px_90px] gap-0 flex-1 min-w-0 h-[36px] bg-white rounded-t-[8px]">
            <!-- Bloque 1: Producto (bg-white, rounded-tl-[8px], h-36px) -->
            <div class="bg-white rounded-tl-[8px] flex items-center h-[36px] px-3.5">
              <input type="text" placeholder="Producto" value="${item.desc || ''}"
                name="item_desc_${item.id}"
                autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                data-item-field="desc"
                data-item-id="${item.id}"
                oninput="updateMobileItemField('${item.id}', 'desc', this.value)"
                class="w-full bg-transparent border-0 text-xs font-black text-slate-950 placeholder:text-slate-400 focus:outline-none outline-none leading-none" />
            </div>

            <!-- Bloque 2: Cantidad (bg-white, centrado, h-36px) -->
            <div class="bg-white flex items-center justify-center h-[36px]">
              <input type="number" min="1" max="999" step="1" value="${qty}"
                name="item_qty_${item.id}" inputmode="numeric"
                autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                data-item-field="quantity"
                data-item-id="${item.id}"
                onfocus="this.select()"
                oninput="updateMobileItemField('${item.id}', 'quantity', this.value)"
                class="w-full bg-transparent border-0 text-xs font-black text-slate-950 text-center focus:outline-none outline-none leading-none" />
            </div>

            <!-- Bloque 3: P. Und (bg-white, rounded-tr-[8px], alineado a la derecha, h-36px) -->
            <div class="bg-white rounded-tr-[8px] flex items-center justify-end h-[36px] px-3.5">
              <input type="number" min="0.01" step="0.01" placeholder="0.00" value="${unitPrice > 0 ? unitPrice : ''}"
                name="item_amount_${item.id}" inputmode="decimal"
                autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other"
                data-item-field="amount"
                data-item-id="${item.id}"
                onfocus="this.select()"
                oninput="updateMobileItemField('${item.id}', 'amount', this.value)"
                class="w-full bg-transparent border-0 text-xs font-black text-slate-950 text-right focus:outline-none outline-none leading-none" />
            </div>
          </div>

          <!-- Botón Eliminar Expandible (Deslizamiento) -->
          <div id="delete-slot-${item.id}"
            class="flex items-center justify-end overflow-hidden transition-all duration-200 shrink-0 bg-white h-[36px]"
            style="width: 0px; opacity: 0;">
            <button type="button"
              onclick="confirmDeleteMobileItem('${item.id}', '${(item.desc || 'este producto').replace(/'/g, "\\'")}')"
              class="w-8 h-8 mr-2 bg-rose-500 hover:bg-rose-600 active:scale-90 text-white rounded-[8px] flex items-center justify-center text-xs shadow-2xs shrink-0">
              <span class="material-symbols-rounded text-base">delete</span>
            </button>
          </div>
        </div>

        <!-- Fila Inferior: Sub-barra con Color ECF9E1 y bordes redondeados inferiores de 8px -->
        <div class="bg-[#ECF9E1] rounded-b-[8px] px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-900 select-none">
          <button type="button" onclick="openItemAssignmentModal('${item.id}')"
            class="text-[11px] font-black text-slate-900 hover:text-emerald-950 transition-colors text-left truncate max-w-[190px] cursor-pointer">
            ${assignLabel}
          </button>
          <span id="item-total-badge-${item.id}" class="text-[11px] font-black text-slate-900">
            Total: S/ ${totalCost}
          </span>
        </div>
      </div>
    `;
  }).join('');

  renderListTotalBadge();
}

export function confirmDeleteMobileItem(itemId, desc) {
  itemPendingDeleteId = itemId;
  const descEl = document.getElementById('confirm-delete-item-desc');
  if (descEl) descEl.textContent = desc || 'Producto';
  openModal('modal-confirm-delete-item');
}

export function handleItemSwipeStart(e, itemId) {
  swipeTouchStartX = e.touches[0].clientX;
  swipeTouchStartY = e.touches[0].clientY;
  swipeActiveItemId = itemId;
  swipeIsHorizontal = null;
}

export function handleItemSwipeMove(e, itemId) {
  if (swipeActiveItemId !== itemId) return;
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const diffX = currentX - swipeTouchStartX;
  const diffY = currentY - swipeTouchStartY;

  if (swipeIsHorizontal === null) {
    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      swipeIsHorizontal = Math.abs(diffX) > Math.abs(diffY);
    }
  }

  if (!swipeIsHorizontal) return;

  const slot = document.getElementById(`delete-slot-${itemId}`);
  if (!slot) return;

  if (diffX < 0) {
    const progress = Math.min(42, Math.abs(diffX));
    slot.style.width = `${progress}px`;
    slot.style.opacity = `${progress / 42}`;
  } else {
    slot.style.width = '0px';
    slot.style.opacity = '0';
  }
}

export function handleItemSwipeEnd(e, itemId) {
  if (swipeActiveItemId !== itemId) return;
  const slot = document.getElementById(`delete-slot-${itemId}`);
  if (slot) {
    const currentWidth = parseFloat(slot.style.width) || 0;
    if (currentWidth >= 20) {
      slot.style.width = '42px';
      slot.style.opacity = '1';
    } else {
      slot.style.width = '0px';
      slot.style.opacity = '0';
    }
  }
  swipeActiveItemId = null;
  swipeIsHorizontal = null;
}

export function setMobileExpenseItems(items) {
  mobileExpenseItems = items;
}

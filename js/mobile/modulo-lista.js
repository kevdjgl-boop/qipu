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
}

export function removeMobileItemRow(id) {
  mobileExpenseItems = mobileExpenseItems.filter(item => item.id !== id);
  renderMobileItemsList();
}

export function updateMobileItemField(id, field, value) {
  const item = mobileExpenseItems.find(i => i.id === id);
  if (item) {
    item[field] = value;
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
  const badge = document.getElementById('list-items-total-badge');
  if (badge) badge.textContent = `Total: ${formatCurrency(total)}`;
  return total;
}

export function renderMobileItemsList() {
  const container = document.getElementById('mobile-items-container');
  if (!container) return;

  if (mobileExpenseItems.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-white/80 rounded-2xl shadow-2xs">
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
      <div class="space-y-1.5 bg-transparent select-none" id="item-row-${item.id}"
        ontouchstart="handleItemSwipeStart(event, '${item.id}')"
        ontouchmove="handleItemSwipeMove(event, '${item.id}')"
        ontouchend="handleItemSwipeEnd(event, '${item.id}')">

        <!-- Fila Principal: Inputs + Botón de Eliminar Expandible hacia la Izquierda -->
        <div class="flex items-center gap-2">
          <!-- Inputs del Producto (se ajustan suavemente) -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <!-- Nombre del Producto (Píldora Blanca) -->
            <input type="text" placeholder="Producto" value="${item.desc || ''}"
              oninput="updateMobileItemField('${item.id}', 'desc', this.value)"
              class="flex-1 min-w-0 h-10 bg-white border-0 rounded-2xl px-4 text-xs font-black text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-700 outline-none shadow-2xs" />

            <!-- Cantidad (Píldora Blanca, w-14, max 99) -->
            <input type="number" min="1" max="99" step="1" value="${qty}"
              oninput="updateMobileItemField('${item.id}', 'quantity', this.value)"
              class="w-14 h-10 bg-white border-0 rounded-2xl text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-emerald-700 outline-none shadow-2xs shrink-0" />

            <!-- Total / Monto (Píldora Blanca, w-24) -->
            <input type="number" min="0.01" step="0.01" placeholder="0.00" value="${unitPrice > 0 ? unitPrice : ''}"
              oninput="updateMobileItemField('${item.id}', 'amount', this.value)"
              class="w-24 h-10 bg-white border-0 rounded-2xl text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-emerald-700 outline-none shadow-2xs shrink-0" />
          </div>

          <!-- Botón Eliminar Expandible (Aparece de derecha a izquierda) -->
          <div id="delete-slot-${item.id}"
            class="flex items-center justify-end overflow-hidden transition-all duration-200 shrink-0"
            style="width: 0px; opacity: 0;">
            <button type="button"
              onclick="confirmDeleteMobileItem('${item.id}', '${(item.desc || 'este producto').replace(/'/g, "\\'")}')"
              class="w-10 h-10 bg-rose-500 hover:bg-rose-600 active:scale-90 text-white rounded-2xl flex items-center justify-center text-xs shadow-2xs shrink-0">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <!-- Fila inferior: Chip de Miembros y Monto Subtotal perfectamente alineados -->
        <div class="flex items-center justify-between px-1 text-[10px] text-slate-800 font-bold">
          <button type="button" onclick="openItemAssignmentModal('${item.id}')"
            class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white text-emerald-950 shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all">
            <i class="fas fa-user-friends text-[9px] text-emerald-700"></i>
            <span class="truncate max-w-[190px]">${assignLabel}</span>
            <i class="fas fa-chevron-right text-[7px] opacity-60"></i>
          </button>
          <span class="font-bold text-slate-900 bg-white/70 px-2 py-0.5 rounded-lg shadow-2xs">
            Subtotal: S/ ${totalCost}
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

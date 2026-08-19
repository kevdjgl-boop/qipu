import { appState, currentUserId, formatCurrency } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { mobileExpenseItems, renderMobileItemsList } from "./modulo-lista.js";
import { mobileExpenseGuests, activeSharedMemberIds } from "./vista-registro.js";
import { renderSplitModalContent } from "./modal-reparticion.js";

export let currentAssigningItemId = null;
export let currentAssigningItem = null;
export let isAssignmentReadOnly = false;
export let currentAssignModalGuests = [];
export let tempItemAssignments = {};

export function normalizeItemAssignments(rawAssignments, guestsList = []) {
  if (!rawAssignments || typeof rawAssignments !== 'object') return {};
  const normalized = {};

  Object.keys(rawAssignments).forEach(key => {
    const qty = parseFloat(rawAssignments[key]) || 0;
    if (qty <= 0) return;

    const pUser = (appState.participants || []).find(p => p.id === key);
    if (pUser) {
      normalized[pUser.id] = (normalized[pUser.id] || 0) + qty;
      return;
    }

    const numMatch = String(key).match(/\d+/);
    if (numMatch && guestsList[parseInt(numMatch[0])]) {
      const gName = guestsList[parseInt(numMatch[0])].trim();
      const gKey = `guest_${gName.toLowerCase().replace(/\s+/g, '_')}`;
      normalized[gKey] = (normalized[gKey] || 0) + qty;
      return;
    }
    if (guestsList[parseInt(key)]) {
      const gName = guestsList[parseInt(key)].trim();
      const gKey = `guest_${gName.toLowerCase().replace(/\s+/g, '_')}`;
      normalized[gKey] = (normalized[gKey] || 0) + qty;
      return;
    }

    if (String(key).startsWith('guest_') || String(key).startsWith('guest-')) {
      const rawName = String(key).replace('guest_', '').replace('guest-', '').replace(/_/g, ' ').trim();
      const matched = guestsList.find(g => g.toLowerCase() === rawName.toLowerCase());
      const gName = matched || rawName;
      const gKey = `guest_${gName.toLowerCase().replace(/\s+/g, '_')}`;
      normalized[gKey] = (normalized[gKey] || 0) + qty;
      return;
    }

    if (guestsList.length === 1) {
      const gName = guestsList[0].trim();
      const gKey = `guest_${gName.toLowerCase().replace(/\s+/g, '_')}`;
      normalized[gKey] = (normalized[gKey] || 0) + qty;
      return;
    }

    normalized[key] = (normalized[key] || 0) + qty;
  });

  return normalized;
}

export function getGuestKeyAndName(rawKey, expenseGuests = []) {
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

export function getAssignmentSummaryLabel(item, guestsList = []) {
  const assignments = normalizeItemAssignments(item.assignments, guestsList);
  const assignedKeys = Object.keys(assignments).filter(k => (parseFloat(assignments[k]) || 0) > 0);

  if (assignedKeys.length > 0) {
    const parts = assignedKeys.map(k => {
      const uQty = assignments[k];
      const pUser = (appState.participants || []).find(p => p.id === k);
      if (pUser) return `${pUser.name} (${uQty} u.)`;
      const gName = k.startsWith('guest_') ? k.substring(6).replace(/_/g, ' ') : k;
      return `${gName} (${uQty} u.)`;
    });
    return parts.join(', ');
  } else if (item.assignedTo && item.assignedTo !== 'all') {
    const pAssigned = (appState.participants || []).find(p => p.id === item.assignedTo);
    if (pAssigned) return `${pAssigned.name} (${item.quantity || 1} u.)`;
    const gName = item.assignedTo.startsWith('guest_') ? item.assignedTo.substring(6).replace(/_/g, ' ') : item.assignedTo;
    return `${gName} (${item.quantity || 1} u.)`;
  }
  return 'Para todos por igual';
}

export function openItemAssignmentModal(itemId) {
  const item = mobileExpenseItems.find(i => i.id === itemId);
  if (!item) return;

  currentAssigningItemId = itemId;
  currentAssigningItem = item;
  isAssignmentReadOnly = false;
  currentAssignModalGuests = [...mobileExpenseGuests];

  const itemQty = parseFloat(item.quantity) || 1;
  const rawAssignments = normalizeItemAssignments(item.assignments, currentAssignModalGuests);
  tempItemAssignments = { ...rawAssignments };

  if (Object.keys(tempItemAssignments).length === 0 && item.assignedTo && item.assignedTo !== 'all') {
    const { key: gKey } = getGuestKeyAndName(item.assignedTo, currentAssignModalGuests);
    tempItemAssignments = { [gKey]: itemQty };
  }

  if (Object.keys(tempItemAssignments).length === 0) {
    const allM = [
      ...appState.participants.map(p => p.id),
      ...currentAssignModalGuests.map(g => `guest_${g.trim().toLowerCase().replace(/\s+/g, '_')}`)
    ];
    const activeM = activeSharedMemberIds.size > 0 ? allM.filter(id => activeSharedMemberIds.has(id)) : allM;
    const count = activeM.length || 1;
    const share = itemQty / count;
    activeM.forEach(id => {
      tempItemAssignments[id] = parseFloat(share.toFixed(2));
    });
  }

  renderItemAssignmentModalUI();
  openModal('modal-item-assignment');
}

export function openDetailItemBreakdownModal(itemIndex, currentDetailExpenseId) {
  const exp = (appState.expenses || []).find(e => e.id === currentDetailExpenseId);
  if (!exp || !exp.items || !exp.items[itemIndex]) return;

  const item = exp.items[itemIndex];
  currentAssigningItemId = null;
  currentAssigningItem = item;
  isAssignmentReadOnly = true;
  currentAssignModalGuests = (exp.guests && Array.isArray(exp.guests)) ? [...exp.guests] : (exp.guestName ? [exp.guestName] : []);

  const itemQty = parseFloat(item.quantity) || 1;
  const rawAssignments = normalizeItemAssignments(item.assignments, currentAssignModalGuests);
  tempItemAssignments = { ...rawAssignments };

  if (Object.keys(tempItemAssignments).length === 0 && item.assignedTo && item.assignedTo !== 'all') {
    const { key: gKey } = getGuestKeyAndName(item.assignedTo, currentAssignModalGuests);
    tempItemAssignments = { [gKey]: itemQty };
  }

  renderItemAssignmentModalUI();
  openModal('modal-item-assignment');
}

export function renderItemAssignmentModalUI() {
  const item = currentAssigningItem;
  if (!item) return;

  const itemQty = parseFloat(item.quantity) || 1;
  const unitPrice = parseFloat(item.amount) || 0;
  const totalCost = itemQty * unitPrice;

  const titleEl = document.getElementById('assign-modal-item-title');
  const qtyEl = document.getElementById('assign-modal-total-qty-badge');
  const costEl = document.getElementById('assign-modal-total-cost-badge');
  if (titleEl) titleEl.textContent = item.desc || 'Producto';
  if (qtyEl) qtyEl.textContent = `${itemQty} und`;
  if (costEl) costEl.textContent = formatCurrency(totalCost);

  const members = [
    ...appState.participants.map(p => ({
      id: p.id,
      name: p.name,
      initials: (p.name || 'U').substring(0, 2).toUpperCase(),
      isGuest: false,
      isMe: p.firebaseUid === currentUserId
    })),
    ...currentAssignModalGuests.map((g) => {
      const cleanName = g.trim();
      const gKey = `guest_${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
      return {
        id: gKey,
        name: cleanName,
        initials: cleanName.substring(0, 2).toUpperCase(),
        isGuest: true,
        isMe: false
      };
    })
  ];

  const avatarRow = document.getElementById('assign-avatar-chips-row');
  if (avatarRow) {
    avatarRow.innerHTML = members.map(m => {
      const isAssigned = (parseFloat(tempItemAssignments[m.id]) || 0) > 0;
      return `
        <button type="button" onclick="toggleMemberAssignment('${m.id}')"
          class="relative flex flex-col items-center justify-center p-1 rounded-2xl transition-all ${isAssigned ? 'scale-105' : 'opacity-60 hover:opacity-100'} ${isAssignmentReadOnly ? 'pointer-events-none' : 'cursor-pointer'}">
          <div class="w-12 h-12 rounded-[14px] flex items-center justify-center text-sm font-black shadow-xs transition-colors ${isAssigned ? 'bg-[#c6f6b5] text-slate-950 ring-2 ring-emerald-500' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
            ${m.initials}
          </div>
          <span class="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[52px] text-center">${m.name}</span>
          ${isAssigned ? `
            <div class="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs border border-white">
              ✓
            </div>
          ` : ''}
        </button>
      `;
    }).join('');
  }

  const container = document.getElementById('assign-members-list');
  if (container) {
    const selectedMembers = members.filter(m => (parseFloat(tempItemAssignments[m.id]) || 0) > 0);

    if (selectedMembers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 bg-slate-50 rounded-2xl text-xs text-slate-400 font-medium">
          Toca los avatares arriba para asignar a los miembros que consumen este producto.
        </div>
      `;
    } else {
      container.innerHTML = selectedMembers.map(m => {
        const assignedQty = parseFloat(tempItemAssignments[m.id]) || 0;
        const cost = assignedQty * unitPrice;

        return `
          <div class="grid grid-cols-12 gap-2 items-center bg-[#dcfce7] border border-emerald-300/80 rounded-2xl p-2.5 shadow-2xs transition-all">
            <div class="col-span-5 flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-xl ${m.isGuest ? 'bg-amber-500' : 'bg-slate-900'} text-white flex items-center justify-center font-black text-[10px] shrink-0">
                ${m.initials}
              </div>
              <div class="truncate">
                <h4 class="font-extrabold text-xs text-slate-900 truncate">${m.name}</h4>
                ${m.isMe ? '<span class="text-[8px] font-black text-emerald-800">TÚ</span>' : ''}
              </div>
            </div>

            <div class="col-span-3 flex items-center justify-center">
              ${!isAssignmentReadOnly ? `
                <input type="number" min="0.1" step="any" value="${assignedQty}"
                  oninput="setMemberExactUnits('${m.id}', this.value)"
                  class="w-12 text-center bg-white border border-emerald-300 rounded-lg py-1 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs" />
              ` : `
                <span class="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">${assignedQty}</span>
              `}
            </div>

            <div class="col-span-4 text-right">
              <span class="text-xs font-black text-slate-900">${formatCurrency(cost)}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const totalAssigned = Object.keys(tempItemAssignments).reduce((sum, k) => sum + (parseFloat(tempItemAssignments[k]) || 0), 0);
  const badge = document.getElementById('assign-units-badge');

  if (badge) {
    if (totalAssigned === itemQty) {
      badge.textContent = `✓ Todo asignado (${totalAssigned} / ${itemQty} und.)`;
      badge.className = 'text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl shadow-2xs border border-emerald-200';
    } else if (totalAssigned < itemQty) {
      badge.textContent = `Pendiente: ${(itemQty - totalAssigned).toFixed(2)} und.`;
      badge.className = 'text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl shadow-2xs border border-amber-200';
    } else {
      badge.textContent = `Excede por ${(totalAssigned - itemQty).toFixed(2)} und.`;
      badge.className = 'text-xs font-black text-rose-800 bg-rose-100 px-2.5 py-1 rounded-xl shadow-2xs border border-rose-200';
    }
  }

  const confirmBtn = document.getElementById('btn-confirm-item-assignment');
  if (confirmBtn) {
    if (isAssignmentReadOnly) {
      confirmBtn.innerHTML = `<i class="fas fa-check"></i><span>Cerrar Desglose</span>`;
    } else {
      confirmBtn.innerHTML = `<i class="fas fa-check-circle text-sm text-emerald-400"></i><span>Confirmar Asignación</span>`;
    }
  }
}

export function toggleMemberAssignment(memberId) {
  if (isAssignmentReadOnly || !currentAssigningItem) return;

  const totalItemQty = parseFloat(currentAssigningItem.quantity) || 1;
  const currentQty = parseFloat(tempItemAssignments[memberId]) || 0;

  if (currentQty > 0) {
    delete tempItemAssignments[memberId];
    const remainingKeys = Object.keys(tempItemAssignments).filter(k => (parseFloat(tempItemAssignments[k]) || 0) > 0);
    if (remainingKeys.length > 0) {
      const share = totalItemQty / remainingKeys.length;
      remainingKeys.forEach(k => {
        tempItemAssignments[k] = parseFloat(share.toFixed(2));
      });
    }
  } else {
    tempItemAssignments[memberId] = 1;
    const allSelectedKeys = Object.keys(tempItemAssignments);
    const share = totalItemQty / allSelectedKeys.length;
    allSelectedKeys.forEach(k => {
      tempItemAssignments[k] = parseFloat(share.toFixed(2));
    });
  }

  renderItemAssignmentModalUI();
}

export function setMemberExactUnits(memberId, val) {
  if (isAssignmentReadOnly || !currentAssigningItem) return;
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    delete tempItemAssignments[memberId];
  } else {
    tempItemAssignments[memberId] = num;
  }
  renderItemAssignmentModalUI();
}

export function confirmItemAssignmentFromButton() {
  if (!isAssignmentReadOnly && currentAssigningItemId) {
    const item = mobileExpenseItems.find(i => i.id === currentAssigningItemId);
    if (item) {
      item.assignments = { ...tempItemAssignments };
      const keys = Object.keys(item.assignments).filter(k => (parseFloat(item.assignments[k]) || 0) > 0);
      item.assignedTo = keys.length === 1 ? keys[0] : (keys.length > 1 ? 'custom' : 'all');
      renderMobileItemsList();
      if (typeof renderSplitModalContent === 'function') {
        renderSplitModalContent();
      }
    }
  }
  closeModal('modal-item-assignment');
}

import { appState, formatCurrency } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { mobileExpenseItems, addMobileItemRow, renderListTotalBadge } from "./modulo-lista.js";
import { mobileExpenseGuests, activeSharedMemberIds, isListExpenseActive, toggleListExpenseSection } from "./vista-registro.js";
import { openItemAssignmentModal } from "./modal-asignacion.js";

export let currentSplitModalTab = 'equitativo';
export let splitCustomPercentages = {}; // { memberId: pctNumber }

export function getActiveSplitMembers() {
  const allMembers = [
    ...(appState.participants || []).map(p => ({
      id: p.id,
      name: p.name,
      initials: (p.name || 'U').substring(0, 2).toUpperCase(),
      isGuest: false
    })),
    ...mobileExpenseGuests.map((g) => {
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

  if (activeSharedMemberIds.size > 0) {
    const filtered = allMembers.filter(m => activeSharedMemberIds.has(m.id));
    return filtered.length > 0 ? filtered : allMembers;
  }
  return allMembers;
}

export function getCurrentExpenseTotalForSplit() {
  if (isListExpenseActive) {
    return renderListTotalBadge();
  }
  return parseFloat(document.getElementById('exp-amount')?.value) || 0;
}

export function openSplitBreakdownModal(initialMode) {
  const mode = initialMode || document.getElementById('exp-split-mode-select')?.value || 'equitativo';
  currentSplitModalTab = mode;

  const desc = document.getElementById('exp-description')?.value.trim() || 'Nuevo Gasto';
  const totalAmount = getCurrentExpenseTotalForSplit();

  const titleEl = document.getElementById('split-modal-title');
  const badgeEl = document.getElementById('split-modal-total-badge');
  if (titleEl) titleEl.textContent = desc;
  if (badgeEl) badgeEl.textContent = formatCurrency(totalAmount);

  const members = getActiveSplitMembers();
  if (members.length > 0) {
    const hasExisting = members.some(m => splitCustomPercentages[m.id] !== undefined);
    if (!hasExisting) {
      const equalPct = Math.floor(100 / members.length);
      const remainder = 100 - (equalPct * members.length);
      members.forEach((m, idx) => {
        splitCustomPercentages[m.id] = equalPct + (idx === 0 ? remainder : 0);
      });
    }
  }

  switchSplitModalTab(currentSplitModalTab);
  openModal('modal-split-breakdown');
}

export function switchSplitModalTab(tab) {
  currentSplitModalTab = tab;
  const tabEquitativo = document.getElementById('tab-split-equitativo');
  const tabPorcentual = document.getElementById('tab-split-porcentual');
  const tabDetallado = document.getElementById('tab-split-detallado');

  const activeClass = 'flex-1 py-1.5 rounded-full text-xs font-black bg-[#c6f6b5] text-slate-950 shadow-xs transition-all text-center';
  const inactiveClass = 'flex-1 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 transition-all text-center';

  if (tabEquitativo) tabEquitativo.className = tab === 'equitativo' ? activeClass : inactiveClass;
  if (tabPorcentual) tabPorcentual.className = tab === 'porcentual' ? activeClass : inactiveClass;
  if (tabDetallado) tabDetallado.className = tab === 'detallado' ? activeClass : inactiveClass;

  renderSplitModalContent();
}

export function renderSplitModalContent() {
  const headerEl = document.getElementById('split-modal-table-header');
  const container = document.getElementById('split-modal-items-container');
  const statusBar = document.getElementById('split-percentage-status-bar');
  const members = getActiveSplitMembers();
  const totalAmount = getCurrentExpenseTotalForSplit();

  if (!headerEl || !container) return;

  if (currentSplitModalTab === 'porcentual') {
    if (statusBar) statusBar.classList.remove('hidden');

    headerEl.innerHTML = `
      <span class="col-span-5">Miembro</span>
      <span class="col-span-4 text-right">Monto</span>
      <span class="col-span-3 text-right">%</span>
    `;

    let sumPct = 0;
    container.innerHTML = members.map(m => {
      const pct = splitCustomPercentages[m.id] !== undefined ? parseFloat(splitCustomPercentages[m.id]) || 0 : (100 / (members.length || 1));
      sumPct += pct;
      const memberAmount = (totalAmount * pct) / 100;

      return `
        <div class="grid grid-cols-12 gap-2 items-center bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 hover:bg-slate-100/60 transition-all">
          <div class="col-span-5 flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-xl ${m.isGuest ? 'bg-amber-500' : 'bg-slate-900'} text-white flex items-center justify-center font-black text-[10px] shrink-0">
              ${m.initials}
            </div>
            <span class="text-xs font-extrabold text-slate-900 truncate">${m.name}</span>
          </div>
          <div class="col-span-4 text-right">
            <span class="text-xs font-black text-slate-900">${formatCurrency(memberAmount)}</span>
          </div>
          <div class="col-span-3 flex items-center justify-end gap-1">
            <input type="number" min="0" max="100" step="1" value="${pct}"
              oninput="updateMemberPercentage('${m.id}', this.value)"
              class="w-12 text-center bg-white border border-slate-200 rounded-xl py-1 text-xs font-black text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
            <span class="text-xs font-black text-slate-500">%</span>
          </div>
        </div>
      `;
    }).join('');

    const totalBadge = document.getElementById('split-percentage-total-badge');
    if (totalBadge) {
      totalBadge.textContent = `${sumPct.toFixed(0)}%`;
      if (Math.round(sumPct) === 100) {
        totalBadge.className = 'text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl';
      } else {
        totalBadge.className = 'text-xs font-black text-rose-800 bg-rose-100 px-2.5 py-1 rounded-xl';
      }
    }

  } else if (currentSplitModalTab === 'equitativo') {
    if (statusBar) statusBar.classList.add('hidden');

    headerEl.innerHTML = `
      <span class="col-span-7">Miembro</span>
      <span class="col-span-5 text-right">Monto</span>
    `;

    const numMembers = members.length || 1;
    const equalAmount = totalAmount / numMembers;

    container.innerHTML = members.map(m => `
      <div class="grid grid-cols-12 gap-2 items-center bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 hover:bg-slate-100/60 transition-all">
        <div class="col-span-7 flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-xl ${m.isGuest ? 'bg-amber-500' : 'bg-slate-900'} text-white flex items-center justify-center font-black text-[10px] shrink-0">
            ${m.initials}
          </div>
          <div>
            <h4 class="text-xs font-extrabold text-slate-900 truncate">${m.name}</h4>
            <p class="text-[9px] text-emerald-700 font-bold">1 / ${numMembers} parte</p>
          </div>
        </div>
        <div class="col-span-5 text-right">
          <span class="text-xs font-black text-slate-900">${formatCurrency(equalAmount)}</span>
        </div>
      </div>
    `).join('');

  } else if (currentSplitModalTab === 'detallado') {
    if (statusBar) statusBar.classList.add('hidden');

    headerEl.innerHTML = `
      <span class="col-span-6">Producto</span>
      <span class="col-span-3 text-center">Miembros</span>
      <span class="col-span-3 text-right">Monto</span>
    `;

    if (mobileExpenseItems.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 bg-slate-50 rounded-2xl space-y-3">
          <p class="text-xs text-slate-500 font-medium">No hay productos en la lista de compras aún.</p>
          <button type="button" onclick="activateListAndAddItem()"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs active:scale-95 transition-all">
            + Agregar primer producto
          </button>
        </div>
      `;
    } else {
      container.innerHTML = mobileExpenseItems.map((item, idx) => {
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.amount) || 0;
        const itemTotal = qty * price;

        let assignedCount = 0;
        if (item.assignments && Object.keys(item.assignments).length > 0) {
          assignedCount = Object.keys(item.assignments).filter(k => (parseFloat(item.assignments[k]) || 0) > 0).length;
        } else if (item.assignedTo && item.assignedTo !== 'all') {
          assignedCount = 1;
        } else {
          assignedCount = members.length;
        }

        return `
          <div onclick="openItemAssignmentModal('${item.id}')"
            class="grid grid-cols-12 gap-2 items-center bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-2.5 cursor-pointer shadow-2xs active:scale-98 transition-all group">
            <div class="col-span-6 flex items-center gap-2 min-w-0">
              <span class="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">
                ${idx + 1}
              </span>
              <div class="truncate">
                <h4 class="text-xs font-extrabold text-slate-900 group-hover:text-emerald-950 truncate">${item.desc || 'Producto'}</h4>
                <p class="text-[10px] text-slate-400 font-medium">${qty} × ${formatCurrency(price)}</p>
              </div>
            </div>
            <div class="col-span-3 text-center">
              <span class="text-xs font-black text-slate-800 bg-slate-100 group-hover:bg-emerald-50 px-2.5 py-1 rounded-xl">
                ${assignedCount === members.length ? 'Todos' : `${assignedCount} pers.`}
              </span>
            </div>
            <div class="col-span-3 text-right flex items-center justify-end gap-1">
              <span class="text-xs font-black text-slate-900">${formatCurrency(itemTotal)}</span>
              <i class="fas fa-chevron-right text-[8px] text-slate-300 group-hover:text-emerald-600"></i>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

export function updateMemberPercentage(memberId, val) {
  const num = parseFloat(val) || 0;
  splitCustomPercentages[memberId] = num;
  renderSplitModalContent();
}

export function activateListAndAddItem() {
  if (!isListExpenseActive) {
    toggleListExpenseSection();
  } else if (mobileExpenseItems.length === 0) {
    addMobileItemRow();
  }
  renderSplitModalContent();
}

export function confirmSplitDistribution() {
  const mode = currentSplitModalTab;
  const input = document.getElementById('exp-split-mode-select');
  const chip = document.getElementById('chip-split-mode-label');

  if (input) input.value = mode;
  if (chip) {
    const labels = { equitativo: 'Equitativo', porcentual: 'Porcentual', detallado: 'Detallado' };
    chip.textContent = labels[mode] || mode;
  }

  if (mode === 'detallado' && !isListExpenseActive) {
    toggleListExpenseSection();
  }

  closeModal('modal-split-breakdown');
}

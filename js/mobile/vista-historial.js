import { appState, currentTab, searchTerm, formatCurrency } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { openEditExpenseModal, openEditIncomeModal } from "./vista-registro.js";
import { openDetailItemBreakdownModal } from "./modal-asignacion.js";

export let currentDetailExpenseId = null;

export function renderHistoryList(monthlyExpenses) {
  const container = document.getElementById('mobile-history-list');
  if (!container) return;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let items = [];

  if (currentTab === 'all' || currentTab === 'expenses') {
    monthlyExpenses.forEach(e => {
      if (e.isProjected && e.date > todayStr) {
        return;
      }

      const hasItems = !!(e.items && Array.isArray(e.items) && e.items.length > 0);

      items.push({
        id: e.id,
        type: 'expense',
        description: e.description || 'Gasto sin concepto',
        amount: parseFloat(e.amount) || 0,
        date: e.date || '',
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

  items.sort((a, b) => new Date(b.date) - new Date(a.date));

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

  container.innerHTML = items.map(item => {
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

    const clickHandler = isExpense
      ? (item.hasItems ? `onclick="openTransactionDetailModal('${item.id}')"` : `onclick="openEditExpenseModal('${item.id}')"`)
      : `onclick="openEditIncomeModal('${item.id}')"`;

    return `
      <div ${clickHandler} class="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 active:scale-98 transition-all cursor-pointer select-none">
        <div class="flex items-center gap-3 min-w-0 flex-1">
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

        <div class="text-right shrink-0">
          <span class="font-black text-xs ${isExpense ? 'text-slate-900' : 'text-emerald-600'} block">
            ${isExpense ? '-' : '+'} ${formatCurrency(item.amount)}
          </span>
          <span class="text-[9px] text-slate-400 font-medium">${item.paymentMethod}</span>
        </div>
      </div>
    `;
  }).join('');
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

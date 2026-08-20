import { appState, currentUserId, currentWalletId, db, appId, formatCurrency } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";
import { mobileExpenseItems, setMobileExpenseItems, renderMobileItemsList, addMobileItemRow, renderListTotalBadge } from "./modulo-lista.js";
import { normalizeItemAssignments, getGuestKeyAndName } from "./modal-asignacion.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export let currentRegistrationType = 'shared'; // 'personal', 'shared', 'income'
export let isFixedExpenseActive = false;
export let isListExpenseActive = false;
export let activeSharedMemberIds = new Set();
export let mobileExpenseGuests = [];
export let editingExpenseId = null;
export let editingIncomeId = null;

export function updateDateChipLabel(dateStr) {
  if (!dateStr) return;
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();
  const month = d.toLocaleString('es-ES', { month: 'short', timeZone: 'UTC' });
  const label = `${day}-${month.charAt(0).toUpperCase() + month.slice(1).replace('.', '')}`;
  const chip = document.getElementById('chip-date-label');
  if (chip) chip.textContent = label;
}

export function switchExpenseRegistrationType(type) {
  currentRegistrationType = type;
  const btnPersonal = document.getElementById('tab-type-personal');
  const btnShared = document.getElementById('tab-type-shared');
  const btnIncome = document.getElementById('tab-type-income');
  const sharedSection = document.getElementById('section-shared-members');
  const iconBox = document.getElementById('box-expense-visual-icon');

  [btnPersonal, btnShared, btnIncome].forEach(b => {
    if (b) b.className = 'flex-1 py-1.5 rounded-full text-slate-500 hover:text-slate-900 transition-all text-center';
  });

  if (type === 'personal') {
    if (btnPersonal) btnPersonal.className = 'flex-1 py-1.5 rounded-full bg-[#c6f6b5] text-slate-950 shadow-xs font-black transition-all text-center';
    if (sharedSection) {
      sharedSection.classList.remove('m3-open');
    }
    if (iconBox) {
      iconBox.className = 'w-[82px] h-[82px] min-w-[82px] bg-[#dcfce7] text-emerald-900 rounded-[14px] flex flex-col items-center justify-center shrink-0 p-1.5 shadow-2xs transition-all duration-300';
      iconBox.innerHTML = '<i class="fas fa-user text-xl mb-0.5 opacity-80"></i><span class="text-[8px] font-black uppercase text-emerald-800/80">Personal</span>';
    }
  } else if (type === 'income') {
    if (btnIncome) btnIncome.className = 'flex-1 py-1.5 rounded-full bg-emerald-200 text-emerald-950 shadow-xs font-black transition-all text-center';
    if (sharedSection) {
      sharedSection.classList.remove('m3-open');
    }
    if (iconBox) {
      iconBox.className = 'w-[82px] h-[82px] min-w-[82px] bg-emerald-100 text-emerald-900 rounded-[14px] flex flex-col items-center justify-center shrink-0 p-1.5 shadow-2xs transition-all duration-300';
      iconBox.innerHTML = '<i class="fas fa-coins text-xl mb-0.5 opacity-80"></i><span class="text-[8px] font-black uppercase text-emerald-800/80">Ingreso</span>';
    }
  } else {
    if (btnShared) btnShared.className = 'flex-1 py-1.5 rounded-full bg-[#c6f6b5] text-slate-950 shadow-xs font-black transition-all text-center';
    if (sharedSection) {
      sharedSection.classList.add('m3-open');
    }
    if (iconBox) {
      iconBox.className = 'w-[82px] h-[82px] min-w-[82px] bg-[#dcfce7] text-emerald-900 rounded-[14px] flex flex-col items-center justify-center shrink-0 p-1.5 shadow-2xs transition-all duration-300';
      iconBox.innerHTML = '<i class="fas fa-receipt text-xl mb-0.5 opacity-80"></i><span class="text-[8px] font-black uppercase text-emerald-800/80">Gasto</span>';
    }
  }
  renderSharedMembersAvatars();
}

export function updateSegmentedButtonsUI() {
  const btnFixed = document.getElementById('btn-toggle-fixed');
  const btnList = document.getElementById('btn-toggle-list');
  const fixedCheck = document.getElementById('icon-fixed-check');
  const fixedSymbol = document.getElementById('icon-fixed-symbol');
  const listCheck = document.getElementById('icon-list-check');
  const listSymbol = document.getElementById('icon-list-symbol');
  const secFixed = document.getElementById('section-fixed-config');
  const secList = document.getElementById('section-list-items');

  if (btnFixed) {
    if (isFixedExpenseActive) {
      btnFixed.className = 'flex-1 h-full px-3 flex items-center justify-center gap-2 text-xs font-black text-slate-950 bg-[#c6f6b5] transition-all select-none active:scale-[0.98]';
      if (fixedCheck) fixedCheck.classList.remove('hidden');
      if (fixedSymbol) fixedSymbol.classList.add('hidden');
      if (secFixed) secFixed.classList.add('m3-open');
    } else {
      btnFixed.className = 'flex-1 h-full px-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all select-none active:scale-[0.98]';
      if (fixedCheck) fixedCheck.classList.add('hidden');
      if (fixedSymbol) fixedSymbol.classList.remove('hidden');
      if (secFixed) secFixed.classList.remove('m3-open');
    }
  }

  if (btnList) {
    if (isListExpenseActive) {
      btnList.className = 'flex-1 h-full px-3 flex items-center justify-center gap-2 text-xs font-black text-slate-950 bg-[#c6f6b5] transition-all select-none active:scale-[0.98]';
      if (listCheck) listCheck.classList.remove('hidden');
      if (listSymbol) listSymbol.classList.add('hidden');
      if (secList) {
        secList.classList.remove('m3-block-closed');
        secList.classList.add('m3-block-open');
      }
    } else {
      btnList.className = 'flex-1 h-full px-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all select-none active:scale-[0.98]';
      if (listCheck) listCheck.classList.add('hidden');
      if (listSymbol) listSymbol.classList.remove('hidden');
      if (secList) {
        secList.classList.remove('m3-block-open');
        secList.classList.add('m3-block-closed');
      }
    }
  }
}

export function toggleFixedExpenseSection() {
  isFixedExpenseActive = !isFixedExpenseActive;
  updateSegmentedButtonsUI();
}

export function toggleListExpenseSection() {
  isListExpenseActive = !isListExpenseActive;
  if (isListExpenseActive && mobileExpenseItems.length === 0) {
    addMobileItemRow();
  }
  if (isListExpenseActive) {
    renderMobileItemsList();
  }
  updateSegmentedButtonsUI();
}

export function renderSharedMembersAvatars() {
  const container = document.getElementById('shared-members-avatars-row');
  if (!container) return;

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

  if (activeSharedMemberIds.size === 0) {
    allMembers.forEach(m => activeSharedMemberIds.add(m.id));
  }

  container.innerHTML = allMembers.map(m => {
    const isSelected = activeSharedMemberIds.has(m.id);
    return `
      <button type="button" onclick="toggleSharedMemberInclusion('${m.id}')"
        class="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all shrink-0 active:scale-95 ${isSelected ? (m.isGuest ? 'bg-amber-200 text-amber-950 border-2 border-amber-400 shadow-2xs' : 'bg-[#c6f6b5] text-slate-950 border-2 border-emerald-400 shadow-2xs') : 'bg-slate-100 text-slate-400 opacity-60'}">
        ${m.initials}
      </button>
    `;
  }).join('');
}

export function toggleSharedMemberInclusion(memberId) {
  if (activeSharedMemberIds.has(memberId)) {
    if (activeSharedMemberIds.size > 1) {
      activeSharedMemberIds.delete(memberId);
    }
  } else {
    activeSharedMemberIds.add(memberId);
  }
  renderSharedMembersAvatars();
}

export function resetExpenseForm() {
  editingExpenseId = null;
  const form = document.getElementById('form-mobile-expense');
  if (form) form.reset();

  const titleEl = document.getElementById('modal-expense-main-title');
  const subTitleEl = document.getElementById('modal-expense-sub-title');
  if (titleEl) titleEl.textContent = 'Registrar';
  if (subTitleEl) subTitleEl.textContent = 'Detalla y clasifica tu movimiento';

  const expAmount = document.getElementById('exp-amount');
  const expDesc = document.getElementById('exp-description');
  const expDate = document.getElementById('exp-date');

  if (expAmount) expAmount.value = '';
  if (expDesc) expDesc.value = '';
  const todayIso = new Date().toISOString().split('T')[0];
  if (expDate) expDate.value = todayIso;
  updateDateChipLabel(todayIso);

  const defaultCat = (appState.categories && appState.categories[0]?.name) || 'General';
  const defaultPm = (appState.paymentMethods && appState.paymentMethods[0]?.name) || 'Efectivo';
  const defaultPmId = (appState.paymentMethods && appState.paymentMethods[0]?.id) || '';

  const expCat = document.getElementById('exp-category');
  const chipCat = document.getElementById('chip-category-label');
  if (expCat) expCat.value = defaultCat;
  if (chipCat) chipCat.textContent = defaultCat;

  const expPm = document.getElementById('exp-payment-method');
  const expPmId = document.getElementById('exp-payment-method-id');
  const chipPm = document.getElementById('chip-pm-label');
  if (expPm) expPm.value = defaultPm;
  if (expPmId) expPmId.value = defaultPmId;
  if (chipPm) chipPm.textContent = defaultPm;

  const splitSelect = document.getElementById('exp-split-mode-select');
  const splitChip = document.getElementById('chip-split-mode-label');
  if (splitSelect) splitSelect.value = 'equitativo';
  if (splitChip) splitChip.textContent = 'Equitativo';

  const freqSelect = document.getElementById('exp-fixed-frequency');
  const freqChip = document.getElementById('chip-frequency-label');
  if (freqSelect) freqSelect.value = 'monthly';
  if (freqChip) freqChip.textContent = 'Mensual';

  const repSelect = document.getElementById('exp-fixed-repeat');
  const repChip = document.getElementById('chip-repeat-label');
  if (repSelect) repSelect.value = 'indefinite';
  if (repChip) repChip.textContent = 'Indefinido';

  const labelSubmit = document.getElementById('label-submit-expense');
  const btnDelete = document.getElementById('btn-delete-expense');
  if (labelSubmit) labelSubmit.textContent = 'Guardar';
  if (btnDelete) btnDelete.classList.add('hidden');

  setMobileExpenseItems([]);
  mobileExpenseGuests = [];
  activeSharedMemberIds.clear();

  isFixedExpenseActive = false;
  isListExpenseActive = false;
  updateSegmentedButtonsUI();

  switchExpenseRegistrationType('shared');
}

export function resetIncomeForm() {
  editingIncomeId = null;
  const form = document.getElementById('form-mobile-income');
  if (form) form.reset();
  const incAmount = document.getElementById('inc-amount');
  const incDesc = document.getElementById('inc-description');
  const incDate = document.getElementById('inc-date');
  const modalTitle = document.getElementById('modal-income-title');
  const submitLabel = document.getElementById('label-submit-income');
  const btnDelete = document.getElementById('btn-delete-income');

  if (incAmount) incAmount.value = '';
  if (incDesc) incDesc.value = '';
  if (incDate) incDate.value = new Date().toISOString().split('T')[0];
  if (modalTitle) modalTitle.textContent = 'Registrar Nuevo Ingreso';
  if (submitLabel) submitLabel.textContent = 'Añadir Ingreso al Presupuesto';
  if (btnDelete) btnDelete.classList.add('hidden');
}

export function openEditExpenseModal(expenseId) {
  const exp = (appState.expenses || []).find(e => e.id === expenseId);
  if (!exp) return;

  editingExpenseId = expenseId;
  const titleEl = document.getElementById('modal-expense-main-title');
  const subTitleEl = document.getElementById('modal-expense-sub-title');
  if (titleEl) titleEl.textContent = 'Editar Gasto';
  if (subTitleEl) subTitleEl.textContent = 'Modifica los datos del registro';

  const labelSubmit = document.getElementById('label-submit-expense');
  const btnDelete = document.getElementById('btn-delete-expense');
  if (labelSubmit) labelSubmit.textContent = 'Guardar Cambios';
  if (btnDelete) btnDelete.classList.remove('hidden');

  const expAmount = document.getElementById('exp-amount');
  const expDesc = document.getElementById('exp-description');
  const expDate = document.getElementById('exp-date');

  if (expAmount) expAmount.value = exp.amount || '';
  if (expDesc) expDesc.value = exp.description || '';
  const expDateVal = exp.date || new Date().toISOString().split('T')[0];
  if (expDate) expDate.value = expDateVal;
  updateDateChipLabel(expDateVal);

  const catVal = exp.category || 'General';
  const expCat = document.getElementById('exp-category');
  const chipCat = document.getElementById('chip-category-label');
  if (expCat) expCat.value = catVal;
  if (chipCat) chipCat.textContent = catVal;

  const expPayer = document.getElementById('exp-payer');
  if (exp.payerId && expPayer) expPayer.value = exp.payerId;

  const pmVal = exp.paymentMethod || 'Efectivo';
  const expPm = document.getElementById('exp-payment-method');
  const expPmId = document.getElementById('exp-payment-method-id');
  const chipPm = document.getElementById('chip-pm-label');
  if (expPm) expPm.value = pmVal;
  if (expPmId) expPmId.value = exp.paymentMethodId || '';
  if (chipPm) chipPm.textContent = pmVal;

  switchExpenseRegistrationType(exp.type || 'shared');

  mobileExpenseGuests = (exp.guests && Array.isArray(exp.guests)) ? [...exp.guests] : (exp.guestName ? [exp.guestName] : []);
  renderSharedMembersAvatars();

  if (exp.isFixed) {
    isFixedExpenseActive = true;
    if (exp.fixedFrequency) {
      const expFreq = document.getElementById('exp-fixed-frequency');
      const chipFreq = document.getElementById('chip-frequency-label');
      if (expFreq) expFreq.value = exp.fixedFrequency;
      const freqMap = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal', yearly: 'Anual' };
      if (chipFreq) chipFreq.textContent = freqMap[exp.fixedFrequency] || exp.fixedFrequency;
    }
    if (exp.fixedRepeat) {
      const expRep = document.getElementById('exp-fixed-repeat');
      const chipRep = document.getElementById('chip-repeat-label');
      if (expRep) expRep.value = exp.fixedRepeat;
      if (chipRep) chipRep.textContent = exp.fixedRepeat === 'indefinite' ? 'Indefinido' : `${exp.fixedRepeat} cuotas`;
    }
  } else {
    isFixedExpenseActive = false;
  }

  if (exp.items && exp.items.length > 0) {
    isListExpenseActive = true;
    const items = exp.items.map(it => {
      let assignments = normalizeItemAssignments(it.assignments, mobileExpenseGuests);
      if (Object.keys(assignments).length === 0 && it.assignedTo && it.assignedTo !== 'all') {
        const { key: gKey } = getGuestKeyAndName(it.assignedTo, mobileExpenseGuests);
        assignments = { [gKey]: parseFloat(it.quantity) || 1 };
      }

      return {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        desc: it.desc || '',
        quantity: it.quantity || 1,
        amount: it.amount || '',
        assignedTo: it.assignedTo || (Object.keys(assignments).length === 1 ? Object.keys(assignments)[0] : 'all'),
        assignments: assignments
      };
    });
    setMobileExpenseItems(items);
    renderMobileItemsList();
  } else {
    isListExpenseActive = false;
    setMobileExpenseItems([]);
  }

  updateSegmentedButtonsUI();
  openModal('modal-expense');
}

export function openEditIncomeModal(incomeId) {
  let foundIncome = null;
  let targetParticipant = null;

  (appState.participants || []).forEach(p => {
    (p.incomes || []).forEach(inc => {
      if (inc.id === incomeId) {
        foundIncome = inc;
        targetParticipant = p;
      }
    });
  });

  if (!foundIncome) return;

  editingIncomeId = incomeId;
  const incAmount = document.getElementById('inc-amount');
  const incDesc = document.getElementById('inc-description');
  const incDate = document.getElementById('inc-date');
  const incPart = document.getElementById('inc-participant');
  const modalTitle = document.getElementById('modal-income-title');
  const submitLabel = document.getElementById('label-submit-income');
  const btnDelete = document.getElementById('btn-delete-income');

  if (incAmount) incAmount.value = foundIncome.amount || '';
  if (incDesc) incDesc.value = foundIncome.name || foundIncome.description || '';
  if (incDate) incDate.value = foundIncome.date || new Date().toISOString().split('T')[0];
  if (incPart && targetParticipant) incPart.value = targetParticipant.id;

  if (modalTitle) modalTitle.textContent = 'Editar Ingreso';
  if (submitLabel) submitLabel.textContent = 'Guardar Cambios de Ingreso';
  if (btnDelete) btnDelete.classList.remove('hidden');

  openModal('modal-income');
}

export async function saveExpenseForm(e) {
  e.preventDefault();

  if (currentRegistrationType === 'income') {
    const incAmount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const incDesc = document.getElementById('exp-description').value.trim() || 'Ingreso';
    const incDate = document.getElementById('exp-date').value || new Date().toISOString().split('T')[0];
    const participantId = appState.participants[0]?.id || 'default';

    if (incAmount <= 0) {
      alert('Por favor ingresa un monto válido.');
      return;
    }

    const incomeData = {
      id: editingExpenseId || ('inc_' + Date.now()),
      amount: incAmount,
      name: incDesc,
      description: incDesc,
      date: incDate,
      createdAt: new Date().toISOString()
    };

    try {
      const updatedParticipants = JSON.parse(JSON.stringify(appState.participants));
      const targetP = updatedParticipants.find(p => p.id === participantId) || updatedParticipants[0];
      if (targetP) {
        if (!targetP.incomes) targetP.incomes = [];
        targetP.incomes.push(incomeData);
        targetP.budget = targetP.incomes.reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
      }

      const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
      await updateDoc(walletRef, { participants: updatedParticipants });

      closeModal('modal-expense');
      resetExpenseForm();
    } catch (err) {
      console.error('Error al guardar ingreso:', err);
      alert('Error al guardar el ingreso.');
    }
    return;
  }

  const type = currentRegistrationType;
  const category = document.getElementById('exp-category')?.value || 'General';
  const payerId = document.getElementById('exp-payer')?.value || appState.participants[0]?.id;

  const paymentMethod = document.getElementById('exp-payment-method')?.value || 'Efectivo';
  const paymentMethodId = document.getElementById('exp-payment-method-id')?.value || null;

  const date = document.getElementById('exp-date').value || new Date().toISOString().split('T')[0];
  const isFixed = isFixedExpenseActive;
  const fixedFrequency = isFixed ? document.getElementById('exp-fixed-frequency').value : null;
  const fixedRepeat = isFixed ? document.getElementById('exp-fixed-repeat').value : null;

  let finalAmount = 0;
  let finalDescription = document.getElementById('exp-description').value.trim();
  let finalItems = [];

  if (!isListExpenseActive) {
    finalAmount = parseFloat(document.getElementById('exp-amount').value) || 0;
    if (finalAmount <= 0 || !finalDescription) {
      alert('Por favor ingresa un concepto y un monto válido.');
      return;
    }
  } else {
    finalAmount = renderListTotalBadge();
    if (finalAmount <= 0) {
      alert('Por favor añade al menos un producto con precio mayor a cero.');
      return;
    }

    finalItems = mobileExpenseItems.map(item => {
      const itemQty = parseFloat(item.quantity) || 1;
      const itemPrice = parseFloat(item.amount) || 0;
      const itemObj = {
        desc: item.desc || 'Producto',
        quantity: itemQty,
        amount: itemPrice
      };

      if (item.assignments && Object.keys(item.assignments).length > 0) {
        itemObj.assignments = { ...item.assignments };
        const keys = Object.keys(item.assignments);
        itemObj.assignedTo = keys.length === 1 ? keys[0] : 'custom';
      } else if (item.assignedTo && item.assignedTo !== 'all') {
        itemObj.assignedTo = item.assignedTo;
        itemObj.assignments = { [item.assignedTo]: itemQty };
      } else {
        itemObj.assignedTo = 'all';
        itemObj.assignments = {};
      }
      return itemObj;
    });

    if (!finalDescription) {
      finalDescription = `Lista de ${finalItems.length} ítems (${finalItems[0]?.desc || 'Compra'})`;
    }
  }

  const expenseData = {
    id: editingExpenseId || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    amount: finalAmount,
    description: finalDescription,
    type,
    category,
    payerId,
    paymentMethod,
    paymentMethodId,
    date,
    isFixed,
    createdAt: new Date().toISOString()
  };

  if (isFixed) {
    expenseData.fixedFrequency = fixedFrequency;
    expenseData.fixedRepeat = fixedRepeat;
  }

  if (mobileExpenseGuests.length > 0) {
    expenseData.guests = [...mobileExpenseGuests];
  }

  if (finalItems.length > 0) {
    expenseData.items = finalItems;
  }

  try {
    let updatedExpenses = [];
    if (editingExpenseId) {
      updatedExpenses = (appState.expenses || []).map(e => e.id === editingExpenseId ? expenseData : e);
    } else {
      updatedExpenses = [...(appState.expenses || []), expenseData];
    }

    const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
    await updateDoc(walletRef, { expenses: updatedExpenses });

    closeModal('modal-expense');
    resetExpenseForm();
  } catch (err) {
    console.error('Error al guardar gasto:', err);
    alert('Ocurrió un error al guardar el gasto.');
  }
}

export async function deleteExpense() {
  if (editingIncomeId) {
    return deleteIncome();
  }
  if (!editingExpenseId) return;
  if (!confirm('¿Estás seguro de eliminar este gasto definitivamente?')) return;

  try {
    const updatedExpenses = (appState.expenses || []).filter(e => e.id !== editingExpenseId);
    const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
    await updateDoc(walletRef, { expenses: updatedExpenses });
    closeModal('modal-expense');
    resetExpenseForm();
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
    alert('Error al eliminar el gasto.');
  }
}

export async function deleteIncome() {
  if (!editingIncomeId) return;
  if (!confirm('¿Estás seguro de eliminar este ingreso definitivamente?')) return;

  try {
    const updatedParticipants = JSON.parse(JSON.stringify(appState.participants || []));
    updatedParticipants.forEach(p => {
      if (p.incomes) {
        p.incomes = p.incomes.filter(inc => inc.id !== editingIncomeId);
      }
      p.budget = (p.incomes || []).reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
    });

    const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
    await updateDoc(walletRef, { participants: updatedParticipants });

    closeModal('modal-income');
    closeModal('modal-expense');
    resetIncomeForm();
    resetExpenseForm();
  } catch (err) {
    console.error('Error al eliminar ingreso:', err);
    alert('Error al eliminar el ingreso.');
  }
}

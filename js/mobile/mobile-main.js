import {
  auth, db, appId, appState, currentUserId, currentWalletId, filterDate, currentTab, searchTerm,
  setCurrentUserId, setCurrentWalletId, setFilterDate, setCurrentTab, setSearchTerm,
  formatCurrency, getFilterMonthString, getCycleDates, isExpenseInBillingMonth, calculateSummary
} from "./core-state.js";

import { openModal, closeModal, setAppThemeColor } from "./modal-system.js";
import { setupKeyboardNavFab, advanceToNextInput } from "./fab-keyboard-nav.js";
import { openCreditCardDetailModal, openPaymentMethodsSummaryModal, openCardStatementsHistoryModal, restoreCurrentCardCycle, selectStatementCycle } from "./modulo-tarjetas.js";

import {
  renderMobileUI, renderParticipantsModalList, renderSettlementModal,
  liquidateMonthMobile, currentSettlementDebts
} from "./vista-dashboard.js";

import {
  renderHistoryList, openTransactionDetailModal, currentDetailExpenseId,
  initHistorySwipeGestures, deleteMovementFromSwipe, handleMovementCardClick
} from "./vista-historial.js";

import {
  openOptionPicker, selectOptionPickerValue, populateSelectOptions, currentPickerType
} from "./modal-pickers.js";

import {
  openDatePickerBottomSheet, toggleCalendarExpandMode, navigateCalendarMonth, navigateCalendarWeek,
  selectCalendarToday, handleCalendarDaySelect, handleCalTouchStart, handleCalTouchMove, handleCalTouchEnd
} from "./modal-calendario.js";

import {
  mobileExpenseItems, addMobileItemRow, removeMobileItemRow, updateMobileItemField,
  renderListTotalBadge, renderMobileItemsList, confirmDeleteMobileItem,
  handleItemSwipeStart, handleItemSwipeMove, handleItemSwipeEnd
} from "./modulo-lista.js";

import {
  normalizeItemAssignments, getGuestKeyAndName, getAssignmentSummaryLabel,
  openItemAssignmentModal, openDetailItemBreakdownModal, renderItemAssignmentModalUI,
  toggleMemberAssignment, setMemberExactUnits, confirmItemAssignmentFromButton
} from "./modal-asignacion.js";

import {
  currentSplitModalTab, splitCustomPercentages, getActiveSplitMembers,
  getCurrentExpenseTotalForSplit, openSplitBreakdownModal, switchSplitModalTab,
  renderSplitModalContent, updateMemberPercentage, activateListAndAddItem,
  confirmSplitDistribution
} from "./modal-reparticion.js";

import {
  currentRegistrationType, isFixedExpenseActive, isListExpenseActive,
  activeSharedMemberIds, mobileExpenseGuests, editingExpenseId, editingIncomeId,
  updateDateChipLabel, openExpenseDatePicker, switchExpenseRegistrationType, updateSegmentedButtonsUI,
  toggleFixedExpenseSection, toggleListExpenseSection, renderSharedMembersAvatars,
  toggleSharedMemberInclusion, resetExpenseForm, resetIncomeForm,
  openEditExpenseModal, openEditIncomeModal, saveExpenseForm, deleteExpense, deleteIncome
} from "./vista-registro.js";

import { initReceiptScannerPWA, triggerReceiptScanner } from "./lector-boletas.js?v=8.9";
import { initPullToRefresh, triggerPullRefresh } from "./pull-refresh.js?v=8.9";
import { initVoiceChat, openVoiceChat, closeVoiceChat, handleReceiptInVoiceChat } from "./voice-chat.js?v=8.9";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ================================================================
// EXPOSICIÓN GLOBAL A WINDOW (Compatibilidad con onclick en HTML)
// ================================================================
window.openModal = openModal;
window.closeModal = closeModal;
window.openVoiceChat = openVoiceChat;
window.closeVoiceChat = closeVoiceChat;
window.handleReceiptInVoiceChat = handleReceiptInVoiceChat;
window.openTransactionDetailModal = openTransactionDetailModal;
window.openEditExpenseModal = openEditExpenseModal;
window.openEditIncomeModal = openEditIncomeModal;
window.openOptionPicker = openOptionPicker;
window.selectOptionPickerValue = selectOptionPickerValue;
window.switchExpenseRegistrationType = switchExpenseRegistrationType;
window.toggleFixedExpenseSection = toggleFixedExpenseSection;
window.toggleListExpenseSection = toggleListExpenseSection;
window.openSplitBreakdownModal = openSplitBreakdownModal;
window.switchSplitModalTab = switchSplitModalTab;
window.updateMemberPercentage = updateMemberPercentage;
window.activateListAndAddItem = activateListAndAddItem;
window.confirmSplitDistribution = confirmSplitDistribution;
window.toggleSharedMemberInclusion = toggleSharedMemberInclusion;
window.resetExpenseForm = resetExpenseForm;
window.resetIncomeForm = resetIncomeForm;
window.addMobileItemRow = addMobileItemRow;
window.removeMobileItemRow = removeMobileItemRow;
window.updateMobileItemField = updateMobileItemField;
window.renderListTotalBadge = renderListTotalBadge;
window.confirmDeleteMobileItem = confirmDeleteMobileItem;
window.handleItemSwipeStart = handleItemSwipeStart;
window.handleItemSwipeMove = handleItemSwipeMove;
window.handleItemSwipeEnd = handleItemSwipeEnd;
window.initHistorySwipeGestures = initHistorySwipeGestures;
window.deleteMovementFromSwipe = deleteMovementFromSwipe;
window.handleMovementCardClick = handleMovementCardClick;
window.triggerPullRefresh = triggerPullRefresh;
window.openItemAssignmentModal = openItemAssignmentModal;
window.openDetailItemBreakdownModal = openDetailItemBreakdownModal;
window.toggleMemberAssignment = toggleMemberAssignment;
window.setMemberExactUnits = setMemberExactUnits;
window.setAppThemeColor = setAppThemeColor;
window.advanceToNextInput = advanceToNextInput;
window.openCreditCardDetailModal = openCreditCardDetailModal;
window.openPaymentMethodsSummaryModal = openPaymentMethodsSummaryModal;
window.openCardStatementsHistoryModal = openCardStatementsHistoryModal;
window.restoreCurrentCardCycle = restoreCurrentCardCycle;
window.selectStatementCycle = selectStatementCycle;
window.openExpenseDatePicker = openDatePickerBottomSheet;
window.openDatePickerBottomSheet = openDatePickerBottomSheet;
window.toggleCalendarExpandMode = toggleCalendarExpandMode;
window.navigateCalendarMonth = navigateCalendarMonth;
window.navigateCalendarWeek = navigateCalendarWeek;
window.selectCalendarToday = selectCalendarToday;
window.handleCalendarDaySelect = handleCalendarDaySelect;
window.handleCalTouchStart = handleCalTouchStart;
window.handleCalTouchMove = handleCalTouchMove;
window.handleCalTouchEnd = handleCalTouchEnd;
window.deleteIncome = deleteIncome;
window.deleteExpense = deleteExpense;
window.triggerReceiptScanner = triggerReceiptScanner;

// ================================================================
// AUTENTICACIÓN Y SUSCRIPCIÓN EN TIEMPO REAL
// ================================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  setCurrentUserId(user.uid);
  const initials = (user.email || 'ME').substring(0, 2).toUpperCase();
  const userInitialsEl = document.getElementById('user-initials');
  if (userInitialsEl) userInitialsEl.textContent = initials;

  try {
    const userRef = doc(db, "artifacts", appId, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().walletId) {
      const wId = userSnap.data().walletId;
      setCurrentWalletId(wId);
      const wNameEl = document.getElementById('mobile-wallet-name');
      if (wNameEl) wNameEl.textContent = `Monedero #${wId.substring(0, 6)}`;
      listenToWallet(wId);
    } else {
      window.location.href = "app.html";
    }
  } catch (err) {
    console.error("Error al cargar monedero:", err);
  }
});

function listenToWallet(walletId) {
  const walletRef = doc(db, "artifacts", appId, "public/data/wallets", walletId);
  onSnapshot(walletRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      appState.participants = data.participants || [];
      appState.categories = data.categories || [];
      appState.paymentMethods = data.paymentMethods || [];
      appState.expenses = data.expenses || [];
      renderMobileUI();
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.classList.add('hidden');
    }
  });
}

// ================================================================
// EVENT LISTENERS DE LA APLICACIÓN
// ================================================================
function initMobileEventListeners() {
  // Inicializar navegación por teclado con barra flotante dinámica
  setupKeyboardNavFab();

  // 1. Formulario Principal de Gasto / Ingreso
  const formExpense = document.getElementById('form-mobile-expense');
  if (formExpense) {
    formExpense.addEventListener('submit', saveExpenseForm);
  }

  const btnDeleteExpense = document.getElementById('btn-delete-expense');
  if (btnDeleteExpense) {
    btnDeleteExpense.addEventListener('click', deleteExpense);
  }

  const btnDeleteIncome = document.getElementById('btn-delete-income');
  if (btnDeleteIncome) {
    btnDeleteIncome.addEventListener('click', deleteIncome);
  }

  // 2. Formulario de Ingreso Rápido
  const formIncome = document.getElementById('form-mobile-income');
  if (formIncome) {
    formIncome.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('inc-amount').value) || 0;
      const description = document.getElementById('inc-description').value.trim();
      const participantId = document.getElementById('inc-participant').value;
      const date = document.getElementById('inc-date').value || new Date().toISOString().split('T')[0];

      if (amount <= 0) return;

      const incomeData = {
        id: editingIncomeId || ('inc_' + Date.now()),
        amount,
        name: description,
        description,
        date,
        createdAt: new Date().toISOString()
      };

      try {
        const updatedParticipants = JSON.parse(JSON.stringify(appState.participants));
        if (editingIncomeId) {
          updatedParticipants.forEach(p => {
            if (p.incomes) {
              p.incomes = p.incomes.filter(inc => inc.id !== editingIncomeId);
            }
          });
        }

        const targetP = updatedParticipants.find(p => p.id === participantId);
        if (targetP) {
          if (!targetP.incomes) targetP.incomes = [];
          targetP.incomes.push(incomeData);
        }

        updatedParticipants.forEach(p => {
          p.budget = (p.incomes || []).reduce((s, inc) => s + (parseFloat(inc.amount) || 0), 0);
        });

        const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
        await updateDoc(walletRef, { participants: updatedParticipants });

        closeModal('modal-income');
        resetIncomeForm();
      } catch (err) {
        console.error('Error al guardar ingreso:', err);
        alert('Ocurrió un error al guardar el ingreso.');
      }
    });
  }

  // 3. Modales y Asignación de Ítems
  document.getElementById('btn-confirm-item-assignment')?.addEventListener('click', confirmItemAssignmentFromButton);
  document.getElementById('btn-execute-delete-item')?.addEventListener('click', () => {
    const itemPendingDeleteId = window.itemPendingDeleteId;
    if (itemPendingDeleteId) {
      removeMobileItemRow(itemPendingDeleteId);
    }
    closeModal('modal-confirm-delete-item');
  });
  document.getElementById('btn-add-item-row')?.addEventListener('click', addMobileItemRow);

  // 4. Detalle y Edición
  document.getElementById('btn-edit-from-detail')?.addEventListener('click', () => {
    if (currentDetailExpenseId) {
      closeModal('modal-transaction-detail');
      setTimeout(() => {
        openEditExpenseModal(currentDetailExpenseId);
      }, 150);
    }
  });

  document.getElementById('close-modal-detail')?.addEventListener('click', () => {
    closeModal('modal-transaction-detail');
  });

  // 5. Gestión de Invitados
  const boxAddGuest = document.getElementById('box-add-guest');
  const inputGuestName = document.getElementById('input-guest-name');
  document.getElementById('btn-toggle-add-guest')?.addEventListener('click', () => {
    if (boxAddGuest) {
      boxAddGuest.classList.toggle('hidden');
      if (!boxAddGuest.classList.contains('hidden') && inputGuestName) {
        inputGuestName.focus();
      }
    }
  });

  document.getElementById('btn-confirm-add-guest')?.addEventListener('click', () => {
    if (!inputGuestName) return;
    const gName = inputGuestName.value.trim();
    if (gName) {
      if (!mobileExpenseGuests.includes(gName)) {
        mobileExpenseGuests.push(gName);
        renderSharedMembersAvatars();
        inputGuestName.value = '';
        if (boxAddGuest) boxAddGuest.classList.add('hidden');
        if (isListExpenseActive) {
          renderMobileItemsList();
        }
      }
    }
  });

  // 6. Fecha en Tiempo Real
  const dateInput = document.getElementById('exp-date');
  if (dateInput) {
    const handleDateChange = (e) => updateDateChipLabel(e.target.value);
    dateInput.addEventListener('input', handleDateChange);
    dateInput.addEventListener('change', handleDateChange);
  }

  // 7. Filtros de Pestañas
  const tabAll = document.getElementById('tab-filter-all');
  const tabExp = document.getElementById('tab-filter-expenses');
  const tabInc = document.getElementById('tab-filter-incomes');

  const updateTabStyles = (activeTab) => {
    setCurrentTab(activeTab);
    [tabAll, tabExp, tabInc].forEach(tab => {
      if (tab) tab.className = 'flex-1 py-1.5 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-800 transition-all text-center';
    });
    if (activeTab === 'all' && tabAll) tabAll.className = 'flex-1 py-1.5 text-xs font-extrabold rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center';
    if (activeTab === 'expenses' && tabExp) tabExp.className = 'flex-1 py-1.5 text-xs font-extrabold rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center';
    if (activeTab === 'incomes' && tabInc) tabInc.className = 'flex-1 py-1.5 text-xs font-extrabold rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center';
    renderMobileUI();
  };

  if (tabAll) tabAll.addEventListener('click', () => updateTabStyles('all'));
  if (tabExp) tabExp.addEventListener('click', () => updateTabStyles('expenses'));
  if (tabInc) tabInc.addEventListener('click', () => updateTabStyles('incomes'));

  // 8. Buscador y Filtro de Mes
  document.getElementById('mobile-search-input')?.addEventListener('input', (e) => {
    setSearchTerm(e.target.value);
    renderMobileUI();
  });

  document.getElementById('btn-month-prev')?.addEventListener('click', () => {
    filterDate.setMonth(filterDate.getMonth() - 1);
    renderMobileUI();
  });

  document.getElementById('btn-month-next')?.addEventListener('click', () => {
    filterDate.setMonth(filterDate.getMonth() + 1);
    renderMobileUI();
  });

  // 9. Cierre con Backdrop
  ['modal-expense', 'modal-income', 'modal-settings', 'modal-transaction-detail', 'modal-participants-balances', 'modal-settlement', 'modal-item-assignment', 'modal-split-breakdown', 'modal-option-picker', 'modal-date-picker'].forEach(modalId => {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          closeModal(modalId);
        }
      });
    }
  });

  // 10. Menú FAB Speed-Dial
  let isFabMenuOpen = false;
  const fabMainBtn = document.getElementById('fab-main-btn');
  const fabIcon = document.getElementById('fab-icon');
  const fabBackdrop = document.getElementById('fab-backdrop');
  const fabMenuOptions = document.getElementById('fab-menu-options');

  function toggleFabMenu() {
    isFabMenuOpen = !isFabMenuOpen;
    if (isFabMenuOpen) {
      if (fabIcon) fabIcon.classList.add('rotate-45');
      if (fabBackdrop) fabBackdrop.classList.remove('hidden');
      if (fabMenuOptions) {
        fabMenuOptions.classList.add('fab-open');
      }
    } else {
      closeFabMenu();
    }
  }

  function closeFabMenu() {
    isFabMenuOpen = false;
    if (fabIcon) fabIcon.classList.remove('rotate-45');
    if (fabBackdrop) fabBackdrop.classList.add('hidden');
    if (fabMenuOptions) {
      fabMenuOptions.classList.remove('fab-open');
    }
  }

  fabMainBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFabMenu();
  });

  fabBackdrop?.addEventListener('click', closeFabMenu);

  // 10. Inicializar Lector de Boletas IA
  initReceiptScannerPWA();

  document.getElementById('fab-opt-voice-chat')?.addEventListener('click', () => {
    closeFabMenu();
    openVoiceChat();
  });

  document.getElementById('fab-opt-scan-receipt')?.addEventListener('click', () => {
    closeFabMenu();
    triggerReceiptScanner();
  });

  document.getElementById('fab-opt-simple-expense')?.addEventListener('click', () => {
    closeFabMenu();
    resetExpenseForm();
    switchExpenseRegistrationType('personal');
    openModal('modal-expense');
  });

  document.getElementById('fab-opt-income')?.addEventListener('click', () => {
    closeFabMenu();
    resetExpenseForm();
    switchExpenseRegistrationType('income');
    openModal('modal-expense');
  });

  document.getElementById('fab-opt-settlement')?.addEventListener('click', () => {
    closeFabMenu();
    openModal('modal-settlement');
  });

  document.getElementById('btn-execute-settlement')?.addEventListener('click', () => {
    liquidateMonthMobile();
  });

  // 11. Barra Cápsula de Navegación
  document.getElementById('nav-btn-wallet')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('nav-btn-stats')?.addEventListener('click', () => {
    const budgetSection = document.getElementById('top-budget-section');
    if (budgetSection) budgetSection.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('nav-btn-voice')?.addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-PE';
      recognition.onstart = () => alert('🎙️ Escuchando... Di el monto y concepto del gasto (ej: 25 soles almuerzo)');
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resetExpenseForm();
        document.getElementById('exp-description').value = transcript;
        openModal('modal-expense');
      };
      recognition.onerror = () => {
        resetExpenseForm();
        openModal('modal-expense');
      };
      recognition.start();
    } else {
      resetExpenseForm();
      openModal('modal-expense');
    }
  });

  document.getElementById('nav-btn-search')?.addEventListener('click', () => {
    const searchInput = document.getElementById('mobile-search-input');
    const historySection = document.getElementById('bottom-history-section');
    if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 300);
    }
  });

  document.getElementById('btn-mobile-sync-refresh')?.addEventListener('click', () => renderMobileUI());
  document.getElementById('btn-mobile-logout')?.addEventListener('click', () => signOut(auth));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileEventListeners);
} else {
  initMobileEventListeners();
}

// ================================================================
// PWA: SERVICE WORKER & INSTALACIÓN
// ================================================================
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        reg.update().catch(() => {});
      })
      .catch(err => console.warn('Error al registrar Service Worker:', err));
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btn-mobile-install-pwa');
  if (installBtn) installBtn.classList.remove('hidden');
});

document.getElementById('btn-mobile-install-pwa')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Prompt Outcome: ${outcome}`);
    deferredPrompt = null;
  } else {
    alert('Para instalar Qipu en tu teléfono:\n\n• En Android/Chrome: Toca los 3 puntos (⋮) y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".\n• En iPhone/Safari: Toca el botón Compartir (cuadrado con flecha) y selecciona "Añadir a la pantalla de inicio".');
  }
});

// Inicializar sistema de gestos de deslizamiento, Pull-to-Refresh y Chat de Voz
initHistorySwipeGestures();
initPullToRefresh();
initVoiceChat();

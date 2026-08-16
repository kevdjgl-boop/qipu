// ================================================================
// MOCK STATE - COPIA DE ESTRUCTURA DE FIREBASE PARA DEMO
// ================================================================
const appState = {
    // SimulaciÃ³n de usuarios registrados en el sistema
    participants: [
        { id: 'u1', name: 'Carlos', email: 'carlos@example.com' },
        { id: 'u2', name: 'Ana', email: 'ana@example.com' },
        { id: 'u3', name: 'Yo', email: 'yo@example.com' }
    ],
    // Categorías estándar (Sin subcategorías)
    categories: [
        { id: 'c1', name: 'Comida' },
        { id: 'c2', name: 'Transporte' },
        { id: 'c3', name: 'Hogar' },
        { id: 'c4', name: 'Ocio' },
        { id: 'c5', name: 'Salud' },
        { id: 'c6', name: 'Servicios' },
        { id: 'c7', name: 'Supermercado' }
    ],
    // MÃ©todos de pago
    paymentMethods: [
        { id: 'pm1', name: 'Efectivo', type: 'cash' },
        { id: 'pm2', name: 'BCP CrÃ©dito', type: 'credit', cycleStartDay: 15, paymentDueDay: 5 },
        { id: 'pm3', name: 'Yape', type: 'debit' },
        { id: 'pm4', name: 'Plin', type: 'debit' }
    ],
    // Array de gastos vacÃ­o para empezar
    expenses: []
};

// Variables Globales (Esenciales para el funcionamiento idÃ©ntico)
window.tempItemsList = [];
let tempGuestList = [];
let expenseDatepicker = null;

// ================================================================
// UTILIDADES (Copiadas o adaptadas mÃ­nimamente)
// ================================================================

function formatCurrency(amount) {
    return "S/ " + parseFloat(amount).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

window.generateUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

function showModal(title, message, type = "info") {
    alert(`${title}\n${message || ''}`);
}

function getCycleDates(paymentMethod, transactionDate) {
    if (!paymentMethod || paymentMethod.type !== 'credit') return {};
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth();
    const cycleStartDay = paymentMethod.cycleStartDay || 1;

    let startDate = new Date(year, month, cycleStartDay);
    if (transactionDate < startDate) {
        startDate.setMonth(month - 1);
    }

    let paymentDate = new Date(startDate);
    paymentDate.setMonth(startDate.getMonth() + 1);
    paymentDate.setDate(paymentMethod.paymentDueDay || cycleStartDay);

    return {
        startDate: startDate.toISOString().split('T')[0],
        paymentDate: paymentDate.toISOString().split('T')[0]
    };
}

// Simulador de guardado
function saveState(updates) {
    if (updates.expenses) {
        appState.expenses = updates.expenses;
    }
    console.log("Estado guardado (SimulaciÃ³n):", updates);
}

// ================================================================
// LÓGICA DEL MODAL (COPIA EXACTA DE FUNCIONES CLAVE - MEJORADA)
// ================================================================

window.toggleExpenseType = function (type) {
    const expenseTypeInput = document.getElementById("expense-type");
    if (expenseTypeInput) expenseTypeInput.value = type;

    const pBtn = document.getElementById("type-btn-personal");
    const sBtn = document.getElementById("type-btn-shared");
    const guestSection = document.getElementById("guest-management-section");
    const sharedBadge = document.getElementById("shared-badge");
    const splitSection = document.getElementById("shared-split-preview-section");

    if (type === "shared") {
        if (pBtn) pBtn.className = "px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500";
        if (sBtn) sBtn.className = "px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs";
        if (guestSection) guestSection.classList.remove("hidden");
        if (sharedBadge) {
            sharedBadge.classList.remove("hidden");
            sharedBadge.classList.add("inline-flex");
        }
        if (splitSection) splitSection.classList.remove("hidden");
    } else {
        if (pBtn) pBtn.className = "px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs";
        if (sBtn) sBtn.className = "px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500";
        if (guestSection) guestSection.classList.add("hidden");
        if (sharedBadge) sharedBadge.classList.add("hidden");
        if (splitSection) splitSection.classList.add("hidden");
    }

    if (typeof window.renderTempItemsListInModal === "function") window.renderTempItemsListInModal();
    if (typeof window.updateSplitPreview === "function") window.updateSplitPreview();
};

// 1. ABRIR MODAL
window.openUnifiedExpenseModal = function (expenseId = null) {
    const modal = document.getElementById("expense-modal");
    const form = document.getElementById("unified-expense-form");
    const title = document.getElementById("expense-modal-title");
    const btnSave = document.getElementById("btn-save-expense");
    const idInput = document.getElementById("expense-id-hidden");
    const dateInput = document.getElementById("expense-date");

    const guestSection = document.getElementById("guest-management-section");
    const guestInput = document.getElementById("new-guest-name");

    const modalTitleDisplay = document.getElementById("expense-modal-title-display");
    const displayAmount = document.getElementById("display-expense-amount");
    const finalTotalDisplay = document.getElementById("final-total-display");
    const baseAmountDisplay = document.getElementById("base-amount-display");
    const itemsCountSidebar = document.getElementById("items-count-display-sidebar");

    if (!form) return console.error("No se encontrÃ³ el formulario unified-expense-form");

    // 1. Limpieza
    form.reset();
    window.tempItemsList = [];
    tempGuestList = [];

    // Reset displays
    if (displayAmount) displayAmount.textContent = "0.00";
    if (finalTotalDisplay) finalTotalDisplay.textContent = "S/ 0.00";
    if (baseAmountDisplay) baseAmountDisplay.textContent = "S/ 0.00";
    if (itemsCountSidebar) itemsCountSidebar.textContent = "0 Ã­tems";

    if (typeof renderGuestListInModal === "function") renderGuestListInModal();
    if (typeof populateModalTags === "function") populateModalTags();

    document.querySelectorAll("#expense-modal .filter-tag.active").forEach((t) => t.classList.remove("active"));

    // Datepicker (Mocked or Basic)
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // ==========================
    // MODO: EDITAR
    // ==========================
    if (expenseId) {
        const expense = appState.expenses.find((e) => e.id === expenseId);
        if (!expense) return showModal("Error: Gasto no encontrado");

        idInput.value = expense.id;
        if (title) title.textContent = "Editar Gasto";
        btnSave.textContent = "Guardar Cambios";

        document.getElementById("expense-description").value = expense.description;
        document.getElementById("expense-amount").value = expense.amount;
        dateInput.value = expense.date;

        if (document.getElementById("expense-payer")) document.getElementById("expense-payer").value = expense.payerId || "";
        if (document.getElementById("expense-payment-method")) document.getElementById("expense-payment-method").value = expense.paymentMethodId || "";
        if (document.getElementById("expense-category")) document.getElementById("expense-category").value = expense.category || "";
        if (document.getElementById("expense-type")) document.getElementById("expense-type").value = expense.type || "personal";
        if (typeof window.toggleExpenseType === "function") window.toggleExpenseType(expense.type || "personal");

        document.getElementById("expense-is-fixed").checked = expense.isFixed;
        document.getElementById("fixed-recurrence-container").classList.toggle("hidden", !expense.isFixed);
        if (expense.fixedRecurrenceMonths) document.getElementById("expense-recurrence-months").value = expense.fixedRecurrenceMonths;

        const toggle = document.getElementById("multi-item-toggle");
        if (toggle) {
            if (expense.items && expense.items.length > 0) {
                toggle.checked = true;
                window.tempItemsList = [...expense.items];
            } else {
                toggle.checked = false;
            }
            toggle.dispatchEvent(new Event("change"));
        }
        if (typeof renderTempItemsListInModal === "function") renderTempItemsListInModal();

        // Invitados
        if (expense.type === "shared") {
            if (guestSection) guestSection.classList.remove("hidden");
            if (expense.guests && Array.isArray(expense.guests)) {
                tempGuestList = [...expense.guests];
            } else if (expense.guestName) {
                tempGuestList = [expense.guestName];
            }
            if (typeof renderGuestListInModal === "function") renderGuestListInModal();
        } else {
            if (guestSection) guestSection.classList.add("hidden");
        }
    }
    // ==========================
    // MODO: CREAR
    // ==========================
    else {
        idInput.value = "";
        if (title) title.textContent = "Registrar Nuevo Gasto";
        btnSave.textContent = "Registrar";
        const todayStr = new Date().toISOString().split("T")[0];
        dateInput.value = todayStr;

        // Default Type
        window.toggleExpenseType('personal');

        const toggle = document.getElementById("multi-item-toggle");
        if (toggle) {
            toggle.checked = false;
            // ensure list is reset
            window.tempItemsList = [];
            toggle.dispatchEvent(new Event("change"));
        }

        if (guestSection) guestSection.classList.add("hidden");
        if (guestInput) guestInput.value = "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("no-scroll");
};

function setActiveTag(inputId, containerId, value) {
    if (!value) return;
    const input = document.getElementById(inputId);
    if (input) input.value = value;

    const container = document.getElementById(containerId);
    if (container) {
        const tag = container.querySelector(`button[data-value="${value}"]`);
        if (tag) tag.classList.add("active");
    }
}

window.closeUnifiedExpenseModal = function () {
    const modal = document.getElementById("expense-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.classList.remove("no-scroll");
};

window.handleUnifiedSave = function (event) {
    event.preventDefault();

    try {
        const id = document.getElementById("expense-id-hidden").value;
        const isMultiItem = document.getElementById("multi-item-toggle").checked;

        const description = formatTitleCase(document.getElementById("expense-description").value);
        const amount = parseFloat(document.getElementById("expense-amount").value);
        const date = document.getElementById("expense-date").value;

        const payerId = document.getElementById("expense-payer").value;
        const type = document.getElementById("expense-type").value;
        const category = document.getElementById("expense-category").value;
        const paymentMethodId = document.getElementById("expense-payment-method").value;

        const isFixed = document.getElementById("expense-is-fixed").checked;
        const recurrence = isFixed ? parseInt(document.getElementById("expense-recurrence-months").value) || 12 : 0;

        // Validaciones
        let missing = [];
        if (!description) missing.push("Descripción");
        if (!amount || amount <= 0) missing.push("Monto válido");
        if (!date) missing.push("Fecha");
        if (isMultiItem && window.tempItemsList.length === 0) missing.push("Lista de productos vacía");

        if (missing.length > 0) return showModal(`Faltan campos: ${missing.join(", ")}`);

        const paymentMethod = appState.paymentMethods.find((m) => m.id === paymentMethodId);
        const expenseDateObj = new Date(date + "T00:00:00Z");
        const { startDate, paymentDate } = paymentMethod && paymentMethod.type === "credit" ? getCycleDates(paymentMethod, expenseDateObj) : {};

        const realGuestsToSave = type === "shared" ? tempGuestList : [];

        const expenseData = {
            description,
            amount,
            items: isMultiItem ? window.tempItemsList : [],
            payerId,
            type,
            category,
            paymentMethodId,
            isFixed,
            fixedRecurrenceMonths: recurrence,
            date,
            ccCycleStart: startDate || null,
            ccPaymentDate: paymentDate || null,
            guests: realGuestsToSave,
        };

        let newExpensesArray;

        if (id) {
            newExpensesArray = appState.expenses.map((e) => {
                if (e.id === id) {
                    return { ...e, ...expenseData };
                }
                return e;
            });
        } else {
            const newExpense = {
                id: generateUUID(),
                dateCreated: new Date().toISOString(),
                ...expenseData,
            };
            newExpensesArray = [...appState.expenses, newExpense];
        }

        saveState({ expenses: newExpensesArray });
        closeUnifiedExpenseModal();
        // showModal(id ? "Gasto actualizado correctamente." : "Gasto registrado exitosamente.", null, "Éxito");
    } catch (error) {
        console.error(error);
        showModal("Error al guardar el gasto.", error.message);
    }
};

window.populateModalTags = function () {
    const expenses = appState.expenses || [];
    const categories = [...new Set(expenses.map((e) => e.category))];
    const payerSelect = document.getElementById("expense-payer");
    const methodSelect = document.getElementById("expense-payment-method");
    const catSelect = document.getElementById("expense-category");

    if (payerSelect && appState.participants) {
        const curVal = payerSelect.value;
        let html = '<option value="">Seleccionar pagador...</option>';
        appState.participants.forEach(p => {
            html += `<option value="${p.id}">${p.name}</option>`;
        });
        payerSelect.innerHTML = html;
        if (curVal) payerSelect.value = curVal;
        else if (appState.participants.length > 0) payerSelect.value = appState.participants[0].id;
    }

    if (methodSelect && appState.paymentMethods) {
        const curVal = methodSelect.value;
        let html = '<option value="">Seleccionar método...</option>';
        appState.paymentMethods.forEach(m => {
            const typeLabel = m.type === 'credit' ? 'Crédito' : (m.type === 'debit' ? 'Débito' : 'Efectivo');
            html += `<option value="${m.id}">${m.name} (${typeLabel})</option>`;
        });
        methodSelect.innerHTML = html;
        if (curVal) methodSelect.value = curVal;
        else if (appState.paymentMethods.length > 0) methodSelect.value = appState.paymentMethods[0].id;
    }

    if (catSelect) {
        const curVal = catSelect.value;
        const standardCats = ["Comida", "Hogar", "Servicios", "Supermercado", "Ocio", "Suscripciones", "Transporte", "Salud", "Educación", "Regalos", "Café", "Alcohol", "Ahorro"];
        const allCats = [...new Set([...standardCats, ...categories].filter(Boolean))];
        let html = '<option value="">Seleccionar categoría...</option>';
        allCats.forEach(c => {
            html += `<option value="${c}">${c}</option>`;
        });
        catSelect.innerHTML = html;
        if (curVal) catSelect.value = curVal;
        else catSelect.value = "Comida";
    }
};

window.renderGuestListInModal = function () {
    const chipsContainer = document.getElementById("guest-list-chips");
    if (chipsContainer) {
        if (!tempGuestList || tempGuestList.length === 0) {
            chipsContainer.innerHTML = "";
        } else {
            chipsContainer.innerHTML = tempGuestList.map((g, idx) => `
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 animate-fadeIn">
                    ${g}
                    <button type="button" onclick="window.removeGuestFromList(${idx})" class="text-indigo-400 hover:text-rose-500 transition-colors">
                        <i class="fas fa-times text-[9px]"></i>
                    </button>
                </span>
            `).join('');
        }
    }
    if (window.updateSplitPreview) window.updateSplitPreview();
    if (window.renderTempItemsListInModal) window.renderTempItemsListInModal();
};

window.removeGuestFromList = function (index) {
    if (tempGuestList) {
        tempGuestList.splice(index, 1);
        window.renderGuestListInModal();
    }
};

window.updateSplitPreview = function () {
    const container = document.getElementById("split-breakdown-list");
    if (!container) return;

    const amount = parseFloat(document.getElementById("expense-amount").value) || 0;
    const splitType = document.getElementById("split-type-select")?.value || "equal";
    const isMultiItem = document.getElementById("multi-item-toggle")?.checked;

    let allParticipants = [];
    appState.participants.forEach(p => {
        allParticipants.push({ id: p.id, name: p.name, type: 'user' });
    });
    if (tempGuestList && tempGuestList.length > 0) {
        tempGuestList.forEach((gName, idx) => {
            allParticipants.push({ id: `guest_${idx}`, name: gName, type: 'guest' });
        });
    }

    if (allParticipants.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-[10px] text-slate-400">No hay participantes seleccionados.</p>`;
        return;
    }

    const count = allParticipants.length;
    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2";

    const participantShares = {};
    allParticipants.forEach(p => { participantShares[p.id] = 0; });

    if (isMultiItem && window.tempItemsList && window.tempItemsList.length > 0) {
        let itemsTotalCost = 0;
        window.tempItemsList.forEach(item => {
            const qty = parseFloat(item.quantity) || 1;
            const unitPrice = parseFloat(item.amount) || 0;
            const itemCost = qty * unitPrice;
            itemsTotalCost += itemCost;

            const assignments = item.assignments || {};
            let assignedQtySum = 0;
            Object.keys(assignments).forEach(pId => {
                const pQty = parseFloat(assignments[pId]) || 0;
                if (pQty > 0) {
                    assignedQtySum += pQty;
                    if (participantShares[pId] !== undefined) {
                        participantShares[pId] += pQty * unitPrice;
                    }
                }
            });

            if (assignedQtySum === 0 && item.assignedTo) {
                assignedQtySum = qty;
                if (participantShares[item.assignedTo] !== undefined) {
                    participantShares[item.assignedTo] += itemCost;
                }
            }

            const unassignedQty = Math.max(0, qty - assignedQtySum);
            if (unassignedQty > 0 && count > 0) {
                const unassignedCost = unassignedQty * unitPrice;
                const sharePerPerson = unassignedCost / count;
                allParticipants.forEach(p => {
                    participantShares[p.id] += sharePerPerson;
                });
            }
        });

        const remainingBase = amount - itemsTotalCost;
        if (remainingBase > 0.001 && count > 0) {
            const shareBase = remainingBase / count;
            allParticipants.forEach(p => {
                participantShares[p.id] += shareBase;
            });
        }
    } else {
        if (splitType === 'equal') {
            const share = count > 0 ? amount / count : 0;
            allParticipants.forEach(p => { participantShares[p.id] = share; });
        }
    }

    container.innerHTML = allParticipants.map(p => {
        let valDisplay = "";
        let inputHtml = "";
        const inputClass = "split-input w-12 bg-transparent border-none text-right font-black text-xs text-slate-700 dark:text-white p-0 focus:ring-0 placeholder-slate-300";

        if (isMultiItem && window.tempItemsList && window.tempItemsList.length > 0) {
            valDisplay = `<span class="font-black text-slate-700 dark:text-white text-xs text-right">S/ ${formatCurrencySimple(participantShares[p.id] || 0)}</span>`;
        } else if (splitType === 'equal') {
            valDisplay = `<span class="font-black text-slate-700 dark:text-white text-xs text-right">S/ ${formatCurrencySimple(participantShares[p.id] || 0)}</span>`;
        } else if (splitType === 'percent') {
            const percentVal = (100 / count).toFixed(1);
            inputHtml = `<div class="flex items-center justify-end gap-0.5 border-b border-indigo-100 dark:border-indigo-800 focus-within:border-indigo-500 transition-colors"><input type="number" class="${inputClass}" value="${percentVal}" data-id="${p.id}" data-type="percent" /> <span class="text-[9px] font-bold text-slate-400">%</span></div>`;
        } else if (splitType === 'exact') {
            const exactVal = (amount / count).toFixed(2);
            inputHtml = `<div class="flex items-center justify-end gap-0.5 border-b border-indigo-100 dark:border-indigo-800 focus-within:border-indigo-500 transition-colors"><span class="text-[9px] font-bold text-slate-400">S/</span><input type="number" class="${inputClass}" value="${exactVal}" data-id="${p.id}" data-type="exact" /></div>`;
        }

        const canDelete = p.type === 'guest';
        const deleteBtn = canDelete
            ? `<button onclick="window.removeParticipant('${p.id}')" class="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Eliminar"><i class="fas fa-times-circle text-xs"></i></button>`
            : `<i class="fas fa-lock text-[8px] text-slate-300 p-1" title="Registrado"></i>`;

        return `
      <div class="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm group min-w-0">
          <div class="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
             ${deleteBtn}
             <span class="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate" title="${p.name}">${p.name}</span>
          </div>
          <div class="flex-shrink-0 ml-1.5 text-right">
            ${valDisplay}
            ${inputHtml}
          </div>
      </div>`;
    }).join('');
};

window.handleSplitChange = function (changedInput, totalAmount, count) {
    const val = parseFloat(changedInput.value) || 0;
    const type = changedInput.dataset.type;
    const currentId = changedInput.dataset.id;

    if (type === 'percent') {
        const remaining = 100 - val;
        const othersShare = remaining / (count - 1);
        document.querySelectorAll('.split-input').forEach(inp => {
            if (inp.dataset.id !== currentId) inp.value = othersShare.toFixed(1);
        });
    } else {
        const remaining = totalAmount - val;
        const othersShare = remaining / (count - 1);
        document.querySelectorAll('.split-input').forEach(inp => {
            if (inp.dataset.id !== currentId) inp.value = othersShare.toFixed(2);
        });
    }
};

window.removeParticipant = function (id) {
    if (id.startsWith('guest_') || id.startsWith('guest-')) {
        const parts = id.split('_');
        const idx = parts.length > 1 ? parseInt(parts[1]) : parseInt(id.split('-')[1]);
        window.removeGuestFromList(idx);
    } else {
        showModal("No se puede eliminar", "Los usuarios registrados son fijos en esta demo.");
    }
};

window.selectedTempItemIds = new Set();

window.toggleSelectItem = function (id, isChecked) {
    if (!window.selectedTempItemIds) window.selectedTempItemIds = new Set();
    if (isChecked) {
        window.selectedTempItemIds.add(String(id));
    } else {
        window.selectedTempItemIds.delete(String(id));
    }
    updateBulkBarState();
};

window.toggleSelectAllItems = function (isChecked) {
    if (!window.selectedTempItemIds) window.selectedTempItemIds = new Set();
    window.selectedTempItemIds.clear();
    if (isChecked && window.tempItemsList) {
        window.tempItemsList.forEach(item => window.selectedTempItemIds.add(String(item.id)));
    }
    window.renderTempItemsListInModal();
};

window.bulkAssignSelected = function (assigneeId) {
    if (!window.selectedTempItemIds || window.selectedTempItemIds.size === 0 || !assigneeId) return;
    if (!window.tempItemsList) return;

    window.tempItemsList.forEach(item => {
        if (window.selectedTempItemIds.has(String(item.id))) {
            const totalQty = parseFloat(item.quantity) || 1;
            if (assigneeId === 'equal') {
                item.assignments = {};
            } else {
                item.assignments = { [assigneeId]: totalQty };
            }
        }
    });

    window.renderTempItemsListInModal();
};

window.deleteSelectedItems = function () {
    if (!window.selectedTempItemIds || window.selectedTempItemIds.size === 0) return;
    if (!window.tempItemsList) return;

    window.tempItemsList = window.tempItemsList.filter(item => !window.selectedTempItemIds.has(String(item.id)));
    window.selectedTempItemIds.clear();
    window.renderTempItemsListInModal();
};

function updateBulkBarState() {
    const bulkBar = document.getElementById("bulk-item-actions-bar");
    const countDisplay = document.getElementById("selected-items-count-display");
    const selectAllCheckbox = document.getElementById("select-all-items-checkbox");
    const totalItems = window.tempItemsList ? window.tempItemsList.length : 0;
    const selectedCount = window.selectedTempItemIds ? window.selectedTempItemIds.size : 0;

    if (countDisplay) countDisplay.textContent = `${selectedCount} sel.`;
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = totalItems > 0 && selectedCount === totalItems;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalItems;
    }
    if (bulkBar) {
        bulkBar.classList.toggle("hidden", selectedCount === 0);
    }
}

window.renderTempItemsListInModal = function () {
    const container = document.getElementById("expense-item-list-container");
    const amountInput = document.getElementById("expense-amount");
    const itemsCountSidebar = document.getElementById("items-count-display-sidebar");
    const bulkAssignSelect = document.getElementById("bulk-assignee-select");
    const expenseType = document.getElementById("expense-type")?.value || "personal";
    const isShared = expenseType === "shared";

    if (!container) return;

    container.innerHTML = "";
    let total = 0;
    let count = 0;

    let allParticipants = [];
    if (isShared) {
        if (typeof appState !== 'undefined' && appState.participants) {
            appState.participants.forEach(p => allParticipants.push({ id: p.id, name: p.name }));
        }
        if (typeof tempGuestList !== 'undefined') {
            tempGuestList.forEach((g, gIdx) => {
                allParticipants.push({ id: `guest_${gIdx}`, name: `${g} (Inv)` });
            });
        }
    }

    if (bulkAssignSelect && isShared) {
        let opts = `
            <option value="">Asignar a...</option>
            <option value="equal">Equitativo (Todos)</option>
        `;
        allParticipants.forEach(p => {
            opts += `<option value="${p.id}">${p.name} (100%)</option>`;
        });
        bulkAssignSelect.innerHTML = opts;
    }

    if (!window.tempItemsList || window.tempItemsList.length === 0) {
        if (window.selectedTempItemIds) window.selectedTempItemIds.clear();
        container.innerHTML = `
      <div class="p-8 text-center space-y-2">
        <div class="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
          <i class="fas fa-shopping-basket text-slate-200 text-lg"></i>
        </div>
        <p class="text-xs font-bold text-slate-400">Lista vacía</p>
      </div>
    `;
    } else {
        window.tempItemsList.forEach((item) => {
            const qty = parseFloat(item.quantity) || 1;
            const unitPrice = parseFloat(item.amount) || 0;
            const subtotal = qty * unitPrice;
            total += subtotal;
            count++;

            const isSelected = window.selectedTempItemIds && window.selectedTempItemIds.has(String(item.id));
            const assignments = item.assignments || {};
            const assignedUnits = Object.keys(assignments).reduce((sum, pId) => sum + (parseFloat(assignments[pId]) || 0), 0);
            const unassignedUnits = Math.max(0, qty - assignedUnits);

            let assignmentSectionHtml = "";
            if (isShared && allParticipants.length > 0) {
                const participantBadges = allParticipants.map(p => {
                    const currentQty = (assignments && parseFloat(assignments[p.id])) || 0;
                    return `
                      <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-700">
                        <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]" title="${p.name}">${p.name}</span>
                        <div class="flex items-center gap-1">
                          <button type="button" class="size-5 flex items-center justify-center rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-bold shadow-xs transition-colors" onclick="window.changeTempItemQty('${item.id}', '${p.id}', -1)">-</button>
                          <span class="text-[10px] font-black text-slate-800 dark:text-white w-4 text-center">${currentQty}</span>
                          <button type="button" class="size-5 flex items-center justify-center rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-bold shadow-xs transition-colors" onclick="window.changeTempItemQty('${item.id}', '${p.id}', 1)">+</button>
                        </div>
                      </div>
                    `;
                }).join("");

                assignmentSectionHtml = `
                  <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1 pl-6">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Asignar cantidades:</span>
                      <span class="text-[9px] font-bold ${unassignedUnits > 0 ? 'text-amber-500' : 'text-emerald-500'}">
                        ${unassignedUnits > 0 ? `${unassignedUnits} compartida(s) equitativamente` : '✓ Todo asignado'}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      ${participantBadges}
                    </div>
                  </div>
                `;
            }

            container.insertAdjacentHTML("beforeend", `
                <div class="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-200' : ''}">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      ${isShared ? `
                        <input type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4" ${isSelected ? 'checked' : ''} onchange="window.toggleSelectItem('${item.id}', this.checked)" />
                      ` : ''}
                      <div class="flex-1 min-w-0">
                        <input type="text" class="w-full text-xs font-bold text-slate-800 dark:text-white bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 dark:focus:bg-slate-800 focus:ring-0 px-1 py-0.5 rounded transition-all" value="${item.desc || ''}" onchange="window.updateTempItemProp('${item.id}', 'desc', this.value)" placeholder="Descripción..." />
                      </div>
                    </div>
                    
                    <!-- Cantidad Editable -->
                    <div class="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                      <button type="button" class="size-4 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[10px] flex items-center justify-center" onclick="window.updateItemTotalQty('${item.id}', -1)">-</button>
                      <input type="number" min="1" step="1" class="w-8 text-center font-bold text-xs text-slate-800 dark:text-white bg-transparent border-none p-0 focus:ring-0" value="${qty}" onchange="window.updateTempItemProp('${item.id}', 'quantity', this.value)" />
                      <button type="button" class="size-4 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[10px] flex items-center justify-center" onclick="window.updateItemTotalQty('${item.id}', 1)">+</button>
                    </div>

                    <!-- Precio Unitario Editable -->
                    <div class="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                      <span class="text-[10px] font-bold text-slate-400 mr-0.5">S/</span>
                      <input type="number" min="0.01" step="0.01" class="w-14 text-right font-bold text-xs text-slate-800 dark:text-white bg-transparent border-none p-0 focus:ring-0" value="${unitPrice.toFixed(2)}" onchange="window.updateTempItemProp('${item.id}', 'amount', this.value)" />
                    </div>

                    <!-- Subtotal -->
                    <div class="text-right min-w-[60px]">
                       <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">S/ ${subtotal.toFixed(2)}</span>
                    </div>

                    <!-- Botón Borrar -->
                    <div class="flex-shrink-0 flex justify-center">
                      <button type="button" class="text-slate-300 hover:text-rose-500 transition-colors p-1" 
                         onclick="window.deleteTempItem('${item.id}')" title="Eliminar ítem">
                         <i class="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </div>
                  ${assignmentSectionHtml}
                </div>
            `);
        });
    }

    updateBulkBarState();

    if (itemsCountSidebar) itemsCountSidebar.textContent = `${count} ítem${count !== 1 ? "s" : ""}`;

    const toggle = document.getElementById("multi-item-toggle");
    if (toggle && toggle.checked && amountInput) {
        amountInput.value = total.toFixed(2);
        amountInput.dispatchEvent(new Event("input"));
        amountInput.readOnly = true;
        amountInput.classList.add("bg-slate-50", "text-slate-500");
    } else if (toggle && !toggle.checked && amountInput) {
        amountInput.readOnly = false;
        amountInput.classList.remove("bg-slate-50", "text-slate-500");
    }

    if (window.updateSplitPreview) window.updateSplitPreview();
};

window.updateTempItemProp = function (itemId, prop, value) {
    if (!window.tempItemsList) return;

    const item = window.tempItemsList.find(i => String(i.id) === String(itemId));
    if (!item) return;

    if (prop === 'desc') {
        item.desc = value.trim() || item.desc;
    } else if (prop === 'quantity') {
        const newQty = Math.max(1, parseFloat(value) || 1);
        item.quantity = newQty;
        if (item.assignments) {
            let assignedSum = 0;
            Object.keys(item.assignments).forEach(pId => {
                const pQty = parseFloat(item.assignments[pId]) || 0;
                if (assignedSum + pQty > newQty) {
                    const allowed = Math.max(0, newQty - assignedSum);
                    if (allowed > 0) item.assignments[pId] = allowed;
                    else delete item.assignments[pId];
                    assignedSum += allowed;
                } else {
                    assignedSum += pQty;
                }
            });
        }
    } else if (prop === 'amount') {
        item.amount = Math.max(0, parseFloat(value) || 0);
    }

    window.renderTempItemsListInModal();
};

window.updateItemTotalQty = function (itemId, delta) {
    if (!window.tempItemsList) return;

    const item = window.tempItemsList.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const curQty = parseFloat(item.quantity) || 1;
    const newQty = Math.max(1, curQty + delta);
    window.updateTempItemProp(itemId, 'quantity', newQty);
};

window.deleteTempItem = function (id) {
    if (!window.tempItemsList) return;
    window.tempItemsList = window.tempItemsList.filter(i => String(i.id) !== String(id));
    if (window.selectedTempItemIds) window.selectedTempItemIds.delete(String(id));
    window.renderTempItemsListInModal();
};

window.changeTempItemQty = function (itemId, participantId, delta) {
    if (!window.tempItemsList) return;
    const item = window.tempItemsList.find(i => String(i.id) === String(itemId));
    if (!item) return;
    if (!item.assignments) item.assignments = {};

    const currentAssigned = parseFloat(item.assignments[participantId]) || 0;
    const totalItemQty = parseFloat(item.quantity) || 1;
    const totalAssignedOther = Object.keys(item.assignments).reduce((s, pId) => {
        return pId === participantId ? s : s + (parseFloat(item.assignments[pId]) || 0);
    }, 0);

    let newQty = currentAssigned + delta;
    if (newQty < 0) newQty = 0;
    if (newQty + totalAssignedOther > totalItemQty) {
        newQty = totalItemQty - totalAssignedOther;
    }

    if (newQty > 0) {
        item.assignments[participantId] = newQty;
    } else {
        delete item.assignments[participantId];
    }

    window.renderTempItemsListInModal();
};

function handleTagSelection(e) {
    const btn = e.target.closest(".filter-tag");
    if (!btn) return;

    const container = btn.parentElement;
    let inputId = "";

    if (container.id === "modal-payer-tags") inputId = "expense-payer";
    if (container.id === "modal-type-tags") inputId = "expense-type";
    if (container.id === "modal-payment-method-tags") inputId = "expense-payment-method";
    if (container.id === "modal-category-tags-sidebar") inputId = "expense-category";

    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (!input) return;

    const isAlreadyActive = btn.classList.contains("active");

    container.querySelectorAll("button").forEach(t => {
        t.classList.remove("active");
        t.style.opacity = "0.6";
        t.style.borderColor = "transparent";
    });

    if (!isAlreadyActive) {
        btn.classList.add("active");
        btn.style.opacity = "1";
        btn.style.borderColor = "currentColor";
        input.value = btn.getAttribute("data-value");
    } else {
        input.value = "";
        container.querySelectorAll("button").forEach(t => t.style.opacity = "1");
    }
}

function setupUnifiedExpenseListeners() {
    const amountInput = document.getElementById("expense-amount");
    const displayAmount = document.getElementById("display-expense-amount");
    const finalTotalDisplay = document.getElementById("final-total-display");
    const baseAmountDisplay = document.getElementById("base-amount-display");
    const itemsTotalDisplay = document.getElementById("items-total-display");

    const multiToggle = document.getElementById("multi-item-toggle");
    const addItemBtn = document.getElementById("add-item-to-list-btn");

    const itemDescInput = document.querySelector('input[name="new-item-desc-input"]');
    const itemQtyInput = document.querySelector('input[name="new-item-quantity-input"]');
    const itemPriceInput = document.querySelector('input[name="new-item-amount-input"]');
    const itemSubtotalDisplay = document.getElementById("new-item-subtotal-display");

    // Helper para actualizar todos los displays de monto
    const updateAllDisplays = (val) => {
        const numericVal = parseFloat(val) || 0;
        const itemsTotal = itemsTotalDisplay ? parseFloat(itemsTotalDisplay.textContent.replace(/[^\d.-]/g, "")) || 0 : 0;

        if (displayAmount) displayAmount.textContent = numericVal.toFixed(2);
        if (finalTotalDisplay) finalTotalDisplay.textContent = formatCurrency(numericVal);
        if (baseAmountDisplay) baseAmountDisplay.textContent = formatCurrency(Math.max(0, numericVal - itemsTotal));

        // Auto-split update
        if (window.updateSplitPreview) window.updateSplitPreview();
    };

    // Tag Listeners
    document.querySelectorAll(".filter-tag").forEach(b => b.addEventListener("click", handleTagSelection));

    // Listeners for Split Type (Fixed for Standalone)
    document.querySelectorAll(".split-tag").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const val = e.target.dataset.val;
            const select = document.getElementById("split-type-select");
            if (select) select.value = val;

            // Visual update
            document.querySelectorAll(".split-tag").forEach(b => {
                b.className = "split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-400 hover:text-slate-600 border border-transparent";
                b.classList.remove("bg-indigo-100", "text-indigo-700", "active");
            });
            // Add active styles
            e.target.className = "split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all bg-indigo-100 text-indigo-700 active";

            if (window.updateSplitPreview) window.updateSplitPreview();
        });
    });
    // Specifically for dynamic containers that might be populated later, we rely on them assigning listeners on render

    // Amount Sync
    if (amountInput) {
        amountInput.addEventListener("input", (e) => updateAllDisplays(e.target.value));
    }

    // Multi Item Toggle
    if (multiToggle) {
        multiToggle.onchange = (e) => {
            const isMulti = e.target.checked;
            if (amountInput) {
                amountInput.readOnly = isMulti;
                amountInput.classList.toggle("bg-slate-50", isMulti);
            }
            document.getElementById("multi-item-fields").classList.toggle("hidden", !isMulti);
            if (isMulti) window.renderTempItemsListInModal();
        };
    }

    // Add Item
    if (addItemBtn) {
        addItemBtn.onclick = (e) => {
            e.preventDefault();
            const desc = itemDescInput.value.trim();
            const qty = parseFloat(itemQtyInput.value) || 1;
            const price = parseFloat(itemPriceInput.value) || 0;

            if (!desc || price <= 0) return;

            if (!window.tempItemsList) window.tempItemsList = [];
            window.tempItemsList.push({ id: generateUUID(), desc, quantity: qty, amount: price });

            itemDescInput.value = "";
            itemQtyInput.value = "1";
            itemPriceInput.value = "";

            window.renderTempItemsListInModal();
            itemDescInput.focus();
        };
    }

    // Add Guest
    const btnAddGuest = document.getElementById("btn-add-guest");
    const guestInput = document.getElementById("new-guest-name");

    const handleAddGuest = () => {
        const name = guestInput.value.trim();
        if (name) {
            tempGuestList.push(name);
            guestInput.value = "";
            window.updateSplitPreview();
        }
    };

    if (btnAddGuest) btnAddGuest.onclick = handleAddGuest;
    if (guestInput) {
        guestInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGuest();
            }
        };
    }

    // Register Form Submit
    const form = document.getElementById("unified-expense-form");
    if (form) {
        form.onsubmit = window.handleUnifiedSave;
    }
}

// Helper for currency formatting
function formatCurrencySimple(val) {
    return parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
    setupUnifiedExpenseListeners();
    // Pre-populate tags on load so they are ready
    window.populateModalTags();
});

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
    // CategorÃ­as estÃ¡ndar
    categories: [
        { id: 'c1', name: 'Comida', subcategories: ['Almuerzo', 'Cena', 'Snacks', 'Bebidas'] },
        { id: 'c2', name: 'Transporte', subcategories: ['Taxi', 'Bus', 'Gasolina', 'Mantenimiento'] },
        { id: 'c3', name: 'Hogar', subcategories: ['Limpieza', 'Mantenimiento', 'DecoraciÃ³n'] },
        { id: 'c4', name: 'Ocio', subcategories: ['Cine', 'Juegos', 'Salidas'] },
        { id: 'c5', name: 'Salud', subcategories: ['Farmacia', 'Consulta', 'Seguro'] },
        { id: 'c6', name: 'Servicios', subcategories: ['Luz', 'Agua', 'Internet'] },
        { id: 'c7', name: 'Supermercado', subcategories: [] }
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
// LÃ“GICA DEL MODAL (COPIA EXACTA DE FUNCIONES CLAVE - MEJORADA)
// ================================================================

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

        setActiveTag("expense-payer", "modal-payer-tags", expense.payerId);
        setActiveTag("expense-type", "modal-type-tags", expense.type);
        setActiveTag("expense-payment-method", "modal-payment-method-tags", expense.paymentMethodId);
        setActiveTag("expense-category", "modal-category-tags", expense.category);

        if (typeof updateModalSubcategoryTags === "function") updateModalSubcategoryTags();
        setTimeout(() => {
            setActiveTag("expense-subcategory", "modal-subcategory-tags", expense.subcategory);
        }, 0);

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
        // Note: In standalone we use ID as value, check logic in populate
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
        const subcategory = formatTitleCase(document.getElementById("expense-subcategory").value);
        const paymentMethodId = document.getElementById("expense-payment-method").value;

        const isFixed = document.getElementById("expense-is-fixed").checked;
        const recurrence = isFixed ? parseInt(document.getElementById("expense-recurrence-months").value) || 12 : 0;

        // Validaciones
        let missing = [];
        if (!description) missing.push("DescripciÃ³n");
        if (!amount || amount <= 0) missing.push("Monto vÃ¡lido");
        if (!date) missing.push("Fecha");
        // Relaxed for demo
        // if (!payerId) missing.push("Pagador");
        // if (!category) missing.push("CategorÃ­a");
        // if (!paymentMethodId) missing.push("MÃ©todo de Pago");
        if (isMultiItem && window.tempItemsList.length === 0) missing.push("Lista de productos vacÃ­a");

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
            subcategory: subcategory || null,
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
        showModal(id ? "Gasto actualizado correctamente." : "Gasto registrado exitosamente.", null, "Ã‰xito");
    } catch (error) {
        console.error(error);
        showModal("Error al guardar el gasto.", error.message);
    }
};

window.populateModalTags = function () {
    const expenses = appState.expenses || [];
    const categories = [...new Set(expenses.map((e) => e.category))];
    const payerContainer = document.getElementById("modal-payer-tags");
    const methodContainer = document.getElementById("modal-payment-method-tags");
    const catContainerSidebar = document.getElementById("modal-category-tags-sidebar");

    const catIcons = {
        "Comida": "utensils", "Hogar": "home", "Salud": "heartbeat", "Transporte": "bus",
        "Educación": "graduation-cap", "Ocio": "gamepad", "Regalos": "gift", "Servicios": "bolt",
        "Suscripciones": "mobile-alt", "Mascotas": "paw", "Supermercado": "shopping-cart",
        "Café": "coffee", "Alcohol": "glass-martini-alt", "Ahorro": "piggy-bank"
    };

    const renderTags = (container, list, type) => {
        if (!container) return;

        // More compact styling to match reference
        const baseClass = "filter-tag px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 border";

        let colors = "";
        let iconClass = "";

        if (type === "payer") {
            // Users: Subtle blue theme
            colors = "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/30";
            iconClass = "fas fa-user";
        } else if (type === "method") {
            // Methods: Subtle green theme
            colors = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
            iconClass = "fas fa-credit-card";
        } else if (type === "cat") {
            // Categories: Subtle orange theme
            colors = "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/30 hover:bg-orange-100 dark:hover:bg-orange-900/30";
        }

        container.innerHTML = list.map(item => {
            const name = item.name || item;
            const value = item.name || item;

            const icon = type === "cat" ? (catIcons[name] || "folder") : "";
            const iconHtml = icon ? `<i class="fas fa-${icon} text-[10px] opacity-80"></i>` : (iconClass ? `<i class="${iconClass} text-[10px] opacity-80"></i>` : ``);

            return `<button type="button" data-value="${value}" 
        class="${baseClass} ${colors}">
        ${iconHtml}
        ${name}
      </button>`;
        }).join('');
    };

    if (payerContainer) renderTags(payerContainer, appState.participants, "payer");
    if (methodContainer) renderTags(methodContainer, appState.paymentMethods, "method");

    if (catContainerSidebar) {
        const standardCats = ["Comida", "Hogar", "Servicios", "Supermercado", "Ocio", "Suscripciones", "Transporte"];
        const allCats = [...new Set([...standardCats, ...categories].filter(Boolean))];
        renderTags(catContainerSidebar, allCats, "cat");
    }
};

window.renderGuestListInModal = function () {
    if (window.updateSplitPreview) window.updateSplitPreview();
};

window.removeGuestFromList = function (index) {
    if (tempGuestList) {
        tempGuestList.splice(index, 1);
        if (window.updateSplitPreview) window.updateSplitPreview();
    }
};

window.updateSplitPreview = function () {
    const container = document.getElementById("split-breakdown-list");
    if (!container) return;

    const amount = parseFloat(document.getElementById("expense-amount").value) || 0;
    const splitType = document.getElementById("split-type-select").value || "equal";

    let allParticipants = [];

    // Registered
    appState.participants.forEach(p => {
        allParticipants.push({ id: p.id, name: p.name, type: 'user' });
    });

    // Guests
    if (tempGuestList && tempGuestList.length > 0) {
        tempGuestList.forEach((gName, idx) => {
            allParticipants.push({ id: `guest-${idx}`, name: gName, type: 'guest' });
        });
    }

    if (allParticipants.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-[10px] text-slate-400">No hay participantes seleccionados.</p>`;
        return;
    }

    const count = allParticipants.length;
    let share = 0;
    if (splitType === 'equal') {
        share = amount / count;
    }

    // Responsive Grid: 1 col mobile, up to 4 cols desktop
    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2";

    container.innerHTML = allParticipants.map(p => {
        let valDisplay = "";
        let inputHtml = "";

        // Base input class for cleaner look
        const inputClass = "split-input w-12 bg-transparent border-none text-right font-black text-xs text-slate-700 dark:text-white p-0 focus:ring-0 placeholder-slate-300";

        if (splitType === 'equal') {
            valDisplay = `<span class="font-black text-slate-700 dark:text-white text-xs text-right">S/ ${formatCurrencySimple(share)}</span>`;
        } else if (splitType === 'percent') {
            const percentVal = (100 / count).toFixed(1);
            inputHtml = `<div class="flex items-center justify-end gap-0.5 border-b border-indigo-100 dark:border-indigo-800 focus-within:border-indigo-500 transition-colors"><input type="number" class="${inputClass}" value="${percentVal}" data-id="${p.id}" data-type="percent" /> <span class="text-[9px] font-bold text-slate-400">%</span></div>`;
        } else if (splitType === 'exact') {
            const exactVal = (amount / count).toFixed(2);
            inputHtml = `<div class="flex items-center justify-end gap-0.5 border-b border-indigo-100 dark:border-indigo-800 focus-within:border-indigo-500 transition-colors"><span class="text-[9px] font-bold text-slate-400">S/</span><input type="number" class="${inputClass}" value="${exactVal}" data-id="${p.id}" data-type="exact" /></div>`;
        }

        const canDelete = p.type === 'guest';
        // Delete button inside the flex flow, not absolute
        const deleteBtn = canDelete
            ? `<button onclick="window.removeParticipant('${p.id}')" class="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Eliminar"><i class="fas fa-times-circle text-xs"></i></button>`
            : `<i class="fas fa-lock text-[8px] text-slate-300 p-1" title="Registrado"></i>`;

        return `
      <div class="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm group min-w-0">
          
          <!-- Left: Name & Icon -->
          <div class="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
             ${deleteBtn}
             <span class="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate" title="${p.name}">${p.name}</span>
          </div>

          <!-- Right: Amount/Input -->
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
    if (id.startsWith('guest-')) {
        const idx = parseInt(id.split('-')[1]);
        window.removeGuestFromList(idx);
    } else {
        showModal("No se puede eliminar", "Los usuarios registrados son fijos en esta demo.");
    }
}

window.updateModalSubcategoryTags = function () {
    const catInput = document.getElementById("expense-category");
    const subSection = document.getElementById("modal-subcategory-section-sidebar");
    const subContainer = document.getElementById("modal-subcategory-tags-sidebar");

    if (!catInput || !subSection || !subContainer) return;

    const categoryName = catInput.value; // Name in value
    const category = appState.categories.find(c => c.name === categoryName);

    if (!category || !category.subcategories || category.subcategories.length === 0) {
        subSection.classList.add("hidden");
        return;
    }

    subSection.classList.remove("hidden");
    subContainer.innerHTML = category.subcategories.map(sub => `
    <button type="button" data-value="${sub}" 
      class="filter-tag px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 text-[9px] font-bold uppercase tracking-tight transition-all hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">
      ${sub}
    </button>
  `).join('');

    // Re-attach listeners manually since they are dynamic
    subContainer.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", handleTagSelection);
    });
};

window.renderTempItemsListInModal = function () {
    const container = document.getElementById("expense-item-list-container");
    const amountInput = document.getElementById("expense-amount");
    const itemsCountSidebar = document.getElementById("items-count-display-sidebar");

    if (!container) return;

    container.innerHTML = "";
    let total = 0;
    let count = 0;

    if (!window.tempItemsList || window.tempItemsList.length === 0) {
        container.innerHTML = `
      <div class="p-8 text-center space-y-2">
        <div class="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
          <i class="fas fa-shopping-basket text-slate-200 text-lg"></i>
        </div>
        <p class="text-xs font-bold text-slate-400">Lista vacÃ­a</p>
      </div>
    `;
    } else {
        window.tempItemsList.forEach((item, index) => {
            const subtotal = (item.quantity || 1) * (item.amount || 0);
            total += subtotal;
            count++;

            container.insertAdjacentHTML("beforeend", `
        <div class="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
          <div class="col-span-6 pl-2">
            <div class="text-xs font-bold text-slate-700 dark:text-white truncate" title="${item.desc}">${item.desc}</div>
          </div>
          <div class="col-span-2 text-center text-xs font-semibold text-slate-500">${item.quantity || 1}</div>
          <div class="col-span-3 text-right pr-2">
             <span class="text-[10px] text-slate-400">S/</span>
             <span class="text-xs font-bold text-slate-800 dark:text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div class="col-span-1 text-center">
            <button type="button" class="text-slate-300 hover:text-rose-500 transition-colors p-1" 
               onclick="window.deleteTempItem('${item.id}')">
               <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      `);
        });
    }

    // Update Sidebar Count if exists
    if (itemsCountSidebar) itemsCountSidebar.textContent = `${count} Ã­tem${count !== 1 ? "s" : ""}`;

    const toggle = document.getElementById("multi-item-toggle");
    // CRITICAL: Update main amount ONLY if items exist, otherwise let user type
    if (toggle && toggle.checked && amountInput) {
        amountInput.value = total.toFixed(2);
        // Dispatch input event to update other calculations
        amountInput.dispatchEvent(new Event("input"));
        // Lock input to prevent discrepancies
        amountInput.readOnly = true;
        amountInput.classList.add("bg-slate-50", "text-slate-500");
    } else if (toggle && !toggle.checked && amountInput) {
        amountInput.readOnly = false;
        amountInput.classList.remove("bg-slate-50", "text-slate-500");
    }
};

window.deleteTempItem = function (id) {
    if (!window.tempItemsList) return;
    // Ensure we compare strings properly
    window.tempItemsList = window.tempItemsList.filter(i => String(i.id) !== String(id));
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
    if (container.id === "modal-subcategory-tags-sidebar") inputId = "expense-subcategory";

    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (!input) return;

    // Toggle logic
    const isAlreadyActive = btn.classList.contains("active");

    // Reset siblings
    container.querySelectorAll("button").forEach(t => {
        // Remove all specific color classes from siblings
        t.classList.remove("active", "bg-blue-100", "text-blue-700", "bg-emerald-100", "text-emerald-700", "bg-orange-100", "text-orange-700");
        // Note: We don't need to add text-slate-500 because the base classes handle it via text-color classes in renderTags 
        // Actually, my renderTags logic hardcodes text colors in "colors" variable.
        // So to "reset", we must effectively lower opacity or style? 
        // The current logic in app.js re-renders or toggles specific classes.
        // In standalone, let's keep it simple: "Active" adds a ring or darker shade.
        // For improved design: I already set hover/base colors. Active should be distinct.
        t.style.opacity = "0.6";
        t.style.borderColor = "transparent";
    });

    if (!isAlreadyActive) {
        btn.classList.add("active");
        btn.style.opacity = "1";
        btn.style.borderColor = "currentColor"; // Use text color as border
        input.value = btn.getAttribute("data-value");

        if (inputId === "expense-category") {
            window.updateModalSubcategoryTags();
        }
    } else {
        input.value = "";
        if (inputId === "expense-category") {
            document.getElementById("modal-subcategory-section-sidebar").classList.add("hidden");
        }
        // Reset all opacity
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

    // Type Toggle Helper
    window.toggleExpenseType = (type) => {
        document.getElementById("expense-type").value = type;
        const pBtn = document.getElementById("type-btn-personal");
        const sBtn = document.getElementById("type-btn-shared");
        const guestSection = document.getElementById("guest-management-section");
        const sharedBadge = document.getElementById("shared-badge");

        if (type === "shared") {
            pBtn.className = "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500";
            sBtn.className = "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm";

            if (guestSection) guestSection.classList.remove("hidden");
            if (sharedBadge) {
                sharedBadge.classList.add("inline-flex");
                sharedBadge.classList.remove("hidden");
            }
            window.updateSplitPreview();
        } else {
            pBtn.className = "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm";
            sBtn.className = "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500";

            if (guestSection) guestSection.classList.add("hidden");
            if (sharedBadge) {
                sharedBadge.classList.remove("inline-flex");
                sharedBadge.classList.add("hidden");
            }
        }
    };

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

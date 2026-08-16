/**
 * @class ModalTransaccion
 * @extends HTMLElement
 * @description Componente nativo para el registro de Gastos e Ingresos.
 * Inyecta un modal híbrido (Light DOM) con diseño de alta densidad visual y ergonómico.
 */
export class ModalTransaccion extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        this.dispatchEvent(new CustomEvent('modal-mounted', { bubbles: true }));
    }

    attachEvents() {
        const multiToggle = this.querySelector('#multi-item-toggle');
        const multiFields = this.querySelector('#multi-item-fields');
        const amountInput = this.querySelector('#expense-amount');

        if (multiToggle) {
            multiToggle.addEventListener('change', (e) => {
                const isMulti = e.target.checked;
                if (multiFields) {
                    if (isMulti) {
                        multiFields.classList.remove('hidden');
                    } else {
                        multiFields.classList.add('hidden');
                    }
                }
                if (amountInput) {
                    amountInput.readOnly = isMulti;
                    if (isMulti) {
                        amountInput.classList.add('bg-slate-50', 'text-slate-500');
                    } else {
                        amountInput.classList.remove('bg-slate-50', 'text-slate-500');
                    }
                }
            });
        }

        const modal = this.querySelector('#expense-modal');
        const closeBtn = this.querySelector('#close-expense-modal-btn');
        const cancelBtn = this.querySelector('#cancel-expense-modal-btn');

        const closeModal = () => {
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                document.body.classList.remove('no-scroll');
            }
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    }

    render() {
        this.innerHTML = `
        <div id="expense-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/50 backdrop-blur-md p-0 lg:p-4 transition-all duration-300">
            <div class="flex flex-col w-full max-w-5xl bg-white dark:bg-[#0f172a] lg:rounded-3xl shadow-2xl overflow-hidden h-full lg:h-[88vh] ring-1 ring-white/10">

                <!-- Modal Header -->
                <div class="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <i class="fas fa-receipt text-sm"></i>
                        </div>
                        <div>
                            <h2 id="expense-modal-title" class="text-base font-black text-slate-900 dark:text-white">Registrar Gasto</h2>
                            <p class="text-[10px] text-slate-400">Detalles de la transacción</p>
                        </div>
                    </div>

                    <!-- Type Selector Pill -->
                    <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button type="button" id="type-btn-personal" onclick="toggleExpenseType('personal')" class="px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs">Personal</button>
                        <button type="button" id="type-btn-shared" onclick="toggleExpenseType('shared')" class="px-3.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500">Compartido</button>
                    </div>

                    <button type="button" id="close-expense-modal-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>

                <form id="unified-expense-form" class="flex flex-col lg:flex-row w-full flex-1 overflow-hidden relative">
                    <input type="hidden" id="expense-id-hidden" />
                    <input type="hidden" id="expense-type" value="personal" />

                    <!-- LEFT SIDEBAR (General Data / Selects) -->
                    <aside class="w-full lg:w-[320px] flex-shrink-0 bg-slate-50/80 dark:bg-[#1e293b]/40 border-b lg:border-r border-slate-100 dark:border-slate-800 flex flex-col z-20 overflow-y-auto custom-scrollbar">
                        <div class="p-5 space-y-3.5 flex-1">
                            <!-- Hero Amount Display -->
                            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center">
                                <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Monto Total</span>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-xs font-bold text-slate-400">S/</span>
                                    <span class="text-3xl font-black text-slate-800 dark:text-white tracking-tight" id="display-expense-amount">0.00</span>
                                </div>
                            </div>

                            <!-- Description -->
                            <div class="space-y-1">
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Descripción</label>
                                <input type="text" id="expense-description" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs" placeholder="¿Qué estás pagando?" autocomplete="off" />
                            </div>

                            <!-- Date & Amount Grid -->
                            <div class="grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Fecha</label>
                                    <input id="expense-date" type="text" datepicker datepicker-autohide datepicker-format="yyyy-mm-dd" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all shadow-xs" placeholder="YYYY-MM-DD" autocomplete="off" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Monto (S/)</label>
                                    <input id="expense-amount" type="number" step="0.01" min="0.01" placeholder="0.00" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono shadow-xs text-right" />
                                </div>
                            </div>

                            <!-- Selects (Payer, Method, Category) -->
                            <div class="space-y-2.5 pt-1">
                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Pagado por</label>
                                    <select id="expense-payer" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs">
                                        <option value="">Seleccionar pagador...</option>
                                    </select>
                                </div>

                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Método de Pago</label>
                                    <select id="expense-payment-method" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs">
                                        <option value="">Seleccionar método...</option>
                                    </select>
                                </div>

                                <div class="space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Categoría</label>
                                    <select id="expense-category" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs">
                                        <option value="">Seleccionar categoría...</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Fixed Expense Option -->
                            <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input id="expense-is-fixed" type="checkbox" class="rounded border-slate-300 text-amber-500 focus:ring-amber-400">
                                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Gasto Fijo Mensual</span>
                                </label>
                                <div id="fixed-recurrence-container" class="hidden flex items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg text-xs gap-1 border border-amber-100 dark:border-amber-800/40">
                                    <i class="fas fa-redo text-amber-500 text-[9px]"></i>
                                    <input id="expense-recurrence-months" type="number" value="12" min="1" max="60" class="w-7 bg-transparent border-none p-0 text-center font-bold text-amber-600 dark:text-amber-400 text-xs focus:ring-0" />
                                    <span class="text-[9px] text-amber-600 font-medium">m</span>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar Footer Actions -->
                        <div class="p-4 border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
                            <button type="submit" id="btn-save-expense" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]">
                                CONFIRMAR GASTO
                            </button>
                            <button type="button" id="cancel-expense-modal-btn" class="w-full mt-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </aside>

                    <!-- MAIN CONTENT AREA (Items Breakdown & Split Details) -->
                    <section class="flex-1 overflow-y-auto bg-white dark:bg-[#0f172a] custom-scrollbar p-4 lg:p-6 space-y-4">

                        <!-- Top Toolbar in Main Area -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                            <div class="flex items-center gap-3">
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input id="multi-item-toggle" type="checkbox" class="peer sr-only">
                                    <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                                <div>
                                    <span class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Detallar Lista de Ítems</span>
                                    <p class="text-[10px] text-slate-400">Asigna productos y cantidades por comensal</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 text-xs font-bold text-slate-500">
                                <span id="items-count-display-sidebar" class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300">0 ítems</span>
                            </div>
                        </div>

                        <!-- Guest Inline Management (Visible in shared mode) -->
                        <div id="guest-management-section" class="hidden animate-In bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <span class="text-[9px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Invitados al gasto:</span>
                                <div class="flex items-center gap-1.5">
                                    <input id="new-guest-name" type="text" class="w-36 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs" placeholder="Nombre invitado..." />
                                    <button type="button" id="btn-add-guest" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs flex items-center gap-1">
                                        <i class="fas fa-plus text-[9px]"></i> Añadir
                                    </button>
                                </div>
                            </div>
                            <div id="guest-list-chips" class="flex flex-wrap gap-1.5 empty:hidden"></div>
                        </div>

                        <!-- Multi-Item Fields Container -->
                        <div id="multi-item-fields" class="hidden space-y-3 animate-slideUp">
                            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                <!-- Row input header -->
                                <div class="grid grid-cols-12 gap-2 text-slate-400 dark:text-slate-500 px-4 py-2 text-[9px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                                    <div class="col-span-6 pl-1">Producto / Servicio</div>
                                    <div class="col-span-2 text-center">Cant.</div>
                                    <div class="col-span-3 text-right pr-2">P. Unit (S/)</div>
                                    <div class="col-span-1 text-center"></div>
                                </div>

                                <!-- Add item row -->
                                <div class="grid grid-cols-12 gap-2 px-3 py-2.5 items-center bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                    <div class="col-span-6">
                                        <input name="new-item-desc-input" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Pizza, Cerveza..." />
                                    </div>
                                    <div class="col-span-2 flex items-center justify-center">
                                        <input name="new-item-quantity-input" type="number" value="1" min="1" step="1" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center py-1.5 text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500" />
                                    </div>
                                    <div class="col-span-3 relative">
                                        <input name="new-item-amount-input" type="number" step="0.01" min="0.01" placeholder="0.00" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-right text-xs font-bold text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500" />
                                    </div>
                                    <div class="col-span-1 flex justify-center">
                                        <button type="button" id="add-item-to-list-btn" class="size-7 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center shadow-xs">
                                            <i class="fas fa-plus text-xs"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Bulk Actions Toolbar -->
                                <div id="bulk-item-actions-bar" class="hidden flex flex-wrap items-center justify-between gap-2 p-2 bg-indigo-50/90 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-800 text-xs">
                                    <div class="flex items-center gap-2">
                                        <label class="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-900 dark:text-indigo-200 text-[10px]">
                                            <input type="checkbox" id="select-all-items-checkbox" class="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" onchange="window.toggleSelectAllItems(this.checked)" />
                                            <span id="selected-items-count-display">0 sel.</span>
                                        </label>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <select id="bulk-assignee-select" class="text-[10px] font-bold py-1 px-2 rounded-lg bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500 shadow-xs cursor-pointer" onchange="window.bulkAssignSelected(this.value); this.value='';">
                                            <option value="">Asignar a...</option>
                                            <option value="equal">Equitativo (Todos)</option>
                                        </select>
                                        <button type="button" onclick="window.deleteSelectedItems()" class="px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg transition-colors" title="Eliminar seleccionados">
                                            <i class="fas fa-trash-alt mr-1"></i> Borrar
                                        </button>
                                    </div>
                                </div>

                                <!-- Items List Table -->
                                <div id="expense-item-list-container" class="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                </div>
                            </div>
                        </div>

                        <!-- Live Split Summary Preview in Shared Mode -->
                        <div id="shared-split-preview-section" class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div class="flex items-center justify-between">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Desglose de Repartición:</span>
                                <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
                                    <button type="button" data-val="equal" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all bg-indigo-600 text-white shadow-xs">Equitativo</button>
                                    <button type="button" data-val="percent" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-400 hover:text-slate-600">%</button>
                                    <button type="button" data-val="exact" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-400 hover:text-slate-600">Exacto</button>
                                </div>
                                <input type="hidden" id="split-type-select" value="equal">
                            </div>
                            <div id="split-breakdown-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"></div>
                        </div>

                    </section>
                </form>
            </div>
        </div>
        `;
    }
}

customElements.define('modal-transaccion', ModalTransaccion);

/**
 * @class ModalTransaccion
 * @extends HTMLElement
 * @description Componente nativo para el registro de Gastos e Ingresos.
 * Inyecta un modal híbrido (Light DOM) que utiliza las clases de Tailwind del entorno.
 */
export class ModalTransaccion extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        // Permite emitir un evento 'mounted' para inicializar librerías externas o añadir handlers después que el HTML existe
        this.dispatchEvent(new CustomEvent('modal-mounted', { bubbles: true }));
    }

    attachEvents() {
        // Encapsulación robusta del toggle de items
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

        // Cierre Seguro del modal
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
        <div id="expense-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/40 backdrop-blur-md p-0 lg:p-6 transition-all duration-300">
            <div class="flex flex-col w-full max-w-5xl bg-white dark:bg-[#0f172a] lg:rounded-[2rem] shadow-2xl overflow-hidden h-full lg:h-[85vh] ring-1 ring-white/10">

                <!-- Modal Header -->
                <div class="flex items-start gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
                    <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <i class="fas fa-receipt text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <h2 id="expense-modal-title" class="text-lg font-black text-slate-900 dark:text-white">Registrar Nuevo Gasto</h2>
                        <p class="text-xs text-slate-400 mt-0.5">Detalles de la operación</p>
                    </div>
                    <button type="button" id="close-expense-modal-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="unified-expense-form" class="flex flex-col lg:flex-row w-full flex-1 overflow-hidden relative">
                    <input type="hidden" id="expense-id-hidden" />
                    <input type="hidden" id="expense-type" value="personal" />
                    <input type="hidden" id="expense-payer" required />
                    <input type="hidden" id="expense-payment-method" required />
                    <input type="hidden" id="expense-category" required />
                    <input type="hidden" id="expense-subcategory" />

                    <!-- LEFT SIDEBAR -->
                    <aside class="w-full lg:w-[340px] flex-shrink-0 bg-slate-50 dark:bg-[#1e293b]/50 border-b lg:border-r border-slate-100 dark:border-slate-800 flex flex-col z-20 relative">
                        <!-- Dynamic Header -->
                        <div class="p-6 lg:p-8 flex-none">
                            <div class="flex items-center justify-between mb-6">
                                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nueva Operación</span>
                                <div id="shared-badge" class="hidden px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wide">Compartido</div>
                            </div>
                            <div class="flex flex-col items-center justify-center py-6 border-b border-slate-200 dark:border-slate-700/50 border-dashed">
                                <span class="text-3xl lg:text-4xl font-black text-slate-800 dark:text-white tracking-tighter transition-all" id="display-expense-amount">0.00</span>
                                <span class="text-xs font-bold text-slate-400 mt-1">PEN (S/)</span>
                            </div>
                        </div>

                        <!-- Middle Scrollable Info -->
                        <div class="flex-1 overflow-y-auto px-6 lg:px-8 space-y-4 hide-scrollbar">
                            <div class="space-y-2">
                                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pagado por</label>
                                <div id="modal-payer-tags" class="flex flex-wrap gap-2"></div>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Método</label>
                                <div id="modal-payment-method-tags" class="flex flex-wrap gap-2"></div>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Categoría</label>
                                <div id="modal-category-tags-sidebar" class="flex flex-wrap gap-1.5"></div>
                                <div id="modal-subcategory-section-sidebar" class="hidden animate-slideDown p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 mt-2">
                                    <div id="modal-subcategory-tags-sidebar" class="flex flex-wrap gap-1"></div>
                                </div>
                            </div>
                            <div class="py-3 space-y-2 border-t border-slate-100 dark:border-slate-700">
                                <div class="flex justify-between text-[10px] font-medium text-slate-500">
                                    <span>Base</span>
                                    <span id="base-amount-display" class="font-bold text-slate-700 dark:text-slate-300">S/ 0.00</span>
                                </div>
                                <div class="flex justify-between text-[10px] font-medium text-slate-500">
                                    <span>Ítems</span>
                                    <span id="items-total-display" class="hidden">S/ 0.00</span>
                                    <span id="items-count-display-sidebar" class="font-bold text-slate-700 dark:text-slate-300">0</span>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Actions -->
                        <div class="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
                            <button type="submit" id="btn-save-expense" class="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98]">
                                CONFIRMAR GASTO
                            </button>
                            <button type="button" id="cancel-expense-modal-btn" class="w-full mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </aside>

                    <!-- MAIN CONTENT -->
                    <section class="flex-1 overflow-y-auto bg-white dark:bg-[#0f172a] custom-scrollbar relative">
                        <div class="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
                            <!-- Switch -->
                            <div class="space-y-3">
                                <div class="flex justify-center">
                                    <div class="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                                        <button type="button" id="type-btn-personal" onclick="toggleExpenseType('personal')" class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm">Personal</button>
                                        <button type="button" id="type-btn-shared" onclick="toggleExpenseType('shared')" class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500">Compartido</button>
                                    </div>
                                </div>
                                <div>
                                    <input type="text" id="expense-description" required class="w-full text-center text-lg font-bold text-slate-800 dark:text-white bg-transparent border-none focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all px-0" placeholder="¿Qué estás pagando?" autocomplete="off" />
                                    <div class="h-0.5 w-12 bg-indigo-500 mx-auto rounded-full mt-1 opacity-20"></div>
                                </div>
                            </div>

                            <!-- Date & Amount Grid -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha</label>
                                    <input id="expense-date" type="text" datepicker datepicker-autohide datepicker-format="yyyy-mm-dd" required class="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all" placeholder="Seleccionar fecha..." autocomplete="off" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Monto Total</label>
                                    <div class="relative">
                                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">S/</span>
                                        <input id="expense-amount" type="number" step="0.01" min="0.01" placeholder="0.00" required class="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-base font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono" />
                                    </div>
                                </div>
                            </div>

                            <!-- Shared Guest Management -->
                            <div id="guest-management-section" class="hidden animate-In">
                                <div class="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800/50">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">Participantes</h3>
                                        <div class="flex bg-white dark:bg-slate-800 rounded-md p-0.5 shadow-sm">
                                            <button type="button" data-val="equal" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all bg-indigo-100 text-indigo-700">Equitativo</button>
                                            <button type="button" data-val="percent" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-400 hover:text-slate-600">%</button>
                                            <button type="button" data-val="exact" class="split-tag px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-400 hover:text-slate-600">Exacto</button>
                                        </div>
                                        <input type="hidden" id="split-type-select" value="equal">
                                    </div>
                                    <div id="split-breakdown-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2"></div>
                                    <div class="relative group">
                                        <i class="fas fa-plus absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                        <input id="new-guest-name" type="text" class="w-full pl-7 pr-16 py-2 rounded-lg bg-white dark:bg-slate-900 border-none text-xs font-bold ring-1 ring-slate-100 dark:ring-slate-800 focus:ring-indigo-500 shadow-sm" placeholder="Añadir invitado..." />
                                        <button type="button" id="btn-add-guest" class="absolute right-1 top-1 px-2 py-1 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-md text-[8px] font-black transition-all">AÑADIR</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Options (Fixed / Multi Item) -->
                            <div class="flex flex-wrap items-center gap-4 py-2">
                                <div class="flex items-center gap-2">
                                    <label class="relative inline-flex items-center cursor-pointer group">
                                        <input id="expense-is-fixed" type="checkbox" class="peer sr-only">
                                        <div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                                        <span class="ml-1.5 text-[9px] font-black text-slate-400 uppercase">Fijo</span>
                                    </label>
                                    <div id="fixed-recurrence-container" class="hidden flex items-center bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded text-xs gap-1">
                                        <i class="fas fa-redo text-amber-500 text-[9px]"></i>
                                        <input id="expense-recurrence-months" type="number" value="12" class="w-5 bg-transparent border-none p-0 text-center font-bold text-amber-600 h-4 text-[9px]" />
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 ml-auto">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Detallar Ítems</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input id="multi-item-toggle" type="checkbox" class="peer sr-only">
                                        <div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                            </div>

                            <!-- Sub Items Detail List -->
                            <div id="multi-item-fields" class="hidden animate-slideUp">
                                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                    <div class="grid grid-cols-12 gap-2 text-slate-400 dark:text-slate-500 px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                        <div class="col-span-6 pl-2">Producto / Servicio</div>
                                        <div class="col-span-2 text-center">Cant.</div>
                                        <div class="col-span-3 text-right pr-2">Total</div>
                                        <div class="col-span-1 text-center"></div>
                                    </div>
                                    <div class="grid grid-cols-12 gap-2 px-4 py-2 items-center bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <div class="col-span-6">
                                            <input name="new-item-desc-input" type="text" class="w-full bg-transparent border-none p-0 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 focus:ring-0" placeholder="Ej: Manzanas (Enter para añadir)" />
                                        </div>
                                        <div class="col-span-2">
                                            <input name="new-item-quantity-input" type="number" value="1" min="1" class="w-full bg-transparent border-b border-slate-100 text-center p-0 text-sm font-bold text-slate-600 focus:border-indigo-500 focus:ring-0" />
                                        </div>
                                        <div class="col-span-3 relative">
                                            <span class="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs">S/</span>
                                            <input name="new-item-amount-input" type="number" step="0.01" placeholder="0.00" class="w-full bg-transparent border-b border-slate-100 p-0 pl-4 text-right text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-0" />
                                        </div>
                                        <div class="col-span-1 flex justify-center">
                                            <button type="button" id="add-item-to-list-btn" class="size-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                                <i class="fas fa-plus text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div id="expense-item-list-container" class="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </form>
            </div>
        </div>
        `;
    }
}

customElements.define('modal-transaccion', ModalTransaccion);

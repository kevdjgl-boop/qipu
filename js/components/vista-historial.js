/**
 * @class VistaHistorial
 * @extends HTMLElement
 * @description Componente web para la sección de historial de transacciones, calendario interactivo y sistema de filtros.
 */
export class VistaHistorial extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <div id="informe-container" class="mt-6">
            <section class="space-y-6">
                <!-- Rejilla de Informes y Transacciones -->
                <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
                    
                    <!-- Columna Principal: Calendario e Historial -->
                    <div class="lg:col-span-3 report-column bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div class="space-y-4">
                            <!-- CALENDARIO INTERACTIVO -->
                            <div id="interactive-calendar-container" class="mb-4 transition-all duration-300">
                                <div class="w-full flex justify-center py-4"><i class="fas fa-spinner fa-spin text-gray-400"></i></div>
                            </div>

                            <div class="flex justify-between items-center mb-1">
                                <h3 class="text-xl font-bold text-gray-700">Historial</h3>

                                <!-- Filtros (Popover) -->
                                <div class="relative">
                                    <button id="filter-popover-button" class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all active:scale-95">
                                        <i class="fas fa-filter mr-2 text-indigo-500"></i> Filtros
                                        <span class="active-indicator ml-2 h-2 w-2 bg-indigo-500 rounded-full hidden"></span>
                                    </button>
                                    
                                    <div id="filter-popover" class="absolute hidden mt-3 right-0 w-[85vw] md:w-[600px] lg:w-[750px] max-w-[100vw] bg-white rounded-3xl shadow-2xl ring-1 ring-gray-900/10 z-50 transform origin-top-right transition-all animate-pop">
                                        
                                        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                                            <div>
                                                <h4 class="text-sm font-black text-gray-900 uppercase tracking-wide">Filtros</h4>
                                                <p class="text-[10px] text-gray-500 font-medium">Refina tu búsqueda</p>
                                            </div>
                                            <button id="close-filter-popover-btn" class="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                                                <i class="fas fa-times text-xs"></i>
                                            </button>
                                        </div>

                                        <div class="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-5">
                                            <!-- Búsqueda Texto -->
                                            <div class="space-y-2">
                                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Buscar texto</label>
                                                <div class="relative">
                                                    <i class="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                                                    <input type="text" id="filter-description" placeholder="Ej: Supermercado, Almuerzo..." class="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl py-2.5 pl-8 pr-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" />
                                                </div>
                                            </div>

                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div class="space-y-2">
                                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Categoría</label>
                                                    <div id="filter-tag-categories" class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                        <span class="text-[10px] text-gray-400 italic">Cargando...</span>
                                                    </div>
                                                </div>

                                                <div class="space-y-2">
                                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Responsable</label>
                                                    <div id="filter-tag-participants" class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                        <span class="text-[10px] text-gray-400 italic">Cargando...</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="space-y-2">
                                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Método de Pago</label>
                                                <div id="filter-tag-payment-methods" class="flex flex-wrap gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    <span class="text-[10px] text-gray-400 italic">Cargando...</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="px-5 py-3 bg-gray-50 rounded-b-3xl border-t border-gray-100 flex justify-between items-center">
                                            <div id="selected-filter-tags" class="flex flex-wrap gap-1.5 flex-1 mr-2 items-center">
                                                <span id="no-filters-label" class="text-[10px] text-gray-400 font-medium">Sin filtros activos</span>
                                            </div>
                                            <button id="reset-filters-btn" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-100 transition-all shadow-sm flex items-center gap-1 shrink-0">
                                                <i class="fas fa-undo"></i> Borrar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tabs Gastos/Ingresos -->
                            <div class="flex p-1 bg-gray-100 rounded-xl mb-3 border border-gray-200 shadow-inner">
                                <button id="tab-history-expenses" class="flex-1 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg bg-white text-gray-800 shadow-sm ring-1 ring-gray-900/5 transition-all">Gastos</button>
                                <button id="tab-history-incomes" class="flex-1 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg text-gray-500 hover:text-gray-700 transition-all">Ingresos</button>
                            </div>

                            <span class="text-[10px] text-gray-500 font-medium block -mt-1 mb-2" id="expense-diagnostic"></span>
                            
                            <!-- Contenedor Principal de la Lista -->
                            <div id="expense-report-by-category" class="space-y-0 divide-y divide-gray-100">
                                <div class="py-12 text-center text-gray-400">
                                    <i class="fas fa-receipt text-3xl mb-3 opacity-50"></i>
                                    <p class="text-sm font-medium">Aún no hay transacciones aquí.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Secundaria: Resúmenes -->
                    <div class="lg:col-span-2 space-y-4">
                        <aside class="report-column bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm h-full max-h-[400px] overflow-y-auto custom-scrollbar">
                            <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Próximos Fijos</h3>
                            <div id="fixed-expenses-summary" class="space-y-3">
                                 <p class="text-xs text-gray-400 italic">No hay gastos fijos programados.</p>
                            </div>
                        </aside>

                        <div class="report-column bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm h-full max-h-[400px] overflow-y-auto custom-scrollbar">
                            <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Resumen Tarjetas</h3>
                            <div id="credit-card-summary-cards" class="flex flex-col gap-3">
                                 <p class="text-xs text-gray-400 italic">Sin métodos de deuda registrados.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        `;
    }

    connectedCallback() {
        this.setupInteractivity();
    }

    setupInteractivity() {
        // Lógica del Popover de Filtros
        const btnFilter = this.querySelector('#filter-popover-button');
        const popoverFilter = this.querySelector('#filter-popover');
        const btnCloseFilter = this.querySelector('#close-filter-popover-btn');
        let isFilterOpen = false;

        const toggleFilter = () => {
            isFilterOpen = !isFilterOpen;
            if (isFilterOpen) {
                popoverFilter.classList.remove('hidden');
            } else {
                popoverFilter.classList.add('hidden');
            }
        };

        btnFilter?.addEventListener('click', toggleFilter);
        btnCloseFilter?.addEventListener('click', toggleFilter);

        // Lógica de Tabs básicos Visuales
        const tabExpenses = this.querySelector('#tab-history-expenses');
        const tabIncomes = this.querySelector('#tab-history-incomes');

        const switchTabVisuals = (activeTab, inactiveTab) => {
            activeTab.classList.add('bg-white', 'text-gray-800', 'shadow-sm', 'ring-1', 'ring-gray-900/5');
            activeTab.classList.remove('text-gray-500', 'hover:text-gray-700');

            inactiveTab.classList.remove('bg-white', 'text-gray-800', 'shadow-sm', 'ring-1', 'ring-gray-900/5');
            inactiveTab.classList.add('text-gray-500', 'hover:text-gray-700');
        };

        tabExpenses?.addEventListener('click', () => {
            switchTabVisuals(tabExpenses, tabIncomes);
            // El trigger a la lógica de negocio (app.js/UI Manager) se haría aquí o mediante eventos
            document.dispatchEvent(new CustomEvent('historyTabChanged', { detail: 'expenses' }));
        });

        tabIncomes?.addEventListener('click', () => {
            switchTabVisuals(tabIncomes, tabExpenses);
            document.dispatchEvent(new CustomEvent('historyTabChanged', { detail: 'incomes' }));
        });

    }
}

customElements.define('vista-historial', VistaHistorial);

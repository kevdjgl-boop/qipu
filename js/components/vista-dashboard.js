/**
 * @class VistaDashboard
 * @extends HTMLElement
 * @description Componente web para la sección de resumen general (Tarjetas de Balance, Gastos, Ahorros).
 * Se encarga de inicializar Chart.js si está presente y estructurar los bloques visuales.
 */
export class VistaDashboard extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <section id="dashboard-container" class="section-card">
            <!-- Barra superior de acciones rápidas -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-1">
                <div class="inline-flex flex-wrap items-center gap-1 rounded-3xl shadow-sm bg-white p-3 border border-gray-200" role="group">
                    <button id="open-expense-modal-btn" type="button" class="px-6 py-2.5 text-base font-extrabold text-white bg-gray-900 rounded-2xl rounded-r-md hover:bg-gray-800 focus:z-10 transition-all shadow-lg transform active:scale-95 flex items-center">
                        <i class="fas fa-plus-circle mr-2 text-lg"></i> Añadir Gasto
                    </button>
                    <button id="quick-add-income-btn" type="button" class="px-5 py-2.5 text-base font-extrabold text-white bg-emerald-600 rounded-r-2xl rounded-md hover:bg-emerald-700 focus:z-10 transition-all shadow-lg transform active:scale-95 flex items-center">
                        <i class="fas fa-plus-circle mr-2 text-lg"></i> Ingreso
                    </button>
                    <button id="open-categories-modal-btn" type="button" class="px-4 py-2 text-sm font-medium text-gray-600 bg-transparent rounded-2xl hover:bg-gray-100 hover:text-indigo-600 ml-1">Categorías</button>
                    <button id="open-payment-methods-modal-btn" type="button" class="px-4 py-2 text-sm font-medium text-gray-600 bg-transparent rounded-2xl hover:bg-gray-100 hover:text-indigo-600">Métodos</button>
                    <div class="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                    <button id="open-settlement-modal-btn" type="button" class="px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl hover:bg-rose-100">Liquidar</button>
                </div>

                <!-- Perfil y Notificaciones -->
                <div class="flex items-center gap-3">
                    <button id="open-participants-sidebar-btn" class="bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors" title="Configuración">
                        <i class="fas fa-cog text-gray-400 text-lg"></i>
                        <span class="hidden xl:inline">Ajustes</span>
                    </button>
                    <button class="relative w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all" title="Notificaciones">
                        <i class="fas fa-bell text-gray-400 text-xl"></i>
                        <span class="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
                    </button>
                    <button class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all border-2 border-white ring-1 ring-gray-200" title="Mi Perfil">
                        <span id="user-initials-display" class="text-sm font-extrabold tracking-wide uppercase">ME</span>
                    </button>
                </div>
            </div>

            <!-- Dashboard Layout: Tarjetas (Glassmorphisim) -->
            <div id="dashboard-blocks-wrapper" class="mt-4">
                <div id="dashboard-top-block" class="flex flex-col md:flex-row gap-2">
                    
                    <div class="balance-glass-card saldo-glow w-full md:w-[280px]">
                        <div>
                            <div class="glass-card-header"><span class="glass-card-title">Saldo Global</span></div>
                        </div>
                        <div>
                            <span id="display-remaining-budget" class="glass-card-amount saldo-text">S/ 0.00</span>
                            <span class="glass-card-subtitle">Disponible</span>
                        </div>
                    </div>

                    <div class="balance-glass-card gasto-glow w-full md:w-[280px]">
                        <div>
                            <div class="glass-card-header"><span class="glass-card-title">Gasto Total</span></div>
                        </div>
                        <div>
                            <span id="display-total-spent" class="glass-card-amount gasto-text">S/ 0.00</span>
                            <span class="glass-card-subtitle">Gastado</span>
                        </div>
                    </div>

                    <div class="balance-glass-card w-full md:w-[280px]">
                        <div>
                            <div class="glass-card-header flex justify-between items-center">
                                <span class="glass-card-title">Ahorro Global</span>
                                <i class="fas fa-piggy-bank text-gray-300 text-xl"></i>
                            </div>
                        </div>
                        <div>
                            <span id="display-global-savings-total" class="glass-card-amount mt-2">S/ 0.00</span>
                            <div class="flex items-center justify-between mt-2">
                                <span class="glass-card-subtitle">En Metas</span>
                                <button id="btn-distribute-savings" class="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">Asignar</button>
                            </div>
                        </div>
                    </div>

                    <!-- Mini KPI Block -->
                    <div id="metrics-container" class="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 w-full md:w-[250px] flex flex-col gap-2">
                        <div class="flex flex-col justify-center">
                            <p class="text-sm font-semibold text-gray-500">Ahorro Mutuo</p>
                            <span id="display-shared-savings-goal" class="font-extrabold text-purple-600 block">S/ 0.00</span>
                        </div>
                        <hr class="border-gray-200" />
                        <div class="flex flex-col justify-center">
                            <p class="text-sm font-semibold text-gray-500">Gastos fijos totales</p>
                            <span id="display-fixed-total" class="font-extrabold text-yellow-600 block">S/ 0.00</span>
                        </div>
                    </div>

                    <!-- Saldos Individuales (Placeholder para listas de cards) -->
                    <div id="saldos-individuales-card" class="section-card flex-grow shadow-none border border-gray-200">
                        <h3 class="text-2xl font-extrabold text-gray-800 mb-2">Saldos Individuales</h3>
                        <div id="participant-summary-cards" class="grid grid-cols-1 gap-1">
                             <p class="text-gray-400 text-sm italic">Sin participantes</p>
                        </div>
                    </div>

                </div>
            </div>
            
            <!-- Gráfico de Dona -->
            <div class="section-card mt-4 border border-gray-200 shadow-sm">
                <button id="toggle-chart-btn" class="w-full text-left flex justify-between items-center text-xl font-bold text-gray-700 mb-4 focus:outline-none">
                    Distribución de Gastos
                    <i id="chart-toggle-icon" class="fas fa-chevron-down transition-transform duration-300"></i>
                </button>
                <div id="chart-collapsible-content">
                    <div class="relative h-64 md:h-80 pt-2 border-t border-gray-200">
                        <canvas id="category-chart"></canvas>
                        <p id="chart-no-data" class="absolute inset-0 flex items-center justify-center text-gray-500 italic">No hay datos para mostrar.</p>
                    </div>
                </div>
            </div>
        </section>
        `;
    }

    connectedCallback() {
        this.setupInteractivity();
    }

    setupInteractivity() {
        // Vinculación de botón Ajustes hacia el Sidebar
        const btnSidebar = this.querySelector('#open-participants-sidebar-btn');
        btnSidebar?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('openSidebar'));
        });

        // Vinculación de apertura de Modales (reemplaza a los de demostración en main.js)
        const btnExpense = this.querySelector('#open-expense-modal-btn');
        btnExpense?.addEventListener('click', () => {
            const modal = document.querySelector('#expense-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        });

        const btnIncome = this.querySelector('#quick-add-income-btn');
        btnIncome?.addEventListener('click', () => {
            const modal = document.querySelector('#quick-income-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');

                // Set default date if possible
                const dateInput = modal.querySelector('#quick-income-date');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        });

        const btnWallet = this.querySelector('#open-payment-methods-modal-btn');
        btnWallet?.addEventListener('click', () => {
            const modal = document.querySelector('#payment-methods-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        });

        // Acordeón de Gráfica
        const toggleChartBtn = this.querySelector('#toggle-chart-btn');
        const chartWrapper = this.querySelector('#chart-collapsible-content');
        const chartIcon = this.querySelector('#chart-toggle-icon');

        let chartExpanded = true;
        toggleChartBtn?.addEventListener('click', () => {
            chartExpanded = !chartExpanded;
            if (chartExpanded) {
                chartWrapper.style.display = 'block';
                chartIcon.classList.remove('rotate-180');
            } else {
                chartWrapper.style.display = 'none';
                chartIcon.classList.add('rotate-180');
            }
        });
    }
}

customElements.define('vista-dashboard', VistaDashboard);

/**
 * @class ModalRepartir
 * @extends HTMLElement
 * @description Componente web para la ventana de "Cuentas Claras" / Liquidaciones.
 * Muestra el resumen de deudas y saldos entre todos los perfiles, deudor a acreedor.
 */
export class ModalRepartir extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <div id="settlement-modal" class="fixed inset-0 z-[60] hidden items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-opacity">
            <div class="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] animate-pop">
                
                <!-- Cabecera -->
                <div class="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0">
                    <div class="flex items-center gap-4">
                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 shadow-sm ring-1 ring-rose-100">
                            <i class="fas fa-handshake text-xl text-rose-500"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-gray-900 leading-tight">Liquidación</h3>
                            <p class="text-xs text-gray-400 font-medium mt-0.5">Balance final de cuentas</p>
                        </div>
                    </div>
                    <button id="close-settlement-modal-btn" class="group rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Contenido Dinámico (Listado de Quién debe a Quién) -->
                <div id="settlement-summary-content" class="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white hide-scrollbar">
                    
                    <!-- Estado de Carga -->
                    <div id="settlement-loading-state" class="flex flex-col items-center justify-center h-full opacity-50 py-12">
                        <i class="fas fa-circle-notch fa-spin text-2xl text-indigo-500"></i>
                        <span class="text-xs text-indigo-400 mt-2 font-bold">Calculando Deudas...</span>
                    </div>

                    <!-- Aquí se inyectan las liquidaciones (Renderizers) -->
                    <div id="settlement-results" class="hidden space-y-4"></div>

                </div>

                <!-- Footer (Cerrar) -->
                <div class="px-8 py-5 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button id="close-settlement-modal-btn-bottom" class="w-full py-3.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 transition-all active:scale-[0.98]">
                        Cerrar Ventana
                    </button>
                </div>

            </div>
        </div>
        `;
    }

    connectedCallback() {
        this.setupInteractivity();
    }

    setupInteractivity() {
        const modal = this.querySelector('#settlement-modal');
        const btnCloseTop = this.querySelector('#close-settlement-modal-btn');
        const btnCloseBottom = this.querySelector('#close-settlement-modal-btn-bottom');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        btnCloseTop?.addEventListener('click', closeModal);
        btnCloseBottom?.addEventListener('click', closeModal);

        // Evento global
        document.addEventListener('openSettlementModal', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }
}

customElements.define('modal-repartir', ModalRepartir);

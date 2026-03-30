/**
 * @class ModalAhorros
 * @extends HTMLElement
 * @description Componente web para la ventana emergente de "Cierre de Ciclo" o Asignación de excedentes.
 * Permite distribuir el dinero no gastado en las metas establecidas.
 */
export class ModalAhorros extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <div id="savings-allocation-modal" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm hidden items-center justify-center p-4 z-[80]">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                
                <!-- Encabezado de Cierre de Ciclo (Hero) -->
                <div class="bg-emerald-600 p-6 text-white text-center shrink-0">
                    <h3 class="text-2xl font-bold"><i class="fas fa-flag-checkered mr-2"></i>Cierre de Ciclo</h3>
                    <p class="text-emerald-100 text-sm mt-1">¡Felicidades! Te sobró saldo este mes.</p>
                    <div class="mt-4 bg-emerald-700/50 rounded-xl p-3">
                        <span class="text-xs uppercase tracking-wide opacity-80">Saldo Disponible para Asignar</span>
                        <div id="allocation-available-amount" class="text-3xl font-black">S/ 0.00</div>
                    </div>
                </div>

                <!-- Lista de Metas (Cuerpo scrollable) -->
                <div class="p-6 overflow-y-auto flex-grow custom-scrollbar">
                    <p class="text-sm text-gray-600 mb-4 font-medium flex items-center justify-between">
                        <span>¿A qué metas deseas destinar este dinero?</span>
                        <i class="fas fa-bullseye text-indigo-400"></i>
                    </p>
                    <div id="goals-allocation-list" class="space-y-3">
                        <p class="text-xs text-gray-400 italic text-center py-4">Cargando metas disponibles...</p>
                    </div>
                </div>

                <!-- Footer (Acciones) -->
                <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button id="close-allocation-modal" class="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button id="save-allocation-btn" class="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 hover:-translate-y-0.5 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]">
                        Confirmar Asignación
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
        const modal = this.querySelector('#savings-allocation-modal');
        const btnClose = this.querySelector('#close-allocation-modal');

        btnClose?.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });

        // Este modal normalmente se abre desde el Dashboard (Botón de Ahorro Global)
        document.addEventListener('openSavingsAllocationModal', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }
}

customElements.define('modal-ahorros', ModalAhorros);

/**
 * @class ModalMetodoDetalle
 * @extends HTMLElement
 * @description Web Component para el modal de detalle de un método de pago en particular.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalMetodoDetalle extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="payment-method-detail-modal"
            class="fixed inset-0 bg-gray-600 bg-opacity-70 hidden items-center justify-center p-4 z-[60]">
            <div class="bg-white p-0 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center bg-gray-50">
                <div class="flex items-center gap-3">
                <h3 class="text-xl font-bold text-gray-800 modal-title">Detalle del Método</h3>

                <button id="btn-manual-close-cycle" class="hidden group flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <i class="fas fa-file-invoice-dollar text-sm"></i>
                    <span>Cerrar/Pagar</span>
                </button>
                </div>
                <button id="close-payment-detail-modal-btn" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div class="flex border-b border-gray-200">
                <button id="pm-tab-prev" class="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-indigo-600 focus:outline-none border-b-2 border-transparent transition-colors">
                Ciclo Anterior
                <span id="pm-date-prev" class="block text-xs font-normal text-gray-400">--/-- al --/--</span>
                </button>
                <button id="pm-tab-curr" class="flex-1 py-3 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition-colors">
                Ciclo Actual
                <span id="pm-date-curr" class="block text-xs font-normal text-indigo-400">--/-- al --/--</span>
                </button>
            </div>

            <div class="flex-grow overflow-y-auto p-4 bg-gray-50">
                <div id="pm-content-prev" class="space-y-3 hidden">
                <p class="text-gray-500 italic text-center py-4">Cargando...</p>
                </div>
                <div id="pm-content-curr" class="space-y-3">
                <p class="text-gray-500 italic text-center py-4">Cargando...</p>
                </div>
            </div>

            <div class="p-4 border-t bg-white flex justify-between items-center">
                <span class="text-sm text-gray-500">Deuda Total del Periodo:</span>
                <span id="pm-total-amount" class="text-xl font-extrabold text-indigo-600">S/ 0.00</span>
            </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#payment-method-detail-modal');
        const closeBtn = this.querySelector('#close-payment-detail-modal-btn');

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }
    }
}

customElements.define('modal-metodo-detalle', ModalMetodoDetalle);

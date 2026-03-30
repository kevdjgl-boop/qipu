/**
 * @class ModalGlobal
 * @extends HTMLElement
 * @description Web Component para el modal Global de Alertas y Confirmaciones de sistema genéricas.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalGlobal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
        <div id="global-modal"
            class="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm transform scale-95 transition-all duration-300 animate-pop overflow-hidden">

            <div id="gm-header" class="h-24 flex items-center justify-center">
                <div id="gm-icon-container" class="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <i id="gm-icon" class="fas fa-check text-2xl"></i>
                </div>
            </div>

            <div class="px-6 pb-6 pt-2 text-center">
                <h3 id="gm-title" class="text-xl font-black text-gray-800 mb-2 leading-tight">Título</h3>
                <div id="gm-body" class="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                Mensaje aquí...
                </div>

                <div class="grid grid-cols-2 gap-3 hidden" id="gm-actions-confirm">
                <button id="gm-btn-cancel" class="py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Cancelar
                </button>
                <button id="gm-btn-confirm" class="py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95">
                    Confirmar
                </button>
                </div>

                <div class="" id="gm-actions-alert">
                <button id="gm-btn-ok" class="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95">
                    Entendido
                </button>
                </div>
            </div>
            </div>
        </div>
        `;
    }
}

customElements.define('modal-global', ModalGlobal);

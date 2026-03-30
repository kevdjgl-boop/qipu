/**
 * @class ModalIngresoRapido
 * @extends HTMLElement
 * @description Web Component para el modal de Ingreso Rápido de dinero.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalIngresoRapido extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="quick-income-modal"
            class="fixed inset-0 z-[90] hidden items-center justify-center bg-gray-600 bg-opacity-70 backdrop-blur-sm p-4 transition-opacity">
            <div class="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-pop"
            style="max-height: 90vh">
            <div class="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white shrink-0">
                <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 shadow-sm ring-1 ring-emerald-100">
                    <i class="fas fa-hand-holding-usd text-xl text-emerald-600"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-800 leading-tight">Nuevo Ingreso</h3>
                    <p class="text-xs text-gray-400 font-medium mt-0.5">Añadir saldo al participante</p>
                </div>
                </div>
                <button type="button" id="close-quick-income-modal"
                class="text-gray-300 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-50">
                <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <form id="quick-income-form" class="flex flex-col flex-grow overflow-y-auto p-8 space-y-6">
                <div class="grid grid-cols-12 gap-6">
                <div class="col-span-8">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Descripción</label>
                    <input type="text" id="quick-income-desc" placeholder="Ej: Sueldo, Extra..." required
                    class="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-medium text-gray-800 placeholder-gray-300 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" />
                </div>

                <div class="col-span-4">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Monto</label>
                    <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span class="text-gray-400 font-bold text-sm">S/</span>
                    </div>
                    <input type="number" id="quick-income-amount" step="0.01" min="0.01" placeholder="0.00" required
                        class="w-full rounded-xl border-gray-200 bg-emerald-50 py-2.5 pl-8 pr-3 text-sm font-black text-emerald-700 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-right" />
                    </div>
                </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Beneficiario</label>
                    <div class="relative">
                    <select id="quick-income-user" required
                        class="w-full appearance-none rounded-xl border-gray-200 bg-gray-50 py-2.5 px-4 text-sm font-bold text-gray-700 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow cursor-pointer"></select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <i class="fas fa-chevron-down text-xs"></i>
                    </div>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Fecha</label>
                    <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <i class="fas fa-calendar-alt text-gray-400 text-xs"></i>
                    </div>
                    <input type="date" id="quick-income-date" required 
                        class="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-gray-700 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                        placeholder="Seleccionar fecha" />
                    </div>
                </div>
                </div>
            </form>

            <div class="px-8 py-5 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                <button type="button" id="cancel-quick-income-btn"
                class="px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm">Cancelar</button>
                <button type="submit" form="quick-income-form"
                class="px-8 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 shadow-lg transition-all transform active:scale-95 flex items-center gap-2"><i class="fas fa-check"></i> Registrar</button>
            </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#quick-income-modal');
        const closeBtn = this.querySelector('#close-quick-income-modal');
        const cancelBtn = this.querySelector('#cancel-quick-income-btn');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    }
}

customElements.define('modal-ingreso-rapido', ModalIngresoRapido);

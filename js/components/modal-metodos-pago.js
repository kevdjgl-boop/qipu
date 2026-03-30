/**
 * @class ModalMetodosPago
 * @extends HTMLElement
 * @description Web Component para el modal de configuración de Métodos de Pago.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalMetodosPago extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="payment-methods-modal"
            class="fixed inset-0 z-50 hidden items-center justify-center bg-gray-600 bg-opacity-70 backdrop-blur-sm p-4 transition-opacity">
            <div class="flex h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-gray-900/5">
            <div class="hidden w-2/5 flex-col border-r border-gray-100 bg-gray-50/50 p-8 md:flex">
                <div class="mb-8">
                <div class="flex items-center gap-4 text-gray-800">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
                    <i class="fas fa-wallet text-xl text-emerald-600"></i>
                    </div>
                    <div>
                    <h3 class="text-xl font-bold leading-tight">Métodos de Pago</h3>
                    <p class="text-xs text-gray-500 font-medium mt-0.5">Tarjetas y efectivo</p>
                    </div>
                </div>
                </div>

                <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div id="payment-methods-display" class="space-y-3">
                    <p class="text-center text-sm italic text-gray-400 mt-10">Cargando métodos...</p>
                </div>
                </div>

                <div class="mt-8 border-t border-gray-200 pt-5">
                <p class="text-xs text-center text-gray-400 font-medium">Gestiona tus fechas de corte y pago</p>
                </div>
            </div>

            <div class="flex flex-1 flex-col bg-white p-0 overflow-hidden">
                <div class="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <h2 class="text-2xl font-bold text-gray-900" id="payment-form-title">Nuevo Método</h2>
                <button id="close-payment-methods-modal-btn" class="group rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
                </div>

                <form id="payment-method-form" class="flex flex-grow flex-col space-y-8 p-8 overflow-y-auto">
                <input type="hidden" id="method-id-to-edit" />

                <div class="space-y-3">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre del Método</label>
                    <input type="text" id="method-name" placeholder="Ej: Visa BCP, Efectivo..." required
                    class="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-gray-900 font-semibold placeholder-gray-400 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 transition-shadow" />
                </div>

                <div class="space-y-3">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Tipo de Medio</label>
                    <div class="relative custom-select-container" id="method-type-container">
                    <button type="button" class="custom-select-button w-full flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 text-left text-gray-900 font-medium ring-1 ring-inset ring-gray-200 transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">
                        <span class="custom-select-display truncate pr-4">Efectivo / Débito</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200 flex-shrink-0"></i>
                    </button>
                    <div class="custom-select-options absolute top-full left-0 z-50 mt-2 hidden w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 transition-all">
                        <div class="custom-select-option block w-full cursor-pointer px-5 py-4 text-left hover:bg-gray-50 border-b border-gray-50" data-value="cash">
                        <span class="text-sm font-bold text-gray-700">Efectivo / Débito (Al día)</span>
                        </div>
                        <div class="custom-select-option block w-full cursor-pointer px-5 py-4 text-left hover:bg-gray-50" data-value="credit">
                        <span class="text-sm font-bold text-gray-700">Tarjeta de Crédito (Ciclo)</span>
                        </div>
                    </div>
                    <input type="hidden" id="method-type" value="cash" />
                    </div>
                </div>
                <div id="card-owner-container" class="hidden space-y-2">
                    <label class="text-sm font-semibold text-gray-900">Titular de la Tarjeta (Quién paga al banco)</label>
                    <div class="relative">
                    <select id="method-owner" class="w-full appearance-none rounded-xl border-none bg-indigo-50 px-4 py-3.5 text-indigo-900 font-bold ring-1 ring-inset ring-indigo-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all cursor-pointer">
                        <option value="">-- Selecciona al titular --</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                        <i class="fas fa-user-circle text-lg"></i>
                    </div>
                    </div>
                    <p class="text-[10px] text-gray-500 px-1">* Todos los gastos hechos con esta tarjeta contarán como pagados por este usuario.</p>
                </div>
                <div id="cc-config-fields" class="hidden space-y-4 rounded-2xl bg-indigo-50 p-5 ring-1 ring-inset ring-indigo-100">
                    <div class="flex items-center gap-2 border-b border-indigo-200 pb-2">
                    <i class="fas fa-calendar-check text-indigo-600"></i>
                    <label class="text-sm font-bold text-indigo-900">Configuración de Ciclo</label>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-indigo-700">Día de Cierre</label>
                        <input type="number" id="cc-config-closing-day" min="1" max="31" placeholder="Ej: 8"
                        class="w-full rounded-xl border-none bg-white px-3 py-2.5 text-gray-900 font-bold ring-1 ring-inset ring-indigo-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm" />
                        <p class="text-[9px] text-indigo-400 leading-tight">Día que corta la facturación.</p>
                    </div>

                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-indigo-700">Día Límite de Pago</label>
                        <input type="number" id="cc-config-payment-day" min="1" max="31" placeholder="Ej: 5"
                        class="w-full rounded-xl border-none bg-white px-3 py-2.5 text-gray-900 font-bold ring-1 ring-inset ring-indigo-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm" />
                        <p class="text-[9px] text-indigo-400 leading-tight">Día máximo para pagar.</p>
                    </div>
                    </div>
                </div>
                </form>

                <div class="flex items-center justify-end gap-4 border-t border-gray-100 px-8 py-5 bg-white">
                <button type="button" id="cancel-edit-method-btn" class="hidden rounded-xl px-6 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800">Cancelar</button>
                <button type="submit" id="save-method-btn" form="payment-method-form" class="rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5">Añadir Método</button>
                </div>
            </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#payment-methods-modal');
        const closeBtn = this.querySelector('#close-payment-methods-modal-btn');

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }
    }
}

customElements.define('modal-metodos-pago', ModalMetodosPago);

/**
 * @class ModalCategorias
 * @extends HTMLElement
 * @description Web Component para el modal de configuración de Categorías.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalCategorias extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="categories-modal"
            class="fixed inset-0 z-50 hidden items-center justify-center bg-gray-600 bg-opacity-70 backdrop-blur-sm p-4 transition-opacity">
            <div class="flex h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-gray-900/5">
            <div class="hidden w-2/5 flex-col border-r border-gray-100 bg-gray-50/50 p-8 md:flex">
                <div class="mb-8">
                <div class="flex items-center gap-4 text-gray-800">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
                    <i class="fas fa-tags text-xl text-indigo-600"></i>
                    </div>
                    <div>
                    <h3 class="text-xl font-bold leading-tight">Categorías</h3>
                    <p class="text-xs text-gray-500 font-medium mt-0.5">Gestiona tus presupuestos</p>
                    </div>
                </div>
                </div>

                <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div id="categories-display" class="space-y-3">
                    <p class="text-center text-sm italic text-gray-400 mt-10">Cargando lista...</p>
                </div>
                </div>

                <div class="mt-8 border-t border-gray-200 pt-5">
                <div class="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span>PRESUPUESTO TOTAL</span>
                    <span id="total-budget-display" class="font-bold text-gray-700 text-lg">S/ 0.00</span>
                </div>
                </div>
            </div>

            <div class="flex flex-1 flex-col bg-white p-0 overflow-hidden">
                <div class="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <h2 class="text-2xl font-bold text-gray-900">Configuración</h2>
                <button id="close-categories-modal-btn" class="group rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
                </div>

                <form id="category-form" class="flex flex-grow flex-col space-y-8 p-8 overflow-y-auto">
                <div class="space-y-3">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre de la Categoría</label>
                    <input type="text" id="category-name" placeholder="Ej: Alimentación, Transporte..." required
                    class="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-gray-900 font-semibold placeholder-gray-400 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 transition-shadow" />
                </div>
                <div class="space-y-3">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Presupuesto Mensual</label>
                    <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                        <span class="text-gray-400 font-bold text-lg">S/</span>
                    </div>
                    <input type="number" id="category-budget" placeholder="0.00" min="0" step="0.01"
                        class="w-full rounded-2xl border-none bg-gray-50 py-4 pl-12 pr-5 text-gray-900 font-bold text-xl placeholder-gray-400 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 transition-shadow" />
                    </div>
                </div>
                </form>

                <div class="flex items-center justify-end gap-4 border-t border-gray-100 px-8 py-5 bg-white">
                <button type="button" id="btn-clear-category-form"
                    class="rounded-xl px-6 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800">Limpiar</button>
                <button type="submit" form="category-form"
                    class="rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5">Guardar Categoría</button>
                </div>
            </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#categories-modal');
        const closeBtn = this.querySelector('#close-categories-modal-btn');

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }
    }
}

customElements.define('modal-categorias', ModalCategorias);

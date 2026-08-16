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
            class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
            <div class="flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop">
                
                <!-- Panel Izquierdo: Lista de Categorías Existentes -->
                <div class="hidden w-[42%] flex-col border-r border-slate-100 bg-slate-50/70 p-6 md:flex">
                    <div class="mb-5 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                                <i class="fas fa-tags text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-black text-slate-800 leading-tight">Categorías</h3>
                                <p class="text-[11px] text-slate-400 font-medium">Presupuestos y clasificación</p>
                            </div>
                        </div>
                        <span id="categories-count-badge" class="px-2.5 py-1 text-[11px] font-black rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">0</span>
                    </div>

                    <!-- Buscador rápido en categorías -->
                    <div class="relative mb-4">
                        <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="search-category-input" placeholder="Buscar categoría..."
                            class="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200/80 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs" />
                    </div>

                    <!-- Lista con scroll estilizado -->
                    <div class="flex-grow overflow-y-auto pr-1.5 custom-scrollbar space-y-2.5" id="categories-display">
                        <div class="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                            <i class="fas fa-circle-notch fa-spin text-2xl mb-2 text-indigo-500"></i>
                            <p class="text-xs">Cargando lista...</p>
                        </div>
                    </div>

                    <!-- Widget Presupuesto Total -->
                    <div class="mt-4 pt-4 border-t border-slate-200/70">
                        <div class="bg-gradient-to-br from-slate-900 to-indigo-950 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between">
                            <div>
                                <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-200/80 block">Presupuesto Mensual Total</span>
                                <span id="total-budget-display" class="font-black text-xl text-white tracking-tight">S/ 0.00</span>
                            </div>
                            <div class="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                                <i class="fas fa-coins text-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Panel Derecho: Formulario de Creación / Edición -->
                <div class="flex flex-1 flex-col bg-white overflow-hidden">
                    <!-- Cabecera del formulario -->
                    <div class="flex items-center justify-between px-8 py-5 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            <div id="form-mode-indicator" class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div>
                                <h2 id="category-form-title" class="text-lg font-black text-slate-800">Nueva Categoría</h2>
                                <p id="category-form-subtitle" class="text-[11px] text-slate-400 font-medium">Asigna nombre, presupuesto mensual y tipo</p>
                            </div>
                        </div>
                        <button id="close-categories-modal-btn" class="size-9 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-all">
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>

                    <!-- Formulario de Configuración -->
                    <form id="category-form" class="flex flex-grow flex-col space-y-5 p-8 overflow-y-auto custom-scrollbar">
                        <!-- Nombre de la categoría -->
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-pen text-indigo-500"></i>Nombre de la Categoría
                            </label>
                            <div class="relative">
                                <input type="text" id="category-name" placeholder="Ej: Alimentación, Transporte, Salud..." required
                                    class="w-full rounded-2xl bg-slate-50/80 border border-slate-200 px-4 py-3.5 text-sm text-slate-800 font-bold placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs" />
                            </div>
                        </div>

                        <!-- Selector de Tipo de Gasto / Naturaleza -->
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-layer-group text-indigo-500"></i>Tipo de Categoría
                            </label>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="category-type-selector">
                                <label class="cursor-pointer">
                                    <input type="radio" name="category-nature" value="variable" checked class="peer sr-only">
                                    <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-center peer-checked:bg-indigo-50/70 peer-checked:border-indigo-500 peer-checked:text-indigo-700 peer-checked:shadow-xs transition-all hover:bg-slate-100/60">
                                        <i class="fas fa-shopping-bag text-sm mb-1 block"></i>
                                        <span class="text-xs font-bold block">Variable</span>
                                        <span class="text-[9px] text-slate-400 block peer-checked:text-indigo-500">Día a día</span>
                                    </div>
                                </label>
                                <label class="cursor-pointer">
                                    <input type="radio" name="category-nature" value="fixed" class="peer sr-only">
                                    <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-center peer-checked:bg-indigo-50/70 peer-checked:border-indigo-500 peer-checked:text-indigo-700 peer-checked:shadow-xs transition-all hover:bg-slate-100/60">
                                        <i class="fas fa-home text-sm mb-1 block"></i>
                                        <span class="text-xs font-bold block">Fijo</span>
                                        <span class="text-[9px] text-slate-400 block peer-checked:text-indigo-500">Mensual</span>
                                    </div>
                                </label>
                                <label class="cursor-pointer col-span-2 sm:col-span-1">
                                    <input type="radio" name="category-nature" value="savings" class="peer sr-only">
                                    <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-center peer-checked:bg-indigo-50/70 peer-checked:border-indigo-500 peer-checked:text-indigo-700 peer-checked:shadow-xs transition-all hover:bg-slate-100/60">
                                        <i class="fas fa-piggy-bank text-sm mb-1 block"></i>
                                        <span class="text-xs font-bold block">Ahorro / Meta</span>
                                        <span class="text-[9px] text-slate-400 block peer-checked:text-indigo-500">Inversión</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Presupuesto Mensual con atajos -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <i class="fas fa-wallet text-indigo-500"></i>Límite Presupuestal Mensual
                                </label>
                                <span class="text-[10px] text-slate-400 font-semibold">(Opcional)</span>
                            </div>
                            <div class="relative">
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span class="text-slate-400 font-black text-base">S/</span>
                                </div>
                                <input type="number" id="category-budget" placeholder="0.00" min="0" step="0.01"
                                    class="w-full rounded-2xl bg-slate-50/80 border border-slate-200 py-3.5 pl-11 pr-4 text-slate-900 font-black text-lg placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs" />
                            </div>
                            <!-- Botones rápidos de presupuesto -->
                            <div class="flex flex-wrap gap-1.5 pt-1">
                                <button type="button" onclick="const b = document.getElementById('category-budget'); b.value = (parseFloat(b.value || 0) + 100).toFixed(2);" class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">+ S/ 100</button>
                                <button type="button" onclick="const b = document.getElementById('category-budget'); b.value = (parseFloat(b.value || 0) + 250).toFixed(2);" class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">+ S/ 250</button>
                                <button type="button" onclick="const b = document.getElementById('category-budget'); b.value = (parseFloat(b.value || 0) + 500).toFixed(2);" class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">+ S/ 500</button>
                                <button type="button" onclick="const b = document.getElementById('category-budget'); b.value = (parseFloat(b.value || 0) + 1000).toFixed(2);" class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">+ S/ 1,000</button>
                                <button type="button" onclick="document.getElementById('category-budget').value = '';" class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all ml-auto">Borrar</button>
                            </div>
                        </div>

                        <!-- Subcategorías separadas por comas -->
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                <i class="fas fa-tags text-indigo-500"></i>Subcategorías / Etiquetas
                            </label>
                            <input type="text" id="subcategory-list" placeholder="Ej: Supermercado, Restaurantes, Snacks (separados por coma)"
                                class="w-full rounded-2xl bg-slate-50/80 border border-slate-200 px-4 py-3 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs" />
                            <p class="text-[10px] text-slate-400 font-medium">Escribe nombres separados por comas para agrupar subtags.</p>
                        </div>
                    </form>

                    <!-- Barra de Botones Inferior -->
                    <div class="flex items-center justify-between border-t border-slate-100 px-8 py-4 bg-white shrink-0">
                        <button type="button" id="btn-clear-category-form"
                            class="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
                            Limpiar formulario
                        </button>
                        <div class="flex items-center gap-2">
                            <button type="submit" form="category-form"
                                class="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 flex items-center gap-2">
                                <i class="fas fa-save text-xs"></i>
                                <span id="btn-submit-category-text">Guardar Categoría</span>
                            </button>
                        </div>
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


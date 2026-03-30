/**
 * @class ModalParticipante
 * @extends HTMLElement
 * @description Componente web para el formulario de añadir/editar un integrante (Perfil Financiero).
 * Maneja metas de ahorro, porcentajes e ingresos.
 */
export class ModalParticipante extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <div id="add-participant-modal" class="fixed inset-0 z-[90] hidden items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 transition-opacity">
            <div class="flex flex-col w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-pop max-h-[90vh]">
                
                <!-- Encabezado y Avatar -->
                <div class="bg-slate-50 border-b border-gray-100 p-6 flex flex-col items-center shrink-0 relative">
                    <button id="close-participant-modal-btn" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm hover:shadow-md transition-all">
                        <i class="fas fa-times"></i>
                    </button>
                    <h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Perfil Financiero</h3>
                    
                    <div class="relative group mb-3">
                        <div class="w-20 h-20 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-lg border-4 border-white ring-1 ring-gray-200">
                            <span id="participant-avatar-preview">--</span>
                        </div>
                    </div>
                    
                    <input type="text" id="p-name" class="text-center text-xl font-black text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-indigo-500 focus:ring-0 placeholder-gray-300 w-3/4 transition-colors p-1" placeholder="Nombre del Miembro" required autocomplete="off" />
                </div>

                <!-- Formulario -->
                <form id="participant-form" class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <input type="hidden" id="participant-id-to-edit" />

                    <!-- Fuentes de Ingreso -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-xs font-bold text-gray-500 uppercase ml-1">Fuentes de Ingreso</label>
                            <span id="total-income-display" class="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">S/ 0.00</span>
                        </div>
                        <div id="income-list-container" class="space-y-2"></div>
                        <button type="button" id="btn-add-income" class="mt-2 w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 text-xs font-bold rounded-xl hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                            <i class="fas fa-plus-circle mr-1"></i> Agregar Ingreso
                        </button>
                    </div>

                    <hr class="border-gray-100" />

                    <!-- Porcentajes de Ahorro -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-purple-600 uppercase ml-1">Ahorro Compartido</label>
                            <div class="relative">
                                <input type="number" id="p-shared-savings" min="0" max="100" class="w-full py-2 pl-3 pr-8 bg-purple-50 border-purple-100 rounded-xl text-sm font-bold text-purple-700 focus:ring-purple-500 text-center" placeholder="0" />
                                <span class="absolute right-3 top-2 text-purple-300 font-bold text-xs">%</span>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-emerald-600 uppercase ml-1">Ahorro Personal</label>
                            <div class="relative">
                                <input type="number" id="p-independent-savings" min="0" max="100" class="w-full py-2 pl-3 pr-8 bg-emerald-50 border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 focus:ring-emerald-500 text-center" placeholder="0" />
                                <span class="absolute right-3 top-2 text-emerald-300 font-bold text-xs">%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Metas de Ahorro Programadas -->
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100 mt-4">
                        <div class="flex justify-between items-center mb-3">
                            <label class="text-xs font-bold text-gray-600 uppercase flex items-center gap-2"> <i class="fas fa-bullseye text-indigo-500"></i> Metas de Ahorro </label>
                            <button type="button" id="btn-add-goal-input" class="text-[10px] font-bold bg-white border border-gray-200 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm">+ Meta</button>
                        </div>
                        <div id="participant-goals-container" class="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar"></div>
                    </div>
                </form>

                <!-- Footer (Botones) -->
                <div class="p-6 border-t border-gray-100 bg-white shrink-0 z-10">
                    <button type="submit" form="participant-form" id="save-participant-btn" class="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                        <i class="fas fa-check-circle"></i> Guardar Miembro
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
        const btnClose = this.querySelector('#close-participant-modal-btn');
        const modal = this.querySelector('#add-participant-modal');

        btnClose?.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });

        // Actualizar avatar (iniciales) automáticamente cuando el usuario teclea
        const nameInput = this.querySelector('#p-name');
        const avatarPreview = this.querySelector('#participant-avatar-preview');

        nameInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val) {
                avatarPreview.textContent = val.substring(0, 2).toUpperCase();
            } else {
                avatarPreview.textContent = '--';
            }
        });

        // Agregar handler global para abrir el modal desde cualquier lugar
        // (Por ejemplo, en este caso, se abre desde el Sidebar vía un CustomEvent)
        document.addEventListener('openAddParticipantModal', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }
}

customElements.define('modal-participante', ModalParticipante);

/**
 * @class ModalPerfil
 * @extends HTMLElement
 * @description Web Component para el modal de Perfil y Configuración de Cuenta de Usuario.
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalPerfil extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="user-profile-modal"
            class="fixed inset-0 z-[90] hidden items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 transition-opacity custom-scrollbar overflow-y-auto">
            <div class="flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-pop my-auto max-h-[90vh]">
            <div class="w-full md:w-1/3 bg-gray-50 border-r border-gray-100 p-8 flex flex-col items-center text-center relative">
                <button id="close-profile-mobile-btn" class="md:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
                </button>

                <div class="relative mb-6 mt-4">
                <div class="w-32 h-32 bg-gray-900 text-white rounded-full flex items-center justify-center text-4xl font-extrabold shadow-2xl border-4 border-white ring-1 ring-gray-200">
                    <span id="modal-profile-initials">--</span>
                </div>
                <button
                    class="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md transition-transform hover:scale-110"
                    title="Cambiar foto (Próximamente)">
                    <i class="fas fa-camera text-sm"></i>
                </button>
                </div>

                <h3 class="text-xl font-black text-gray-900 leading-tight mb-1" id="display-fullname-preview">Usuario</h3>
                <p class="text-sm text-gray-500 font-medium mb-6" id="display-username-preview">@usuario</p>

                <div class="flex flex-wrap justify-center gap-2 mb-8">
                <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                    <i class="fas fa-circle text-[8px] mr-1"></i> Activo </span>
                <span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                    Plan Free </span>
                </div>

                <div class="w-full space-y-3 mt-auto">
                <button type="button"
                    class="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <i class="fas fa-headset"></i> Soporte Técnico
                </button>
                <button type="button" id="btn-logout-profile"
                    class="w-full py-3 px-4 bg-white border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
                </div>
            </div>

            <div class="w-full md:w-2/3 bg-white flex flex-col flex-1 min-h-0 overflow-hidden relative">
                <div class="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0 z-10">
                <h3 class="text-xl font-bold text-gray-800">Configuración de Cuenta</h3>
                <button id="close-profile-modal-btn" class="hidden md:flex text-gray-300 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-50">
                    <i class="fas fa-times text-xl"></i>
                </button>
                </div>

                <form id="user-profile-form" class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 min-h-0">
                <section>
                    <h4 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-user text-gray-300"></i> Datos Personales</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-700 ml-1">Nombre</label>
                        <input type="text" id="profile-first-name" tabindex="-1" readonly
                        class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Tu nombre" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-700 ml-1">Apellido</label>
                        <input type="text" id="profile-last-name" tabindex="-1" readonly
                        class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Tu apellido" />
                    </div>
                    <div class="space-y-1 md:col-span-2">
                        <label class="text-xs font-bold text-gray-700 ml-1">Nombre de Usuario</label>
                        <div class="relative">
                        <span class="absolute left-4 top-2.5 text-gray-400 font-bold text-sm">@</span>
                        <input type="text" id="profile-username" tabindex="-1" readonly
                            class="w-full rounded-xl border-gray-200 bg-gray-50 pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="usuario" />
                        </div>
                    </div>
                    </div>
                </section>

                <hr class="border-gray-100" />

                <section>
                    <h4 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-envelope text-gray-300"></i> Contacto</h4>
                    <div class="grid grid-cols-1 gap-5">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-700 ml-1">Correo Electrónico</label>
                        <input type="email" id="profile-email" tabindex="-1" readonly
                        class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-700 ml-1">Teléfono</label>
                        <input type="tel" id="profile-phone" tabindex="-1" readonly
                            class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="+51 ..." />
                        </div>
                        <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-700 ml-1">Email Recuperación</label>
                        <input type="email" id="profile-recovery-email" tabindex="-1" readonly
                            class="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="respaldo@..." />
                        </div>
                    </div>
                    </div>
                </section>

                <hr class="border-gray-100" />

                <section>
                    <h4 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-sliders-h text-gray-300"></i> Preferencias</h4>
                    <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer group">
                        <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800">Idioma</p>
                            <p class="text-[10px] text-gray-500">Idioma de la interfaz</p>
                        </div>
                        </div>
                        <select id="profile-language"
                        class="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer text-right">
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        </select>
                    </div>

                    <div class="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                        <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <i class="fas fa-bell"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-800">Notificaciones</p>
                            <p class="text-[10px] text-gray-500">Alertas de gastos y cobros</p>
                        </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="profile-notifications" class="sr-only peer" checked />
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600">
                        </div>
                        </label>
                    </div>
                    </div>
                </section>

                <hr class="border-gray-100" />

                <section class="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                    <h4 class="text-xs font-extrabold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-lock text-red-300"></i> Seguridad</h4>
                    <div class="space-y-1">
                    <label class="text-xs font-bold text-gray-700 ml-1">Cambiar Contraseña</label>
                    <input type="password" id="profile-password" tabindex="-1" readonly
                        class="w-full rounded-xl border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-red-500 transition-all"
                        placeholder="Dejar vacío para mantener" />
                    </div>
                </section>

                <div class="h-4"></div>
                </form>

                <div class="px-8 py-5 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0 z-20">
                <button type="button" id="cancel-profile-btn"
                    class="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" form="user-profile-form" id="save-profile-btn"
                    class="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 shadow-lg transition-all transform active:scale-95 flex items-center gap-2"><i class="fas fa-check-circle"></i> Guardar Todo</button>
                </div>
            </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#user-profile-modal');
        const closeBtnDesktop = this.querySelector('#close-profile-modal-btn');
        const closeBtnMobile = this.querySelector('#close-profile-mobile-btn');
        const cancelBtn = this.querySelector('#cancel-profile-btn');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        if (closeBtnDesktop) closeBtnDesktop.addEventListener('click', closeModal);
        if (closeBtnMobile) closeBtnMobile.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    }
}

customElements.define('modal-perfil', ModalPerfil);

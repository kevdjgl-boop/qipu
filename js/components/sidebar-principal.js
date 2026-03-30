/**
 * @class SidebarPrincipal
 * @extends HTMLElement
 * @description Componente web para el menú lateral de configuración (Ajustes, Billetera, Conexión).
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class SidebarPrincipal extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
        <div id="participant-sidebar"
            class="fixed top-1/2 left-4 -translate-y-1/2 w-[80px] h-auto max-h-[100vh] bg-white rounded-3xl shadow-md z-50 transition-all duration-300 ease-in-out border border-gray-100 flex flex-col overflow-hidden ml-2">
            
            <div class="w-full flex justify-center pt-6 pb-2 shrink-0">
                <button id="close-sidebar-btn"
                    class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 focus:outline-none">
                    <i class="fas fa-bars text-lg"></i>
                </button>
            </div>

            <div id="sidebar-collapsed-content" class="flex-grow flex flex-col justify-center items-center gap-6 w-full pb-6">
                <!-- Iconos colapsados -->
                <a href="#" id="collapsed-btn-participants" data-panel-id="participants"
                    class="group relative flex items-center justify-center w-12 h-12 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300"
                    title="Participantes">
                    <i class="fas fa-users text-xl"></i>
                    <span id="sidebar-participant-count"
                        class="absolute top-2 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 border-2 border-white transform scale-0 transition-transform duration-200"></span>
                </a>

                <a href="#" id="collapsed-btn-wallet" data-panel-id="wallet"
                    class="group relative flex items-center justify-center w-12 h-12 rounded-2xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300"
                    title="Conexión">
                    <i class="fas fa-wallet text-xl"></i>
                </a>

                <a href="#" id="collapsed-btn-data" data-panel-id="data"
                    class="group relative flex items-center justify-center w-12 h-12 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                    title="Mantenimiento">
                    <i class="fas fa-database text-xl"></i>
                </a>
            </div>

            <div id="sidebar-expanded-content" class="hidden h-full flex-col bg-white relative">
                <!-- Contenido Expandido -->
                <div class="px-8 py-8 shrink-0 border-b border-gray-50">
                    <h2 class="text-2xl font-black text-gray-900 tracking-tight">Ajustes</h2>
                    <p class="text-xs text-gray-400 font-medium mt-1">Configura tu grupo y datos</p>
                </div>

                <div id="sidebar-panel-content" class="flex-grow overflow-y-auto px-8 pb-8 custom-scrollbar">
                    
                    <!-- Pestaña Participantes -->
                    <div class="sidebar-panel" id="panel-content-participants" role="tabpanel">
                        <div class="flex justify-between items-center mb-6 mt-4">
                            <h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Miembros</h3>
                            <span id="participant-count-badge" class="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-lg">0</span>
                        </div>
                        <button id="open-add-participant-modal-sidebar"
                            class="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all group mb-6">
                            <div class="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                <i class="fas fa-plus text-xs"></i>
                            </div>
                            <span class="text-xs font-bold">Añadir Nuevo Integrante</span>
                        </button>
                        <div id="participants-list" class="space-y-4"></div>
                    </div>

                    <!-- Pestaña Billetera / Conexión -->
                    <div class="sidebar-panel hidden" id="panel-content-wallet" role="tabpanel">
                        <h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-6 mt-4">Conexión</h3>
                        <div id="wallet-section-container" class="space-y-6">
                            <div id="pre-wallet-controls" class="space-y-4">
                                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                    <div class="w-12 h-12 rounded-2xl bg-white shadow-sm text-indigo-600 flex items-center justify-center mb-4 text-xl">
                                        <i class="fas fa-rocket"></i>
                                    </div>
                                    <h4 class="font-bold text-gray-900 text-lg mb-2">Nuevo Grupo</h4>
                                    <button id="create-wallet-btn" class="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform active:scale-95">Crear Ahora</button>
                                </div>
                                <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                                    <h4 class="font-bold text-gray-900 mb-2">Tengo un código</h4>
                                    <form id="join-wallet-form" class="flex gap-2">
                                        <input type="text" id="join-wallet-id-input" placeholder="ID..." required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 text-gray-800 text-xs font-mono rounded-xl px-4" />
                                        <button type="submit" class="w-10 h-10 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex-shrink-0 flex items-center justify-center shadow-md">
                                            <i class="fas fa-arrow-right"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <!-- Panel Post Conexión (Oculto inicialmente) -->
                            <div id="post-wallet-controls" class="hidden space-y-4">
                                <div class="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                    <p class="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">ID DE MONEDERO</p>
                                    <div class="flex items-center justify-between bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 mb-4">
                                        <input type="text" id="share-wallet-id" readonly class="bg-transparent border-none text-white font-mono text-sm w-full focus:ring-0 px-2" />
                                        <button id="copy-wallet-id-btn" class="w-8 h-8 flex items-center justify-center bg-white text-slate-900 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pestaña Mantenimiento y Datos -->
                    <div class="sidebar-panel hidden" id="panel-content-data" role="tabpanel">
                        <div class="mb-6 mt-4">
                            <h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Exportar Datos</h3>
                            <p class="text-[10px] text-gray-400 mb-4">Descarga tus datos como backup de seguridad.</p>
                            
                            <div id="data-management-section" class="grid gap-2.5">
                                <button id="export-full-json-btn" class="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group text-left">
                                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 flex-shrink-0 transition-transform">
                                        <i class="fas fa-shield-alt"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-800">Backup Completo</h4>
                                        <p class="text-[10px] text-gray-500">Descarga todo (.json) — Recomendado</p>
                                    </div>
                                </button>
                                
                                <button id="export-all-csv-btn" class="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-100 transition-all group text-left">
                                    <div class="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl group-hover:scale-110 flex-shrink-0 transition-transform">
                                        <i class="fas fa-layer-group"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-800">Todo combinado</h4>
                                        <p class="text-[10px] text-gray-500">Gastos + ingresos (.csv)</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div class="border-t border-gray-100 my-4"></div>

                        <div>
                            <h3 class="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Mantenimiento</h3>
                            <div class="grid gap-2.5">
                                <button id="restore-json-btn" class="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group text-left">
                                    <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 flex-shrink-0 transition-transform">
                                        <i class="fas fa-file-upload"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-800">Restaurar</h4>
                                        <p class="text-[10px] text-gray-500">Importar backup .json</p>
                                    </div>
                                </button>
                                <button id="format-data-btn" class="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-100 transition-all group text-left">
                                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 flex-shrink-0 transition-transform">
                                        <i class="fas fa-magic"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-800">Restablecer App</h4>
                                        <p class="text-[10px] text-gray-500">Borrar datos locales</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-6 shrink-0 border-t border-gray-50">
                    <button id="logout-btn" class="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <i class="fas fa-power-off"></i> <span>Cerrar Sesión</span>
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
        const sidebar = this.querySelector('#participant-sidebar');
        const contentCollapsed = this.querySelector('#sidebar-collapsed-content');
        const contentExpanded = this.querySelector('#sidebar-expanded-content');
        const btnClose = this.querySelector('#close-sidebar-btn');
        const panels = this.querySelectorAll('.sidebar-panel');

        let isOpen = false;

        const toggleSidebar = () => {
            isOpen = !isOpen;
            if (isOpen) {
                sidebar.classList.remove('w-[80px]');
                sidebar.classList.add('w-80', 'md:w-[400px]');
                contentCollapsed.classList.add('hidden');
                contentExpanded.classList.remove('hidden');
                contentExpanded.classList.add('flex');
                document.getElementById('sidebar-backdrop')?.classList.add('active');
            } else {
                sidebar.classList.add('w-[80px]');
                sidebar.classList.remove('w-80', 'md:w-[400px]');
                contentCollapsed.classList.remove('hidden');
                contentExpanded.classList.add('hidden');
                contentExpanded.classList.remove('flex');
                document.getElementById('sidebar-backdrop')?.classList.remove('active');
            }
        };

        // Escuchar botón cerrar arriba
        btnClose?.addEventListener('click', toggleSidebar);

        // Escuchar botones collapsed para abrir un panel específico
        const switchPanel = (panelId) => {
            panels.forEach(p => p.classList.add('hidden'));
            const targetPanel = this.querySelector(`#panel-content-${panelId}`);
            if (targetPanel) targetPanel.classList.remove('hidden');
        };

        this.querySelectorAll('[data-panel-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const panelId = btn.getAttribute('data-panel-id');
                switchPanel(panelId);
                if (!isOpen) toggleSidebar();
            });
        });

        // Evento global para escuchar apertura desde fuera del componente (ej: Header botón Ajustes)
        document.addEventListener('openSidebar', () => {
            if (!isOpen) toggleSidebar();
        });
    }
}

customElements.define('sidebar-principal', SidebarPrincipal);

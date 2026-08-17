/**
 * @class ModalTelegram
 * @extends HTMLElement
 * @description Componente web para el modal de integración y conexión con el Bot de Telegram de Qipu 3.0.
 */
export class ModalTelegram extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="telegram-modal"
            class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
            <div class="flex flex-col w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-pop">
                
                <!-- Cabecera con degradado Telegram -->
                <div class="relative bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white overflow-hidden shrink-0">
                    <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    <div class="flex items-center justify-between relative z-10">
                        <div class="flex items-center gap-3.5">
                            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-md shadow-sky-900/20 text-2xl">
                                <i class="fab fa-telegram-plane"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-black tracking-tight leading-tight">Bot de Telegram</h2>
                                <p class="text-xs text-sky-100 font-medium">Registra gastos al instante por chat</p>
                            </div>
                        </div>
                        <button id="close-telegram-modal-btn" class="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Cuerpo del Modal -->
                <div class="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar space-y-5">
                    
                    <!-- Paso 1: Vinculación Rápida -->
                    <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <span class="size-4 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center font-bold">1</span>
                                Comando de Vinculación
                            </span>
                            <span class="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">Copia y pega en tu Bot</span>
                        </div>

                        <div class="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <code id="telegram-link-command-display" class="font-mono text-xs font-bold text-slate-800 flex-1 truncate select-all">/vincular ...</code>
                            <button id="copy-telegram-link-cmd-btn" class="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0">
                                <i class="fas fa-copy text-xs"></i>
                                <span>Copiar</span>
                            </button>
                        </div>
                    </div>

                    <!-- Paso 2: Ejemplos de Registro -->
                    <div class="space-y-2.5">
                        <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span class="size-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">2</span>
                            Ejemplos de Mensajes
                        </h4>
                        
                        <div class="grid grid-cols-1 gap-2 text-xs">
                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <span class="font-mono font-bold text-slate-800">25.50 Almuerzo</span>
                                    <p class="text-[10px] text-slate-400">Gasto personal en Alimentación</p>
                                </div>
                                <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Personal</span>
                            </div>

                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <span class="font-mono font-bold text-slate-800">120 Cena amigos compartido bcp</span>
                                    <p class="text-[10px] text-slate-400">Gasto dividido entre todos los integrantes</p>
                                </div>
                                <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Compartido</span>
                            </div>

                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <span class="font-mono font-bold text-slate-800">Taxi 18 efectivo transporte</span>
                                    <p class="text-[10px] text-slate-400">Detecta transporte y método de pago</p>
                                </div>
                                <span class="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">Auto-categoría</span>
                            </div>

                            <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <span class="font-mono font-bold text-slate-800">/saldo</span>
                                    <p class="text-[10px] text-slate-400">Consulta tu disponible y últimos gastos</p>
                                </div>
                                <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Resumen</span>
                            </div>
                        </div>
                    </div>

                    <!-- Estado del Servicio / Guía de Servidor -->
                    <div class="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-start gap-3">
                        <i class="fas fa-info-circle text-sky-500 mt-0.5 text-sm shrink-0"></i>
                        <div class="text-[11px] text-slate-600 space-y-1">
                            <p class="font-bold text-slate-800">¿Cómo funciona?</p>
                            <p>El bot se comunica en tiempo real con tu base de datos en Firebase. Cualquier gasto enviado por Telegram aparecerá inmediatamente en este Dashboard sin recargar.</p>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
                    <button type="button" id="btn-close-telegram-modal" class="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all">
                        Entendido
                    </button>
                </div>

            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#telegram-modal');
        const closeBtn = this.querySelector('#close-telegram-modal-btn');
        const footerCloseBtn = this.querySelector('#btn-close-telegram-modal');
        const copyBtn = this.querySelector('#copy-telegram-link-cmd-btn');
        const cmdDisplay = this.querySelector('#telegram-link-command-display');

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeModal);

        if (copyBtn && cmdDisplay) {
            copyBtn.addEventListener('click', () => {
                const textToCopy = cmdDisplay.textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<i class="fas fa-check text-xs"></i> <span>¡Copiado!</span>`;
                    copyBtn.classList.replace('bg-sky-500', 'bg-emerald-600');
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.classList.replace('bg-emerald-600', 'bg-sky-500');
                    }, 2000);
                });
            });
        }
    }
}

customElements.define('modal-telegram', ModalTelegram);

/**
 * @class LayoutPrincipal
 * @extends HTMLElement
 * @description Contenedor principal de la aplicación. Maneja el diseño base, sidebar y disposición de secciones.
 * Inyecta el contenido en Light DOM.
 */
export class LayoutPrincipal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        // En Light DOM
        this.innerHTML = `
        <div id="sidebar-backdrop" class="backdrop"></div>
        <div id="initial-loading-screen" class="max-w-7xl mx-auto px-4 md:px-8 pt-20 flex justify-center items-center h-64">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i>
                <p class="mt-3 text-gray-600 font-semibold">Cargando datos financieros...</p>
            </div>
        </div>

        <div id="mobile-menu" class="lg:hidden bg-white border-t border-gray-200 p-3 shadow-2xl flex justify-around fixed bottom-0 left-0 right-0 z-40">
            <button id="mobile-add-expense-btn" class="text-red-500 text-xs text-center"><i class="fas fa-plus-circle text-2xl"></i><br />Gasto</button>
            <button onclick="document.querySelector('#participants-config-section')?.scrollIntoView({ behavior: 'smooth' })" class="text-purple-500 text-xs text-center"><i class="fas fa-users text-2xl"></i><br />Participantes</button>
            <button onclick="document.querySelector('section:last-of-type')?.scrollIntoView({ behavior: 'smooth' })" class="text-gray-500 text-xs text-center"><i class="fas fa-list-alt text-2xl"></i><br />Informe</button>
        </div>

        <div id="app-layout" class="">
            <!-- Slot para el Sidebar de Configuración -->
            <div id="sidebar-slot"></div>

            <div id="main-content-wrapper" class="">
                 <!-- Slot Principal -->
                 <div id="main-slot"></div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        // Lógica asociada al layout si se requiere (ej. toggle de sidebar backdrop)
    }
}

customElements.define('layout-principal', LayoutPrincipal);

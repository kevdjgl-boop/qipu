/**
 * @file main.js
 * @description Punto de entrada principal de la aplicación.
 * Registra y carga los Web Components creados.
 */

// Importar los Web Components nativos
import { LayoutPrincipal } from './components/layout-principal.js';
import { SidebarPrincipal } from './components/sidebar-principal.js';
import { VistaDashboard } from './components/vista-dashboard.js';
import { VistaHistorial } from './components/vista-historial.js';
import { ModalBilletera } from './components/modal-billetera.js';
import { ModalTransaccion } from './components/modal-transaccion.js';
console.log("Qipu 3.0 Web Components Inicializados correctamente.");

const loader = document.getElementById('initial-loading-screen');
if (loader) {
    loader.classList.add('hidden');
}

const mainSlot = document.getElementById('main-slot');
const sidebarSlot = document.getElementById('sidebar-slot');

if (sidebarSlot) {
    sidebarSlot.innerHTML = `<sidebar-principal></sidebar-principal>`;
}

if (mainSlot) {
    mainSlot.innerHTML = `
        <vista-dashboard id="view-dashboard"></vista-dashboard>
        <vista-historial id="view-history" class="hidden"></vista-historial>
    `;
}

// Aseguramos que la lógica legacy cargue ÚNICAMENTE cuando todos los componentes se definieron
Promise.all([
    customElements.whenDefined('sidebar-principal'),
    customElements.whenDefined('layout-principal'),
    customElements.whenDefined('modal-billetera'),
    customElements.whenDefined('modal-transaccion'),
    customElements.whenDefined('modal-participante'),
    customElements.whenDefined('modal-repartir'),
    customElements.whenDefined('modal-ahorros'),
    customElements.whenDefined('vista-historial'),
    customElements.whenDefined('vista-dashboard'),
    customElements.whenDefined('modal-importacion'),
    customElements.whenDefined('modal-categorias'),
    customElements.whenDefined('modal-metodos-pago'),
    customElements.whenDefined('modal-metodo-detalle'),
    customElements.whenDefined('modal-perfil'),
    customElements.whenDefined('modal-ingreso-rapido'),
    customElements.whenDefined('modal-global')
]).then(() => {
    console.log("Todos los Web Components están listos en el DOM. Inicializando lógica core (App.js y Flowbite)...");

    const flowbiteScript = document.createElement('script');
    flowbiteScript.src = "https://cdn.jsdelivr.net/npm/flowbite@3.1.2/dist/flowbite.min.js";
    document.body.appendChild(flowbiteScript);

    flowbiteScript.onload = () => {
        console.log("Flowbite loaded. Reinicializando escuchas nativas de la UI...");
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        } else if (typeof initFlowbite === 'function') {
            initFlowbite();
        }

        const appScript = document.createElement('script');
        appScript.type = "module";
        appScript.src = "js/app.js";
        document.body.appendChild(appScript);
    };
});

/**
 * @file main.js
 * @description Punto de entrada principal de la aplicación.
 * Registra y carga los Web Components creados.
 */

// Importar TODOS los Web Components nativos
import { LayoutPrincipal } from './components/layout-principal.js';
import { SidebarPrincipal } from './components/sidebar-principal.js';
import { VistaDashboard } from './components/vista-dashboard.js';
import { VistaHistorial } from './components/vista-historial.js';
import { ModalBilletera } from './components/modal-billetera.js';
import { ModalTransaccion } from './components/modal-transaccion.js';
import { ModalTelegram } from './components/modal-telegram.js';
import { ModalParticipante } from './components/modal-participante.js';
import { ModalRepartir } from './components/modal-repartir.js';
import { ModalAhorros } from './components/modal-ahorros.js';
import { ModalImportacion } from './components/modal-importacion.js';
import { ModalCategorias } from './components/modal-categorias.js';
import { ModalMetodosPago } from './components/modal-metodos-pago.js';
import { ModalMetodoDetalle } from './components/modal-metodo-detalle.js';
import { ModalPerfil } from './components/modal-perfil.js';
import { ModalIngresoRapido } from './components/modal-ingreso-rapido.js';
import { ModalGlobal } from './components/modal-global.js';

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
        <modal-transaccion></modal-transaccion>
        <modal-categorias></modal-categorias>
        <modal-metodos-pago></modal-metodos-pago>
        <modal-metodo-detalle></modal-metodo-detalle>
        <modal-participante></modal-participante>
        <modal-perfil></modal-perfil>
        <modal-billetera></modal-billetera>
        <modal-ahorros></modal-ahorros>
        <modal-repartir></modal-repartir>
        <modal-importacion></modal-importacion>
        <modal-ingreso-rapido></modal-ingreso-rapido>
        <modal-telegram></modal-telegram>
        <modal-global></modal-global>
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
    customElements.whenDefined('modal-telegram'),
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

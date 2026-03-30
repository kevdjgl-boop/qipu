/**
 * @class ModalImportacion
 * @extends HTMLElement
 * @description Web Component para el modal de Importar/Restaurar Datos (Backup JSON).
 * Utiliza Light DOM para heredar clases de Tailwind CSS nativamente.
 */
export class ModalImportacion extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <div id="import-json-modal"
            class="fixed inset-0 bg-gray-600 bg-opacity-70 hidden items-center justify-center p-4 z-[60]">
            <div class="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full">
            <h3 class="text-2xl font-bold mb-4 text-gray-800">Importar/Restaurar Datos</h3>
            <p class="text-sm text-gray-600 mb-4">Pega el texto de respaldo (JSON) en el siguiente campo para restaurar tus
                datos. Esto sobrescribirá todos los datos del monedero actual.</p>
            <form id="import-json-form">
                <textarea id="json-input-area"
                class="w-full h-48 p-3 border rounded bg-gray-50 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                placeholder="Pega el texto JSON aquí..."></textarea>
                <div class="grid grid-cols-2 gap-3 mt-6">
                <button type="submit" id="confirm-import-btn"
                    class="py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">Confirmar
                    Importación</button>
                <button type="button" id="cancel-import-btn"
                    class="py-2 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition">Cancelar</button>
                </div>
            </form>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const modal = this.querySelector('#import-json-modal');
        const cancelBtn = this.querySelector('#cancel-import-btn');

        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }
    }
}

customElements.define('modal-importacion', ModalImportacion);

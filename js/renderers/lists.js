/**
 * @file lists.js
 * @description Funciones puras que retornan Template Literals en HTML para listas iterativas.
 */

/**
 * Retorna el HTML para un ítem del historial de transacciones.
 * @param {Object} item - Objeto con datos de la transacción.
 * @returns {string} HTML de la fila de la transacción.
 */
export function renderTransactionItem(item) {
    const isShared = item.type === 'shared';
    const amountClass = item.amount < 0 ? 'text-red-500' : 'text-emerald-500';
    const sign = item.amount < 0 ? '-' : '+';

    return `
        <div class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group mb-2">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl ${isShared ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-gray-500'} flex items-center justify-center flex-shrink-0">
                    <i class="fas ${item.icon || 'fa-receipt'} text-xl group-hover:scale-110 transition-transform"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800 text-sm md:text-base leading-tight">
                        ${item.description || 'Sin descripción'}
                        ${isShared ? '<span class="ml-2 px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wide">Compartido</span>' : ''}
                    </h4>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <span class="text-xs text-gray-500 font-medium">${item.date || 'Sin fecha'}</span>
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">${item.category || 'Varios'}</span>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <p class="${amountClass} font-black text-lg md:text-xl">${sign} S/ ${Math.abs(item.amount || 0).toFixed(2)}</p>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">${item.paymentMethod || 'Efectivo'}</p>
            </div>
        </div>
    `;
}

/**
 * Retorna el HTML para un ítem de la lista de categorías.
 * @param {Object} category - Objeto con datos de la categoría.
 * @returns {string} HTML del ítem de la categoría.
 */
export function renderCategoryItem(category) {
    return `
        <div class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors mb-2">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg ${category.colorClass || 'bg-gray-50 text-gray-600'} flex items-center justify-center">
                    <i class="fas ${category.icon || 'fa-tags'}"></i>
                </div>
                <div>
                    <h5 class="font-bold text-gray-800 text-sm">${category.name || 'Categoría'}</h5>
                    <p class="text-[10px] text-gray-400 mt-0.5">${category.subcategories ? category.subcategories.join(', ') : 'Sin subcategorías'}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs font-bold text-gray-600">Presupuesto</p>
                <p class="text-sm font-black text-gray-900">S/ ${(category.budget || 0).toFixed(2)}</p>
            </div>
        </div>
    `;
}

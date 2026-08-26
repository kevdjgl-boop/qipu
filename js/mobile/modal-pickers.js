import { appState } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";

export let currentPickerType = null;

// Mapeo de iconos a Google Material Symbols Rounded
function getMaterialSymbolForPicker(iconName, fallback = 'category') {
  if (!iconName) return fallback;
  const map = {
    'fa-utensils': 'restaurant',
    'fa-car': 'directions_car',
    'fa-bolt': 'bolt',
    'fa-gamepad': 'sports_esports',
    'fa-heartbeat': 'health_and_safety',
    'fa-home': 'home',
    'fa-shopping-bag': 'shopping_bag',
    'fa-shopping-cart': 'shopping_cart',
    'fa-graduation-cap': 'school',
    'fa-plane': 'flight',
    'fa-tshirt': 'apparel',
    'fa-shapes': 'category',
    'fa-gift': 'redeem',
    'fa-coffee': 'coffee',
    'fa-film': 'movie',
    'fa-book': 'menu_book',
    'fa-wifi': 'wifi',
    'fa-paw': 'pets',
    'fa-dumbbell': 'fitness_center',
    'fa-stethoscope': 'medical_services',
    'fa-money-bill-wave': 'payments',
    'fa-credit-card': 'credit_card',
    'fa-exchange-alt': 'sync_alt',
    'fa-balance-scale': 'balance',
    'fa-percentage': 'percent',
    'fa-list-ol': 'format_list_numbered',
    'fa-calendar-alt': 'calendar_month',
    'fa-calendar-check': 'event_available',
    'fa-calendar-week': 'calendar_view_week',
    'fa-calendar': 'calendar_today',
    'fa-infinity': 'all_inclusive',
    'fa-layer-group': 'layers'
  };

  if (map[iconName]) return map[iconName];
  if (iconName.startsWith('fa-')) {
    const raw = iconName.replace('fa-', '').replace(/-/g, '_');
    return map[iconName] || raw;
  }
  return iconName || fallback;
}

export function openOptionPicker(type) {
  currentPickerType = type;
  const titleEl = document.getElementById('option-picker-title');
  const container = document.getElementById('option-picker-items-container');
  if (!titleEl || !container) return;

  let title = 'Seleccionar';
  let options = [];
  let currentValue = '';

  if (type === 'category') {
    title = 'Seleccionar Categoría';
    currentValue = document.getElementById('exp-category')?.value || 'General';
    
    const cats = (appState.categories && appState.categories.length > 0)
      ? appState.categories
      : [
          { name: 'General', icon: 'category' },
          { name: 'Comida', icon: 'restaurant' },
          { name: 'Transporte', icon: 'directions_car' },
          { name: 'Servicios', icon: 'bolt' },
          { name: 'Ocio', icon: 'sports_esports' },
          { name: 'Salud', icon: 'health_and_safety' },
          { name: 'Hogar', icon: 'home' },
          { name: 'Compras', icon: 'shopping_bag' },
          { name: 'Educación', icon: 'school' },
          { name: 'Viajes', icon: 'flight' },
          { name: 'Ropa', icon: 'apparel' },
          { name: 'Mascotas', icon: 'pets' },
          { name: 'Café', icon: 'coffee' },
          { name: 'Regalos', icon: 'redeem' },
          { name: 'Otros', icon: 'more_horiz' }
        ];

    titleEl.textContent = title;

    // Cuadrícula 5 columnas de cuadros 70x70px con esquinas diferenciadas
    const numCols = 5;
    const totalItems = cats.length;
    const totalRows = Math.ceil(totalItems / numCols);

    const gridHtml = cats.map((c, i) => {
      const isSelected = c.name === currentValue;
      const r = Math.floor(i / numCols);
      const col = i % numCols;

      let cornerStyle = 'border-radius: 8px;';
      if (r === 0 && col === 0) {
        cornerStyle = 'border-radius: 8px 8px 8px 8px; border-top-left-radius: 16px;';
      } else if (r === 0 && (col === numCols - 1 || i === totalItems - 1)) {
        cornerStyle = 'border-radius: 8px 8px 8px 8px; border-top-right-radius: 16px;';
      } else if (r === totalRows - 1 && col === 0) {
        cornerStyle = 'border-radius: 8px 8px 8px 8px; border-bottom-left-radius: 16px;';
      } else if (i === totalItems - 1) {
        cornerStyle = 'border-radius: 8px 8px 8px 8px; border-bottom-right-radius: 16px;';
      }

      const symbol = getMaterialSymbolForPicker(c.icon, 'category');

      let btnClass = 'w-[70px] h-[70px] min-w-[70px] min-h-[70px] flex flex-col items-center justify-center gap-1 p-1.5 transition-all active:scale-95 cursor-pointer select-none ';
      if (isSelected) {
        btnClass += 'bg-[#C3F1B3] text-[#273019] shadow-xs';
      } else {
        btnClass += 'bg-slate-50 hover:bg-slate-100 text-slate-700';
      }

      return `
        <button type="button" style="width: 70px; height: 70px; min-width: 70px; min-height: 70px; max-width: 70px; max-height: 70px; ${cornerStyle}"
          onclick="selectOptionPickerValue('category', '${c.name.replace(/'/g, "\\'")}', '${c.name.replace(/'/g, "\\'")}', '', this)"
          class="${btnClass}">
          <span class="material-symbols-rounded text-2xl ${isSelected ? 'text-[#273019]' : 'text-slate-700'}">${symbol}</span>
          <span class="text-[10px] font-black leading-none truncate max-w-[62px] ${isSelected ? 'text-[#273019]' : 'text-slate-800'}">${c.name}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="grid justify-center py-2" style="grid-template-columns: repeat(5, 70px); gap: 4px; width: fit-content; margin: 0 auto;">
        ${gridHtml}
      </div>
    `;

    openModal('modal-option-picker');
    return;
  }

  // Otros tipos de selectores (Método de Pago, División, Frecuencia, etc.)
  if (type === 'payment-method') {
    title = 'Seleccionar Método de Pago';
    currentValue = document.getElementById('exp-payment-method')?.value || 'Efectivo';
    const pms = (appState.paymentMethods && appState.paymentMethods.length > 0)
      ? appState.paymentMethods
      : [{ id: 'm1', name: 'Efectivo', type: 'cash' }, { id: 'm2', name: 'Tarjeta', type: 'card' }, { id: 'm3', name: 'Transferencia', type: 'transfer' }];
    options = pms.map(pm => ({
      value: pm.name,
      label: pm.name,
      extra: pm.id,
      icon: pm.type === 'cash' ? 'payments' : (pm.type === 'card' ? 'credit_card' : 'sync_alt'),
      subtitle: pm.type ? pm.type.toUpperCase() : 'Método de pago'
    }));
  } else if (type === 'split-mode') {
    title = 'Modo de División de Gasto';
    currentValue = document.getElementById('exp-split-mode-select')?.value || 'equitativo';
    options = [
      { value: 'equitativo', label: 'Equitativo', icon: 'balance', subtitle: 'División en partes iguales entre los miembros' },
      { value: 'porcentual', label: 'Porcentual', icon: 'percent', subtitle: 'Según el porcentaje de presupuesto de cada miembro' },
      { value: 'detallado', label: 'Detallado', icon: 'format_list_numbered', subtitle: 'Permite asignar productos específicos por miembro' }
    ];
  } else if (type === 'fixed-frequency') {
    title = 'Frecuencia de Gasto Fijo';
    currentValue = document.getElementById('exp-fixed-frequency')?.value || 'monthly';
    options = [
      { value: 'monthly', label: 'Mensual', icon: 'calendar_month', subtitle: 'Se repite cada mes' },
      { value: 'biweekly', label: 'Quincenal', icon: 'event_available', subtitle: 'Se repite cada 15 días' },
      { value: 'weekly', label: 'Semanal', icon: 'calendar_view_week', subtitle: 'Se repite cada semana' },
      { value: 'yearly', label: 'Anual', icon: 'calendar_today', subtitle: 'Se repite cada año' }
    ];
  } else if (type === 'fixed-repeat') {
    title = 'Repetición / Cuotas';
    currentValue = document.getElementById('exp-fixed-repeat')?.value || 'indefinite';
    options = [
      { value: 'indefinite', label: 'Indefinido', icon: 'all_inclusive', subtitle: 'Sin límite de cuotas / recurrente continuo' },
      { value: '2', label: '2 veces / cuotas', icon: 'layers', subtitle: '2 meses' },
      { value: '3', label: '3 veces / cuotas', icon: 'layers', subtitle: '3 meses' },
      { value: '6', label: '6 veces / cuotas', icon: 'layers', subtitle: '6 meses' },
      { value: '12', label: '12 veces / cuotas', icon: 'layers', subtitle: '12 meses (1 año)' },
      { value: '24', label: '24 veces / cuotas', icon: 'layers', subtitle: '24 meses (2 años)' }
    ];
  }

  titleEl.textContent = title;
  container.innerHTML = `
    <div class="space-y-1.5">
      ${options.map(opt => {
        const isSelected = opt.value === currentValue;
        return `
          <button type="button" data-val="${opt.value}" onclick="selectOptionPickerValue('${type}', '${opt.value}', '${opt.label.replace(/'/g, "\\'")}', '${opt.extra || ''}', this)"
            class="w-full h-[40px] max-h-[40px] px-3 rounded-xl flex items-center justify-between transition-all active:scale-98 cursor-pointer select-none ${isSelected ? 'bg-[#ECF9E1] text-[#273019] shadow-2xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'}">
            <div class="flex items-center gap-2.5 text-left min-w-0 flex-1">
              <div class="w-6 h-6 min-w-[24px] min-h-[24px] rounded-lg flex items-center justify-center text-xs shrink-0 ${isSelected ? 'bg-[#90CE59] text-[#273019] shadow-xs' : 'bg-white text-slate-700'}">
                <span class="material-symbols-rounded text-sm">${opt.icon}</span>
              </div>
              <div class="min-w-0 flex-1 flex items-center gap-1.5">
                <h4 class="text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-900'} truncate">${opt.label}</h4>
                ${opt.subtitle ? `<span class="text-[9px] ${isSelected ? 'text-emerald-800 font-bold' : 'text-slate-400 font-semibold'} truncate">(${opt.subtitle})</span>` : ''}
              </div>
            </div>
            <div class="w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${isSelected ? 'border-[#90CE59] bg-[#90CE59]' : 'border-slate-300 bg-white'}">
              ${isSelected ? '<span class="material-symbols-rounded text-[11px] font-black text-[#273019]">check</span>' : ''}
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  openModal('modal-option-picker');
}

export function selectOptionPickerValue(type, value, label, extra, clickedBtn = null) {
  // 1. Feedback visual inmediato en el botón pulsado
  if (clickedBtn) {
    const parent = clickedBtn.parentElement;
    if (type === 'category') {
      const allCategoryBtns = parent?.querySelectorAll('button');
      allCategoryBtns?.forEach(b => {
        b.className = 'w-[70px] h-[70px] min-w-[70px] min-h-[70px] flex flex-col items-center justify-center gap-1 p-1.5 transition-all active:scale-95 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 text-slate-700';
      });
      clickedBtn.className = 'w-[70px] h-[70px] min-w-[70px] min-h-[70px] flex flex-col items-center justify-center gap-1 p-1.5 transition-all active:scale-95 cursor-pointer select-none bg-[#C3F1B3] text-[#273019] shadow-xs';
    } else {
      const allRowBtns = parent?.querySelectorAll('button');
      allRowBtns?.forEach(b => {
        b.className = 'w-full h-[40px] max-h-[40px] px-3 rounded-xl flex items-center justify-between transition-all active:scale-98 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 text-slate-800';
        const iconBox = b.querySelector('.w-6');
        if (iconBox) iconBox.className = 'w-6 h-6 min-w-[24px] min-h-[24px] rounded-lg flex items-center justify-center text-xs shrink-0 bg-white text-slate-700';
        const radio = b.querySelector('.rounded-full.border-2');
        if (radio) {
          radio.className = 'w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-full border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 ml-2';
          radio.innerHTML = '';
        }
      });

      clickedBtn.className = 'w-full h-[40px] max-h-[40px] px-3 rounded-xl flex items-center justify-between transition-all active:scale-98 cursor-pointer select-none bg-[#ECF9E1] text-[#273019] shadow-2xs';
      const activeIconBox = clickedBtn.querySelector('.w-6');
      if (activeIconBox) activeIconBox.className = 'w-6 h-6 min-w-[24px] min-h-[24px] rounded-lg flex items-center justify-center text-xs shrink-0 bg-[#90CE59] text-[#273019] shadow-xs';
      const activeRadio = clickedBtn.querySelector('.rounded-full.border-2');
      if (activeRadio) {
        activeRadio.className = 'w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-full border-2 border-[#90CE59] bg-[#90CE59] flex items-center justify-center shrink-0 ml-2';
        activeRadio.innerHTML = '<span class="material-symbols-rounded text-[11px] font-black text-[#273019]">check</span>';
      }
    }
  }

  // 2. Actualizar campos del formulario
  if (type === 'category') {
    const input = document.getElementById('exp-category');
    const chip = document.getElementById('chip-category-label');
    if (input) input.value = value;
    if (chip) chip.textContent = label;
  } else if (type === 'payment-method') {
    const input = document.getElementById('exp-payment-method');
    const inputId = document.getElementById('exp-payment-method-id');
    const chip = document.getElementById('chip-pm-label');
    if (input) input.value = value;
    if (inputId) inputId.value = extra || '';
    if (chip) chip.textContent = label;
  } else if (type === 'split-mode') {
    const input = document.getElementById('exp-split-mode-select');
    const chip = document.getElementById('chip-split-mode-label');
    if (input) input.value = value;
    if (chip) chip.textContent = label;
  } else if (type === 'fixed-frequency') {
    const input = document.getElementById('exp-fixed-frequency');
    const chip = document.getElementById('chip-frequency-label');
    if (input) input.value = value;
    if (chip) chip.textContent = label;
  } else if (type === 'fixed-repeat') {
    const input = document.getElementById('exp-fixed-repeat');
    const chip = document.getElementById('chip-repeat-label');
    if (input) input.value = value;
    if (chip) chip.textContent = label;
  }

  // 3. Tras 1200ms de mostrar la selección activa, cerrar el modal
  setTimeout(() => {
    closeModal('modal-option-picker');
  }, 1200);
}

export function populateSelectOptions() {
  const payerSelect = document.getElementById('exp-payer');
  const incParticipantSelect = document.getElementById('inc-participant');
  const participantsHtml = (appState.participants || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  if (payerSelect) payerSelect.innerHTML = participantsHtml || `<option value="default">Principal</option>`;
  if (incParticipantSelect) incParticipantSelect.innerHTML = participantsHtml || `<option value="default">Principal</option>`;
}

// Exponer en window para eventos inline
window.openOptionPicker = openOptionPicker;
window.selectOptionPickerValue = selectOptionPickerValue;
window.populateSelectOptions = populateSelectOptions;

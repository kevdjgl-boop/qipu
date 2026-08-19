import { appState } from "./core-state.js";
import { openModal, closeModal } from "./modal-system.js";

export let currentPickerType = null;

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
      : [{ name: 'General', icon: 'fa-shapes' }, { name: 'Alimentación', icon: 'fa-utensils' }, { name: 'Transporte', icon: 'fa-car' }, { name: 'Servicios', icon: 'fa-bolt' }, { name: 'Entretenimiento', icon: 'fa-gamepad' }, { name: 'Salud', icon: 'fa-heartbeat' }, { name: 'Hogar', icon: 'fa-home' }];
    options = cats.map(c => ({
      value: c.name,
      label: c.name,
      icon: c.icon || 'fa-shapes',
      subtitle: 'Categoría de gasto'
    }));
  } else if (type === 'payment-method') {
    title = 'Seleccionar Método de Pago';
    currentValue = document.getElementById('exp-payment-method')?.value || 'Efectivo';
    const pms = (appState.paymentMethods && appState.paymentMethods.length > 0)
      ? appState.paymentMethods
      : [{ id: 'm1', name: 'Efectivo', type: 'cash' }, { id: 'm2', name: 'Tarjeta', type: 'card' }, { id: 'm3', name: 'Transferencia', type: 'transfer' }];
    options = pms.map(pm => ({
      value: pm.name,
      label: pm.name,
      extra: pm.id,
      icon: pm.type === 'cash' ? 'fa-money-bill-wave' : (pm.type === 'card' ? 'fa-credit-card' : 'fa-exchange-alt'),
      subtitle: pm.type ? pm.type.toUpperCase() : 'Método de pago'
    }));
  } else if (type === 'split-mode') {
    title = 'Modo de División de Gasto';
    currentValue = document.getElementById('exp-split-mode-select')?.value || 'equitativo';
    options = [
      { value: 'equitativo', label: 'Equitativo', icon: 'fa-balance-scale', subtitle: 'División en partes iguales entre los miembros' },
      { value: 'porcentual', label: 'Porcentual', icon: 'fa-percentage', subtitle: 'Según el porcentaje de presupuesto de cada miembro' },
      { value: 'detallado', label: 'Detallado', icon: 'fa-list-ol', subtitle: 'Permite asignar productos específicos por miembro' }
    ];
  } else if (type === 'fixed-frequency') {
    title = 'Frecuencia de Gasto Fijo';
    currentValue = document.getElementById('exp-fixed-frequency')?.value || 'monthly';
    options = [
      { value: 'monthly', label: 'Mensual', icon: 'fa-calendar-alt', subtitle: 'Se repite cada mes' },
      { value: 'biweekly', label: 'Quincenal', icon: 'fa-calendar-check', subtitle: 'Se repite cada 15 días' },
      { value: 'weekly', label: 'Semanal', icon: 'fa-calendar-week', subtitle: 'Se repite cada semana' },
      { value: 'yearly', label: 'Anual', icon: 'fa-calendar', subtitle: 'Se repite cada año' }
    ];
  } else if (type === 'fixed-repeat') {
    title = 'Repetición / Cuotas';
    currentValue = document.getElementById('exp-fixed-repeat')?.value || 'indefinite';
    options = [
      { value: 'indefinite', label: 'Indefinido', icon: 'fa-infinity', subtitle: 'Sin límite de cuotas / recurrente continuo' },
      { value: '2', label: '2 veces / cuotas', icon: 'fa-layer-group', subtitle: '2 meses' },
      { value: '3', label: '3 veces / cuotas', icon: 'fa-layer-group', subtitle: '3 meses' },
      { value: '6', label: '6 veces / cuotas', icon: 'fa-layer-group', subtitle: '6 meses' },
      { value: '12', label: '12 veces / cuotas', icon: 'fa-layer-group', subtitle: '12 meses (1 año)' },
      { value: '24', label: '24 veces / cuotas', icon: 'fa-layer-group', subtitle: '24 meses (2 años)' }
    ];
  }

  titleEl.textContent = title;
  container.innerHTML = options.map(opt => {
    const isSelected = opt.value === currentValue;
    return `
      <button type="button" onclick="selectOptionPickerValue('${type}', '${opt.value}', '${opt.label.replace(/'/g, "\\'")}', '${opt.extra || ''}')"
        class="w-full p-3.5 rounded-2xl flex items-center justify-between transition-all active:scale-98 ${isSelected ? 'bg-emerald-50 border-2 border-emerald-500 shadow-2xs' : 'bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100'}">
        <div class="flex items-center gap-3 text-left min-w-0 flex-1">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'}">
            <i class="fas ${opt.icon}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-900'} truncate">${opt.label}</h4>
            ${opt.subtitle ? `<p class="text-[10px] ${isSelected ? 'text-emerald-700 font-semibold' : 'text-slate-400 font-medium'} truncate">${opt.subtitle}</p>` : ''}
          </div>
        </div>
        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'}">
          ${isSelected ? '<i class="fas fa-check text-[9px] text-white"></i>' : ''}
        </div>
      </button>
    `;
  }).join('');

  openModal('modal-option-picker');
}

export function selectOptionPickerValue(type, value, label, extra) {
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
  closeModal('modal-option-picker');
}

export function populateSelectOptions() {
  const payerSelect = document.getElementById('exp-payer');
  const incParticipantSelect = document.getElementById('inc-participant');
  const participantsHtml = (appState.participants || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  if (payerSelect) payerSelect.innerHTML = participantsHtml || `<option value="default">Principal</option>`;
  if (incParticipantSelect) incParticipantSelect.innerHTML = participantsHtml || `<option value="default">Principal</option>`;
}

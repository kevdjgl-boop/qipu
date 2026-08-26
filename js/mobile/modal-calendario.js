import { openModal, closeModal } from "./modal-system.js";
import { updateDateChipLabel } from "./vista-registro.js";

// ================================================================
// ESTADO DEL CALENDARIO BOTTOM SHEET (M3 CLEAN CALENDAR)
// ================================================================
export let calendarViewYear = new Date().getFullYear();
export let calendarViewMonth = new Date().getMonth(); // 0 - 11
export let selectedCalendarDate = new Date().toISOString().split('T')[0];
export let currentWeekOffset = 0; // Índice relativo de semana activa
export let isCalendarExpanded = false; // false = abre por defecto en vista semana

// Gestos táctiles interactivos
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let isSwipingCalendar = false;
let isHorizontalGesture = null;

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ================================================================
// APERTURA Y CONTROL PRINCIPAL
// ================================================================
export function openDatePickerBottomSheet() {
  const expDateInput = document.getElementById('exp-date');
  const initialDateStr = expDateInput?.value || new Date().toISOString().split('T')[0];
  selectedCalendarDate = initialDateStr;

  const [y, m] = initialDateStr.split('-').map(Number);
  calendarViewYear = y || new Date().getFullYear();
  calendarViewMonth = (m - 1) >= 0 ? (m - 1) : new Date().getMonth();

  isCalendarExpanded = false;
  currentWeekOffset = getWeekIndexForDate(selectedCalendarDate, calendarViewYear, calendarViewMonth);

  renderCalendarBottomSheetUI();
  openModal('modal-date-picker');
}

export function toggleCalendarExpandMode() {
  isCalendarExpanded = !isCalendarExpanded;

  const accordions = document.querySelectorAll('.m3-cal-accordion');
  const btnToggleIcon = document.getElementById('icon-toggle-cal-expand');

  if (accordions.length > 0) {
    accordions.forEach(acc => {
      if (isCalendarExpanded) {
        acc.classList.add('m3-cal-expanded');
      } else {
        acc.classList.remove('m3-cal-expanded');
      }
    });

    if (btnToggleIcon) {
      btnToggleIcon.textContent = isCalendarExpanded ? 'arrow_drop_down' : 'arrow_drop_up';
    }
  } else {
    renderCalendarBottomSheetUI();
  }
}

export function navigateCalendarMonth(step, animateDirection = null) {
  calendarViewMonth += step;
  if (calendarViewMonth < 0) {
    calendarViewMonth = 11;
    calendarViewYear -= 1;
  } else if (calendarViewMonth > 11) {
    calendarViewMonth = 0;
    calendarViewYear += 1;
  }
  currentWeekOffset = 0;
  const dir = animateDirection || (step > 0 ? 'left' : 'right');
  renderCalendarBottomSheetUI(dir);
}

export function navigateCalendarWeek(step) {
  const daysMatrix = getMonthDaysMatrix(calendarViewYear, calendarViewMonth);
  const totalWeeks = Math.ceil(daysMatrix.length / 7);
  const newIndex = currentWeekOffset + step;

  if (newIndex < 0) {
    navigateCalendarMonth(-1, 'right');
    const prevMatrix = getMonthDaysMatrix(calendarViewYear, calendarViewMonth);
    currentWeekOffset = Math.ceil(prevMatrix.length / 7) - 1;
    renderCalendarBottomSheetUI('right');
  } else if (newIndex >= totalWeeks) {
    navigateCalendarMonth(1, 'left');
    currentWeekOffset = 0;
    renderCalendarBottomSheetUI('left');
  } else {
    currentWeekOffset = newIndex;
    renderCalendarBottomSheetUI(step > 0 ? 'left' : 'right');
  }
}

export function selectCalendarToday() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  calendarViewYear = today.getFullYear();
  calendarViewMonth = today.getMonth();
  currentWeekOffset = getWeekIndexForDate(todayStr, calendarViewYear, calendarViewMonth);
  
  renderCalendarBottomSheetUI();
  handleCalendarDaySelect(todayStr);
}

/**
 * Maneja la selección de un día con animación de transición:
 * - El día anteriormente seleccionado se encoge y cambia a un tono del 25% de opacidad.
 * - El nuevo día seleccionado expande su píldora verde (#BEEB9F).
 * - Tras 350ms se cierra automáticamente el modal.
 */
export function handleCalendarDaySelect(dateStr, clickedBtn = null) {
  const prevSelectedBtn = document.querySelector('.cal-day-btn.cal-day-selected');
  const targetBtn = clickedBtn || document.querySelector(`.cal-day-btn[data-date="${dateStr}"]`);

  // 1. Animación de encogimiento en el día previo (a 25% de tono)
  if (prevSelectedBtn && prevSelectedBtn !== targetBtn) {
    prevSelectedBtn.classList.remove('cal-day-selected', 'cal-day-expanding');
    prevSelectedBtn.classList.add('cal-day-shrinking');
  }

  // 2. Animación de expansión en el nuevo día seleccionado
  if (targetBtn) {
    targetBtn.classList.remove('cal-day-shrinking');
    targetBtn.classList.add('cal-day-expanding', 'cal-day-selected');
  }

  // 3. Actualizar estado y fecha en formularios
  selectedCalendarDate = dateStr;
  
  const expDateInput = document.getElementById('exp-date');
  if (expDateInput) {
    expDateInput.value = dateStr;
    expDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    expDateInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  updateDateChipLabel(dateStr);

  const [y, m] = dateStr.split('-').map(Number);
  calendarViewYear = y;
  calendarViewMonth = m - 1;
  currentWeekOffset = getWeekIndexForDate(dateStr, calendarViewYear, calendarViewMonth);

  // Actualizar resaltado de cabecera de días de la semana (DOM, LUN, etc.)
  updateWeekdaysHighlight(dateStr);

  // 4. Tras 1200ms, cerrar el modal
  setTimeout(() => {
    closeModal('modal-date-picker');
  }, 1200);
}

function updateWeekdaysHighlight(dateStr) {
  if (!dateStr) return;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayDate = new Date(y, m - 1, d);
  const dayOfWeek = dayDate.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sáb

  for (let i = 0; i < 7; i++) {
    const wdEl = document.getElementById(`cal-wd-${i}`);
    if (wdEl) {
      if (i === dayOfWeek) {
        wdEl.className = 'text-[11px] font-black text-[#9BD95D] uppercase tracking-wider';
      } else {
        wdEl.className = 'text-[11px] font-bold text-slate-400 uppercase tracking-wider';
      }
    }
  }
}

// ================================================================
// GESTOS TÁCTILES M3 EXPRESSIVE
// ================================================================
export function handleCalTouchStart(e) {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchCurrentX = touchStartX;
  isSwipingCalendar = true;
  isHorizontalGesture = null;

  const track = document.getElementById('calendar-swipe-track');
  if (track) {
    track.style.transition = 'none';
  }
}

export function handleCalTouchMove(e) {
  if (!isSwipingCalendar || e.touches.length !== 1) return;
  touchCurrentX = e.touches[0].clientX;
  const deltaX = touchCurrentX - touchStartX;
  const deltaY = e.touches[0].clientY - touchStartY;

  if (isHorizontalGesture === null) {
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
    }
  }

  if (!isHorizontalGesture) return;

  if (e.cancelable) e.preventDefault();

  const track = document.getElementById('calendar-swipe-track');
  if (track) {
    track.style.transform = `translateX(${deltaX}px)`;
    track.style.opacity = '1';
  }
}

export function handleCalTouchEnd(e) {
  if (!isSwipingCalendar) return;
  isSwipingCalendar = false;

  const deltaX = touchCurrentX - touchStartX;
  const track = document.getElementById('calendar-swipe-track');

  if (track) {
    track.style.transition = 'transform 260ms cubic-bezier(0.2, 0.0, 0, 1.0)';
  }

  if (isHorizontalGesture && Math.abs(deltaX) > 42) {
    if (deltaX < 0) {
      if (isCalendarExpanded) {
        navigateCalendarMonth(1, 'left');
      } else {
        navigateCalendarWeek(1);
      }
    } else {
      if (isCalendarExpanded) {
        navigateCalendarMonth(-1, 'right');
      } else {
        navigateCalendarWeek(-1);
      }
    }
  } else if (track) {
    track.style.transform = 'translateX(0px)';
    track.style.opacity = '1';
  }
}

// ================================================================
// CÁLCULOS DE DÍAS Y MATRICES
// ================================================================
function getMonthDaysMatrix(year, month) {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const startingDayOfWeek = firstDayOfMonth.getUTCDay();

  const totalDaysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalDaysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const daysMatrix = [];

  // Días mes previo
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = totalDaysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMatrix.push({
      dayNum: d,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      isSelected: dStr === selectedCalendarDate
    });
  }

  // Días mes actual
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMatrix.push({
      dayNum: d,
      dateStr: dStr,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      isSelected: dStr === selectedCalendarDate
    });
  }

  // Días mes siguiente
  const remaining = (7 - (daysMatrix.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMatrix.push({
      dayNum: d,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      isSelected: dStr === selectedCalendarDate
    });
  }

  return daysMatrix;
}

function getWeekIndexForDate(dateStr, year, month) {
  const matrix = getMonthDaysMatrix(year, month);
  let index = 0;
  matrix.forEach((item, idx) => {
    if (item.dateStr === dateStr) {
      index = Math.floor(idx / 7);
    }
  });
  return index;
}

// ================================================================
// RENDERIZADO VISUAL CON DIRECT 1-STEP M3 MOTION
// ================================================================
export function renderCalendarBottomSheetUI(slideDirection = null) {
  const titleEl = document.getElementById('cal-month-year-title');
  const container = document.getElementById('calendar-days-container');
  const btnToggleIcon = document.getElementById('icon-toggle-cal-expand');

  if (titleEl) {
    titleEl.textContent = `${MONTH_NAMES_ES[calendarViewMonth]} ${calendarViewYear}`;
  }

  if (btnToggleIcon) {
    btnToggleIcon.textContent = isCalendarExpanded ? 'arrow_drop_down' : 'arrow_drop_up';
  }

  updateWeekdaysHighlight(selectedCalendarDate);

  if (!container) return;

  const daysMatrix = getMonthDaysMatrix(calendarViewYear, calendarViewMonth);
  const rowsCount = Math.ceil(daysMatrix.length / 7);

  if (currentWeekOffset >= rowsCount) {
    currentWeekOffset = rowsCount - 1;
  }
  if (currentWeekOffset < 0) {
    currentWeekOffset = 0;
  }

  const generateRowHtml = (r) => {
    let weekCols = '';
    for (let c = 0; c < 7; c++) {
      const day = daysMatrix[r * 7 + c];
      if (!day) continue;

      let btnClasses = 'cal-day-btn ';
      let dayNumClasses = 'leading-none text-sm ';

      if (day.isSelected) {
        btnClasses += 'cal-day-selected ';
        dayNumClasses += 'font-extrabold text-[#222818]';
      } else if (!day.isCurrentMonth) {
        btnClasses += 'text-[#BCEAA3] font-medium hover:bg-emerald-50/50 ';
        dayNumClasses += 'text-[#BCEAA3] font-medium';
      } else if (day.isToday) {
        btnClasses += 'text-slate-950 font-black hover:bg-slate-100/80 ';
        dayNumClasses += 'font-black text-slate-950';
      } else {
        btnClasses += 'text-slate-800 font-semibold hover:bg-slate-100/80 ';
        dayNumClasses += 'font-semibold text-slate-800';
      }

      weekCols += `
        <div class="flex items-center justify-center p-0.5">
          <button type="button" data-date="${day.dateStr}"
            onclick="handleCalendarDaySelect('${day.dateStr}', this)"
            class="${btnClasses}">
            <span class="${dayNumClasses}">${day.dayNum}</span>
          </button>
        </div>
      `;
    }
    return `<div class="grid grid-cols-7 gap-1 items-center justify-items-center">${weekCols}</div>`;
  };

  let beforeRowsHtml = '';
  for (let r = 0; r < currentWeekOffset; r++) {
    beforeRowsHtml += generateRowHtml(r);
  }

  const activeRowHtml = generateRowHtml(currentWeekOffset);

  let afterRowsHtml = '';
  for (let r = currentWeekOffset + 1; r < rowsCount; r++) {
    afterRowsHtml += generateRowHtml(r);
  }

  let animClass = '';
  if (slideDirection === 'left') {
    animClass = 'm3-calendar-slide-left-in';
  } else if (slideDirection === 'right') {
    animClass = 'm3-calendar-slide-right-in';
  }

  const expandedClass = isCalendarExpanded ? 'm3-cal-expanded' : '';

  container.innerHTML = `
    <div class="m3-calendar-carousel"
      ontouchstart="handleCalTouchStart(event)"
      ontouchmove="handleCalTouchMove(event)"
      ontouchend="handleCalTouchEnd(event)">
      <div id="calendar-swipe-track" class="m3-calendar-track space-y-1 ${animClass}">
        ${beforeRowsHtml ? `
          <div class="m3-cal-accordion m3-cal-top ${expandedClass}">
            <div class="m3-cal-accordion-inner space-y-1">
              ${beforeRowsHtml}
            </div>
          </div>
        ` : ''}

        <div class="m3-cal-active-week">
          ${activeRowHtml}
        </div>

        ${afterRowsHtml ? `
          <div class="m3-cal-accordion ${expandedClass}">
            <div class="m3-cal-accordion-inner space-y-1">
              ${afterRowsHtml}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Exponer en window para eventos inline
window.navigateCalendarMonth = navigateCalendarMonth;
window.navigateCalendarWeek = navigateCalendarWeek;
window.selectCalendarToday = selectCalendarToday;
window.handleCalendarDaySelect = handleCalendarDaySelect;
window.toggleCalendarExpandMode = toggleCalendarExpandMode;
window.openDatePickerBottomSheet = openDatePickerBottomSheet;
window.handleCalTouchStart = handleCalTouchStart;
window.handleCalTouchMove = handleCalTouchMove;
window.handleCalTouchEnd = handleCalTouchEnd;

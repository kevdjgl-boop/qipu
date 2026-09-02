// ================================================================
// GESTIÓN DE LA BARRA FLOTANTE DE ACCIONES SOBRE EL TECLADO
// (EXCLUSIVO PARA NAVEGACIÓN Y AGREGADO EN LA LISTA DE PRODUCTOS)
// ================================================================

let currentFocusedInput = null;
let navBarEl = null;
let btnNextEl = null;
let btnAddItemEl = null;

function isListItemInput(target) {
  if (!target || target.tagName !== 'INPUT') return false;
  return !!(
    target.hasAttribute('data-item-field') ||
    target.hasAttribute('data-item-id') ||
    target.closest('#mobile-items-container') ||
    target.closest('#mobile-items-scroll-wrapper')
  );
}

export function setupKeyboardNavFab() {
  navBarEl = document.getElementById('keyboard-nav-bar');
  btnNextEl = document.getElementById('btn-next-input-fab');
  btnAddItemEl = document.getElementById('btn-fab-add-item');
  if (!navBarEl || !btnNextEl || !btnAddItemEl) return;

  function updateNavPosition() {
    if (!navBarEl) return;
    if (window.visualViewport) {
      const vv = window.visualViewport;
      // Altura ocupada por el teclado virtual del smartphone
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      const bottomPos = keyboardHeight > 0 ? (keyboardHeight + 12) : 16;
      navBarEl.style.bottom = `${bottomPos}px`;
    } else {
      navBarEl.style.bottom = '16px';
    }
  }

  function checkAddItemButtonVisibility(target) {
    if (!btnAddItemEl) return;
    const isTotalField = target && target.getAttribute('data-item-field') === 'amount';
    if (isTotalField) {
      btnAddItemEl.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
      btnAddItemEl.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
    } else {
      btnAddItemEl.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
      btnAddItemEl.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
    }
  }

  function showNavBar(targetInput) {
    currentFocusedInput = targetInput;
    updateNavPosition();
    checkAddItemButtonVisibility(targetInput);

    navBarEl.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    navBarEl.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
  }

  function hideNavBar() {
    setTimeout(() => {
      const active = document.activeElement;
      if (!isListItemInput(active)) {
        if (navBarEl) {
          navBarEl.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
          navBarEl.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        }
        checkAddItemButtonVisibility(null);
      }
    }, 180);
  }

  // Soporte para visualViewport (redimensionamiento por teclado virtual en móviles)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateNavPosition);
    window.visualViewport.addEventListener('scroll', updateNavPosition);
  }
  window.addEventListener('resize', updateNavPosition);

  // Captura de foco: SOLO se activa si el input pertenece a la lista de ítems / productos
  document.addEventListener('focus', (e) => {
    if (e.target && isListItemInput(e.target)) {
      showNavBar(e.target);
    } else {
      hideNavBar();
    }
  }, true);

  document.addEventListener('blur', (e) => {
    hideNavBar();
  }, true);

  // Prevenir que tocar la barra flotante des-enfoque el input y cierre el teclado
  navBarEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
  });
  navBarEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  // 1. Botón Flecha (Avanzar siguiente input en la lista)
  btnNextEl.addEventListener('click', (e) => {
    e.preventDefault();
    advanceToNextInput();
  });

  // 2. Botón "+ Agregar ítem" (Aparece sólo al enfocar el campo Total)
  btnAddItemEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.addMobileItemRow === 'function') {
      window.addMobileItemRow();
      // Ocultar botón inmediatamente al crearse la nueva fila
      checkAddItemButtonVisibility(null);
      setTimeout(() => {
        const container = document.getElementById('mobile-items-container');
        const updatedInputs = Array.from((container || document).querySelectorAll('input[data-item-field]:not([disabled])'))
          .filter(el => el.offsetParent !== null && !el.closest('.hidden'));
        // El primer campo de la nueva fila (descripción del producto)
        const target = updatedInputs[updatedInputs.length - 3] || updatedInputs[updatedInputs.length - 1];
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          showNavBar(target);
        }
      }, 100);
    }
  });
}

export function advanceToNextInput() {
  const container = document.getElementById('mobile-items-container');
  if (!container) return;

  const allInputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([disabled])'))
    .filter(el => el.offsetParent !== null && !el.closest('.hidden'));

  if (!allInputs.length) return;

  const activeEl = currentFocusedInput || document.activeElement;
  const currentIndex = allInputs.indexOf(activeEl);

  if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
    const nextInput = allInputs[currentIndex + 1];
    nextInput.focus();
    if (typeof nextInput.select === 'function') {
      nextInput.select();
    }
    nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Si estamos en el último input visible de la lista, agregar una nueva fila automáticamente
    if (typeof window.addMobileItemRow === 'function') {
      window.addMobileItemRow();
      setTimeout(() => {
        const updatedInputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([disabled])'))
          .filter(el => el.offsetParent !== null && !el.closest('.hidden'));
        const target = updatedInputs[updatedInputs.length - 3] || updatedInputs[updatedInputs.length - 1];
        if (target) {
          target.focus();
          if (typeof target.select === 'function') target.select();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } else {
      if (document.activeElement) document.activeElement.blur();
    }
  }
}

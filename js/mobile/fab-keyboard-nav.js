// ================================================================
// GESTIÓN DE LA BARRA FLOTANTE DE ACCIONES SOBRE EL TECLADO
// (AVANZAR INPUTS Y AGREGAR ÍTEM DINÁMICO EN TOTAL)
// ================================================================

let currentFocusedInput = null;

export function setupKeyboardNavFab() {
  const navBar = document.getElementById('keyboard-nav-bar');
  const btnNext = document.getElementById('btn-next-input-fab');
  const btnAddItem = document.getElementById('btn-fab-add-item');
  if (!navBar || !btnNext || !btnAddItem) return;

  function updateNavPosition() {
    if (window.visualViewport) {
      const vv = window.visualViewport;
      // Altura real ocupada por el teclado virtual del smartphone
      const keyboardHeight = window.innerHeight - (vv.offsetTop + vv.height);
      const bottomPos = Math.max(16, keyboardHeight + 14);
      navBar.style.bottom = `${bottomPos}px`;
    } else {
      navBar.style.bottom = '20px';
    }
  }

  function checkAddItemButtonVisibility(target) {
    if (!btnAddItem) return;
    const isTotalField = target && target.getAttribute('data-item-field') === 'amount';
    if (isTotalField) {
      btnAddItem.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
      btnAddItem.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
    } else {
      btnAddItem.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
      btnAddItem.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateNavPosition);
    window.visualViewport.addEventListener('scroll', updateNavPosition);
  }

  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'hidden' && e.target.type !== 'date') {
      currentFocusedInput = e.target;
      updateNavPosition();
      checkAddItemButtonVisibility(e.target);

      navBar.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
      navBar.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
    }
  });

  document.addEventListener('focusout', (e) => {
    setTimeout(() => {
      if (!document.activeElement || (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        navBar.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
        navBar.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
        checkAddItemButtonVisibility(null);
      }
    }, 150);
  });

  // Prevenir que tocar los botones cierre el teclado
  navBar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
  });

  // 1. Botón Flecha (Avanzar siguiente input)
  btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    advanceToNextInput();
  });

  // 2. Botón "+ Agregar ítem" (Aparece sólo en el campo Total)
  btnAddItem.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.addMobileItemRow === 'function') {
      window.addMobileItemRow();
      // Al agregar ítem, ocultamos el botón inmediatamente
      checkAddItemButtonVisibility(null);
      setTimeout(() => {
        const updatedInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="date"]):not([disabled])'))
          .filter(el => el.offsetParent !== null && !el.closest('.hidden'));
        // Enfocar la descripción del nuevo producto agregado
        const target = updatedInputs[updatedInputs.length - 3] || updatedInputs[updatedInputs.length - 1];
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          checkAddItemButtonVisibility(target);
        }
      }, 100);
    }
  });
}

export function advanceToNextInput() {
  const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="date"]):not([disabled])'))
    .filter(el => el.offsetParent !== null && !el.closest('.hidden'));

  if (!allInputs.length) return;

  const activeEl = currentFocusedInput || document.activeElement;
  const currentIndex = allInputs.indexOf(activeEl);

  if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
    const nextInput = allInputs[currentIndex + 1];
    nextInput.focus();
    nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Si estamos en el último input visible y la lista está activa
    if (window.isListExpenseActive && typeof window.addMobileItemRow === 'function') {
      window.addMobileItemRow();
      setTimeout(() => {
        const updatedInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="date"]):not([disabled])'))
          .filter(el => el.offsetParent !== null && !el.closest('.hidden'));
        const target = updatedInputs[updatedInputs.length - 3] || updatedInputs[updatedInputs.length - 1];
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } else {
      if (document.activeElement) document.activeElement.blur();
    }
  }
}

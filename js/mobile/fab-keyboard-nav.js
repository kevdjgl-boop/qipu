// ================================================================
// GESTIÓN DEL BOTÓN FLOTANTE PARA AVANZAR ENTRE INPUTS
// (ADAPTACIÓN AL TECLADO VIRTUAL DE SMARTPHONES CON VISUALVIEWPORT)
// ================================================================

let currentFocusedInput = null;

export function setupKeyboardNavFab() {
  const fab = document.getElementById('btn-next-input-fab');
  if (!fab) return;

  function updateFabPosition() {
    if (window.visualViewport) {
      const vv = window.visualViewport;
      // Calcula la altura real ocupada por el teclado virtual del smartphone
      const keyboardHeight = window.innerHeight - (vv.offsetTop + vv.height);
      const bottomPos = Math.max(16, keyboardHeight + 14);
      fab.style.bottom = `${bottomPos}px`;
    } else {
      fab.style.bottom = '20px';
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateFabPosition);
    window.visualViewport.addEventListener('scroll', updateFabPosition);
  }

  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'hidden' && e.target.type !== 'date') {
      currentFocusedInput = e.target;
      updateFabPosition();
      fab.classList.remove('opacity-0', 'scale-75', 'pointer-events-none');
      fab.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
    }
  });

  document.addEventListener('focusout', (e) => {
    setTimeout(() => {
      if (!document.activeElement || (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        fab.classList.add('opacity-0', 'scale-75', 'pointer-events-none');
        fab.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
      }
    }, 150);
  });

  fab.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // Evita que el navegador cierre el teclado al tocar el botón
  });

  fab.addEventListener('click', (e) => {
    e.preventDefault();
    advanceToNextInput();
  });
}

export function advanceToNextInput() {
  const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="date"]):not([disabled])'))
    .filter(el => {
      // Filtrar sólo los inputs visibles en pantalla
      return el.offsetParent !== null && !el.closest('.hidden');
    });

  if (!allInputs.length) return;

  const activeEl = currentFocusedInput || document.activeElement;
  const currentIndex = allInputs.indexOf(activeEl);

  if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
    const nextInput = allInputs[currentIndex + 1];
    nextInput.focus();
    nextInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Si estamos en el último input visible y la lista está activa, creamos una nueva fila y saltamos a ella
    if (window.isListExpenseActive && typeof window.addMobileItemRow === 'function') {
      window.addMobileItemRow();
      setTimeout(() => {
        const updatedInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="date"]):not([disabled])'))
          .filter(el => el.offsetParent !== null && !el.closest('.hidden'));
        // El primer campo de la nueva fila (descripción del producto)
        const target = updatedInputs[updatedInputs.length - 3] || updatedInputs[updatedInputs.length - 1];
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 120);
    } else {
      if (document.activeElement) document.activeElement.blur();
    }
  }
}

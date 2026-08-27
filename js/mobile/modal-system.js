// ================================================================
// SISTEMA DE MODALES Y TRANSICIONES PREMIUM (SPRING & FLUID EASING)
// ================================================================

export function setAppThemeColor(color) {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length > 0) {
    metas.forEach(m => m.setAttribute('content', color));
  } else {
    const meta = document.createElement('meta');
    meta.id = 'theme-color-meta';
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
  }

  const msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
  if (msMeta) msMeta.setAttribute('content', color);
}

// Inicializar de inmediato el color del tema
setAppThemeColor('#FBFCFA');

export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;

  m.classList.remove('hidden');
  m.classList.add('flex');
  m.setAttribute('aria-hidden', 'false');

  // Trigger browser layout recalculation for instantaneous smooth animation
  void m.offsetHeight;

  requestAnimationFrame(() => {
    m.classList.add('m3-visible');
  });

  document.body.classList.add('overflow-hidden');

  // Ajustar color de la barra de notificaciones según modal activo
  if (id === 'modal-expense') {
    setAppThemeColor('#f8fafc');
  } else if (id === 'modal-income') {
    setAppThemeColor('#0f172a');
  } else {
    setAppThemeColor('#FBFCFA');
  }
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;

  m.classList.remove('m3-visible');
  m.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overflow-hidden');

  // Restaurar color base de la barra de notificaciones
  setAppThemeColor('#FBFCFA');

  // Tiempo sincronizado con la animación de salida suave (360ms)
  setTimeout(() => {
    if (!m.classList.contains('m3-visible')) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 360);
}

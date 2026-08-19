// ================================================================
// SISTEMA DE MODALES MATERIAL DESIGN 3 MOTION Y COLOR DE BARRA DE ESTADO
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
setAppThemeColor('#f8fafc');

export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('flex');
  void m.offsetWidth; // Forzar reflujo del navegador
  m.classList.add('m3-visible');
  document.body.classList.add('overflow-hidden');

  // Ajustar color de la barra de notificaciones del celular según la pantalla/modal
  if (id === 'modal-expense') {
    setAppThemeColor('#f8fafc');
  } else if (id === 'modal-income') {
    setAppThemeColor('#0f172a');
  } else {
    setAppThemeColor('#ffffff');
  }
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('m3-visible');
  document.body.classList.remove('overflow-hidden');

  // Restaurar color base de la barra de notificaciones
  setAppThemeColor('#f8fafc');

  setTimeout(() => {
    if (!m.classList.contains('m3-visible')) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 260);
}

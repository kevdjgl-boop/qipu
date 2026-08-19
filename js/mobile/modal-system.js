// ================================================================
// SISTEMA DE MODALES MATERIAL DESIGN 3 MOTION Y COLOR DE BARRA DE ESTADO
// ================================================================

export function setAppThemeColor(color) {
  let meta = document.getElementById('theme-color-meta');
  if (!meta) {
    meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.id = 'theme-color-meta';
  }
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = 'theme-color-meta';
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

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

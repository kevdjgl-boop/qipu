// ================================================================
// SISTEMA DE MODALES MATERIAL DESIGN 3 MOTION
// ================================================================
export function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('flex');
  void m.offsetWidth; // Forzar reflujo del navegador
  m.classList.add('m3-visible');
  document.body.classList.add('overflow-hidden');
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('m3-visible');
  document.body.classList.remove('overflow-hidden');
  setTimeout(() => {
    if (!m.classList.contains('m3-visible')) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }, 260);
}

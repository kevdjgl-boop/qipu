import { SWIPE_ANIMATION_DATA } from "../Animaciones/swipe-data.js";
import { appState, currentWalletId, appId, db } from "./core-state.js";
import { renderMobileUI } from "./vista-dashboard.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let pullStartY = 0;
let pullStartX = 0;
let isPulling = false;
let isRefreshing = false;
let hasVibratedBreakpoint = false;
let pullBanner = null;
let pullLottieEl = null;
let lottieInstance = null;

const PULL_TRIGGER_DISTANCE = 90; // Distancia de arrastre en px requerida para activar la recarga
const BANNER_OPEN_HEIGHT = 74; // Altura en px del bloque sobre el header
const STRETCH_MAX_FRAME = 30; // Fin de la parte 1 (estiramiento con el dedo)
const TOTAL_FRAMES = 60; // Fin de la parte 2 (expulsión y recarga activa)

function ensureLottieInstance() {
  if (lottieInstance) return lottieInstance;
  if (!pullLottieEl) pullLottieEl = document.getElementById('pull-to-refresh-lottie');
  if (window.lottie && pullLottieEl) {
    try {
      pullLottieEl.innerHTML = '';
      lottieInstance = window.lottie.loadAnimation({
        container: pullLottieEl,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: SWIPE_ANIMATION_DATA
      });
      lottieInstance.goToAndStop(0, true);
      return lottieInstance;
    } catch (err) {
      console.warn('Error al inicializar Lottie:', err);
    }
  }
  return null;
}

export function initPullToRefresh() {
  pullBanner = document.getElementById('pull-header-banner');
  pullLottieEl = document.getElementById('pull-to-refresh-lottie');

  if (!pullBanner || !pullLottieEl) return;

  ensureLottieInstance();

  // Reintento en caso de carga asíncrona en PWA móvil
  if (!lottieInstance) {
    const timer = setInterval(() => {
      if (window.lottie) {
        ensureLottieInstance();
        clearInterval(timer);
      }
    }, 80);
    setTimeout(() => clearInterval(timer), 6000);
  }

  const onTouchStart = (e) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) return; // Solo iniciar si el scroll está en la cima absoluta

    ensureLottieInstance();

    // Resetear segmentos y forzar inicio absoluto en frame 0
    if (lottieInstance) {
      try {
        lottieInstance.resetSegments(true);
      } catch {}
      lottieInstance.loop = false;
      lottieInstance.setDirection(1);
      lottieInstance.stop();
      lottieInstance.goToAndStop(0, true);
    }

    pullStartY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    pullStartX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    isPulling = false;
    hasVibratedBreakpoint = false;
  };

  const onTouchMove = (e) => {
    if (isRefreshing || pullStartY === 0) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) {
      if (isPulling) resetPullIndicator();
      return;
    }

    const currentY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const currentX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const diffY = currentY - pullStartY;
    const diffX = currentX - pullStartX;

    // Solo si el movimiento es predominantemente hacia abajo
    if (diffY > 8 && Math.abs(diffY) > Math.abs(diffX) * 1.1) {
      isPulling = true;
      const bannerHeight = Math.min(BANNER_OPEN_HEIGHT + 10, diffY * 0.48);

      pullBanner.style.transition = 'none';
      pullBanner.style.height = `${bannerHeight}px`;
      pullBanner.style.opacity = `${Math.min(1, bannerHeight / 20)}`;

      // PARTE 1: Avanzar la animación de estiramiento progresivamente de 0 a 30
      const progressRatio = Math.min(1, Math.max(0, (diffY - 8) / (PULL_TRIGGER_DISTANCE - 8)));
      const targetFrame = Math.min(STRETCH_MAX_FRAME, Math.floor(progressRatio * STRETCH_MAX_FRAME));

      if (lottieInstance) {
        lottieInstance.goToAndStop(targetFrame, true);
      }

      // Feedback háptico al alcanzar el punto de quiebre (Frame 30 alcanzado)
      if (diffY >= PULL_TRIGGER_DISTANCE && !hasVibratedBreakpoint) {
        hasVibratedBreakpoint = true;
        if (navigator.vibrate) navigator.vibrate(25);
      } else if (diffY < PULL_TRIGGER_DISTANCE) {
        hasVibratedBreakpoint = false;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (!isPulling || isRefreshing) {
      pullStartY = 0;
      return;
    }

    if (hasVibratedBreakpoint) {
      // PARTE 2: Entrar al estado de actualización activa (dispara expulsión y bucle)
      triggerPullRefresh();
    } else {
      // Se soltó antes del punto de quiebre: REBOBINAR suavemente a 0
      resetPullIndicator();
    }

    pullStartY = 0;
    isPulling = false;
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });

  document.addEventListener('pointerdown', onTouchStart, { passive: true });
  window.addEventListener('pointermove', onTouchMove, { passive: false });
  window.addEventListener('pointerup', onTouchEnd, { passive: true });
  window.addEventListener('pointercancel', onTouchEnd, { passive: true });
}

export async function triggerPullRefresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  if (pullBanner) {
    pullBanner.style.transition = 'height 250ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease';
    pullBanner.style.height = `${BANNER_OPEN_HEIGHT}px`;
    pullBanner.style.opacity = '1';
  }

  // PARTE 2: Reproducir la fase activa de expulsión y bucle de recarga (30 -> 60)
  if (lottieInstance) {
    lottieInstance.loop = true;
    lottieInstance.setDirection(1);
    lottieInstance.playSegments([STRETCH_MAX_FRAME, TOTAL_FRAMES], true);
  }

  if (navigator.vibrate) navigator.vibrate([15, 30, 15]);

  try {
    // Re-sincronizar datos de Firestore
    if (currentWalletId && appId && db) {
      const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
      const snap = await getDoc(walletRef);
      if (snap.exists()) {
        const data = snap.data();
        appState.walletName = data.name || appState.walletName;
        appState.participants = data.participants || [];
        appState.expenses = data.expenses || [];
        renderMobileUI();
      }
    }
  } catch (err) {
    console.warn('Error durante Pull-to-Refresh:', err);
  }

  // Cerrar el bloque suavemente y restaurar segmentos limpios a [0, 60]
  setTimeout(() => {
    if (pullBanner) {
      pullBanner.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 240ms ease';
      pullBanner.style.height = '0px';
      pullBanner.style.opacity = '0';
    }
    if (lottieInstance) {
      try {
        lottieInstance.resetSegments(true);
      } catch {}
      lottieInstance.loop = false;
      lottieInstance.stop();
      lottieInstance.goToAndStop(0, true);
    }
    setTimeout(() => {
      isRefreshing = false;
    }, 320);
  }, 850);
}

function resetPullIndicator() {
  if (pullBanner) {
    pullBanner.style.transition = 'height 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease';
    pullBanner.style.height = '0px';
    pullBanner.style.opacity = '0';
  }

  // REBOBINAR suavemente hacia el fotograma 0 y restaurar segmentos limpios
  if (lottieInstance) {
    try {
      lottieInstance.resetSegments(true);
      lottieInstance.loop = false;
      lottieInstance.setDirection(-1);
      lottieInstance.play();
    } catch {
      lottieInstance.goToAndStop(0, true);
    }
  }
}

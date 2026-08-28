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
let rafId = null;
let lastRenderedFrame = -1;

const PULL_TRIGGER_DISTANCE = 110; // Distancia de arrastre con dedo
const BANNER_OPEN_HEIGHT = 104; // Altura generosa con margen holgado para el icono de 72px
const STRETCH_PEAK_FRAME = 66; // Fotograma del estiramiento máximo (keyframe exacto t: 66)

function ensureLottieInstance() {
  if (lottieInstance) return lottieInstance;
  if (!pullLottieEl) pullLottieEl = document.getElementById('pull-to-refresh-lottie');
  if (window.lottie && pullLottieEl) {
    try {
      pullLottieEl.innerHTML = '';
      lottieInstance = window.lottie.loadAnimation({
        container: pullLottieEl,
        renderer: 'canvas', // GPU Canvas de alto rendimiento
        loop: false,
        autoplay: false,
        animationData: SWIPE_ANIMATION_DATA,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          clearCanvas: true
        }
      });
      lottieInstance.goToAndStop(0, true);
      lastRenderedFrame = 0;
      return lottieInstance;
    } catch (err) {
      console.warn('Fallback a SVG renderer:', err);
      try {
        lottieInstance = window.lottie.loadAnimation({
          container: pullLottieEl,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: SWIPE_ANIMATION_DATA
        });
        lottieInstance.goToAndStop(0, true);
        return lottieInstance;
      } catch (e2) {}
    }
  }
  return null;
}

export function initPullToRefresh() {
  pullBanner = document.getElementById('pull-header-banner');
  pullLottieEl = document.getElementById('pull-to-refresh-lottie');

  if (!pullBanner || !pullLottieEl) return;

  // Aceleración por hardware GPU
  pullBanner.style.willChange = 'height';
  pullBanner.style.transform = 'translateZ(0)';
  pullLottieEl.style.willChange = 'transform';
  pullLottieEl.style.transform = 'translateZ(0) scale(0)';

  ensureLottieInstance();

  if (!lottieInstance) {
    const timer = setInterval(() => {
      if (window.lottie) {
        ensureLottieInstance();
        clearInterval(timer);
      }
    }, 80);
    setTimeout(() => clearInterval(timer), 5000);
  }

  const onTouchStart = (e) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) return;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    ensureLottieInstance();

    if (lottieInstance) {
      lottieInstance.setDirection(1);
      lottieInstance.stop();
      lottieInstance.goToAndStop(0, true);
      lastRenderedFrame = 0;
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

    if (diffY > 6 && Math.abs(diffY) > Math.abs(diffX) * 1.1) {
      isPulling = true;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const bannerHeight = Math.min(BANNER_OPEN_HEIGHT + 10, diffY * 0.52);

        pullBanner.style.transition = 'none';
        pullBanner.style.height = `${bannerHeight}px`;

        const progressRatio = Math.min(1, Math.max(0, (diffY - 6) / (PULL_TRIGGER_DISTANCE - 6)));
        const targetFrame = Math.min(STRETCH_PEAK_FRAME, Math.floor(progressRatio * STRETCH_PEAK_FRAME));

        // El icono escala suavemente de 0.2 a 1.0 según la apertura del bloque (sin fade de opacidad)
        const scaleFactor = Math.min(1.02, Math.max(0.15, bannerHeight / BANNER_OPEN_HEIGHT));
        pullLottieEl.style.transition = 'none';
        pullLottieEl.style.transform = `scale(${scaleFactor})`;

        if (lottieInstance && targetFrame !== lastRenderedFrame) {
          lastRenderedFrame = targetFrame;
          lottieInstance.goToAndStop(targetFrame, true);
        }

        if (diffY >= PULL_TRIGGER_DISTANCE && !hasVibratedBreakpoint) {
          hasVibratedBreakpoint = true;
          if (navigator.vibrate) navigator.vibrate(25);
        } else if (diffY < PULL_TRIGGER_DISTANCE) {
          hasVibratedBreakpoint = false;
        }
      });

      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (!isPulling || isRefreshing) {
      pullStartY = 0;
      return;
    }

    if (hasVibratedBreakpoint) {
      triggerPullRefresh();
    } else {
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
    pullBanner.style.transition = 'height 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    pullBanner.style.height = `${BANNER_OPEN_HEIGHT}px`;
  }

  if (pullLottieEl) {
    pullLottieEl.style.transition = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    pullLottieEl.style.transform = 'scale(1)';
  }

  // Continuar la reproducción naturalmente hacia adelante
  if (lottieInstance) {
    lottieInstance.setDirection(1);
    lottieInstance.play();
  }

  if (navigator.vibrate) navigator.vibrate([15, 30, 15]);

  let updatedData = null;

  try {
    if (currentWalletId && appId && db) {
      const walletRef = doc(db, "artifacts", appId, "public/data/wallets", currentWalletId);
      const snap = await getDoc(walletRef);
      if (snap.exists()) {
        updatedData = snap.data();
      }
    }
  } catch (err) {
    console.warn('Error durante Pull-to-Refresh:', err);
  }

  // Esperar a que la tarjeta complete su ciclo
  setTimeout(() => {
    if (updatedData) {
      appState.walletName = updatedData.name || appState.walletName;
      appState.participants = updatedData.participants || [];
      appState.expenses = updatedData.expenses || [];
      renderMobileUI();
    }

    // Reducir tamaño acorde va subiendo el bloque superior (cero fade de opacidad)
    if (pullBanner) {
      pullBanner.style.transition = 'height 340ms cubic-bezier(0.4, 0, 0.2, 1)';
      pullBanner.style.height = '0px';
    }

    if (pullLottieEl) {
      pullLottieEl.style.transition = 'transform 340ms cubic-bezier(0.4, 0, 0.2, 1)';
      pullLottieEl.style.transform = 'scale(0)';
    }

    setTimeout(() => {
      if (lottieInstance) {
        lottieInstance.stop();
        lottieInstance.goToAndStop(0, true);
        lastRenderedFrame = 0;
      }
      isRefreshing = false;
    }, 360);
  }, 1200);
}

function resetPullIndicator() {
  // Reducir tamaño sincronizado al contraerse el bloque
  if (pullBanner) {
    pullBanner.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    pullBanner.style.height = '0px';
  }

  if (pullLottieEl) {
    pullLottieEl.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    pullLottieEl.style.transform = 'scale(0)';
  }

  // Rebobinar suavemente al estado de reposo
  if (lottieInstance) {
    try {
      lottieInstance.setDirection(-1);
      lottieInstance.play();
    } catch {
      lottieInstance.goToAndStop(0, true);
    }
    lastRenderedFrame = 0;
  }
}

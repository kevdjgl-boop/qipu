import { SWIPE_ANIMATION_DATA } from "../Animaciones/swipe-data.js";
import { appState, currentWalletId, appId, db } from "./core-state.js";
import { renderMobileUI } from "./vista-dashboard.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let pullStartY = 0;
let pullStartX = 0;
let isPulling = false;
let isRefreshing = false;
let hasVibratedBreakpoint = false;
let pullContainer = null;
let pullLottieEl = null;
let lottieInstance = null;

const PULL_BREAKPOINT = 65; // Punto de quiebre en px para activar la recarga
const SCRUB_MAX_FRAME = 30; // Fotograma álgido durante el arrastre (la tarjeta sale al 100% justo al llegar al tope)
const TOTAL_FRAMES = 60; // Frames totales para la reproducción en recarga activa

export function initPullToRefresh() {
  pullContainer = document.getElementById('pull-to-refresh-container');
  pullLottieEl = document.getElementById('pull-to-refresh-lottie');

  if (!pullContainer || !pullLottieEl) return;

  // Inicializar reproductor Lottie en modo manual (control fotograma a fotograma con el dedo)
  if (window.lottie) {
    pullLottieEl.innerHTML = '';
    lottieInstance = window.lottie.loadAnimation({
      container: pullLottieEl,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      animationData: SWIPE_ANIMATION_DATA
    });
    // Pausar en el primer fotograma
    lottieInstance.goToAndStop(0, true);
  }

  const onTouchStart = (e) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) return; // Solo iniciar si el scroll está en la cima absoluta

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
      const pullProgress = Math.min(85, diffY * 0.46); // Resistencia elástica del arrastre

      pullContainer.style.transition = 'none';
      pullContainer.style.transform = `translate(-50%, ${pullProgress}px)`;
      pullContainer.style.opacity = `${Math.min(1, pullProgress / 18)}`;

      // Sincronizar el fotograma exacto: la tarjeta alcanza su punto más alto justo al llegar al punto de quiebre
      const progressRatio = Math.min(1, pullProgress / PULL_BREAKPOINT);
      const targetFrame = Math.floor(progressRatio * SCRUB_MAX_FRAME);

      if (lottieInstance) {
        lottieInstance.goToAndStop(targetFrame, true);
      }

      // Feedback háptico al alcanzar el punto de quiebre
      if (pullProgress >= PULL_BREAKPOINT && !hasVibratedBreakpoint) {
        hasVibratedBreakpoint = true;
        if (navigator.vibrate) navigator.vibrate(20);
      } else if (pullProgress < PULL_BREAKPOINT) {
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

    const match = (pullContainer.style.transform || '').match(/translate\(-50%,\s*([\d.]+)px\)/);
    const currentPull = match ? parseFloat(match[1]) : 0;

    if (currentPull >= PULL_BREAKPOINT) {
      // Alcanzó el punto de quiebre: ejecutar recarga y reproducir animación en bucle
      triggerPullRefresh();
    } else {
      // No alcanzó el punto de quiebre: regresar arriba
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

  if (pullContainer) {
    pullContainer.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease';
    pullContainer.style.transform = `translate(-50%, ${PULL_BREAKPOINT}px)`;
    pullContainer.style.opacity = '1';
  }

  // Reproducir animación continuamente mientras sincroniza
  if (lottieInstance) {
    lottieInstance.play();
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

  // Finalizar y regresar con animación suave
  setTimeout(() => {
    resetPullIndicator();
    setTimeout(() => {
      isRefreshing = false;
    }, 320);
  }, 750);
}

function resetPullIndicator() {
  if (pullContainer) {
    pullContainer.style.transition = 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease';
    pullContainer.style.transform = 'translate(-50%, -100px)';
    pullContainer.style.opacity = '0';
  }
  if (lottieInstance) {
    lottieInstance.stop();
    lottieInstance.goToAndStop(0, true);
  }
}

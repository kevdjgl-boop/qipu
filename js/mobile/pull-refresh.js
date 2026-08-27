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

const FINGER_TRIGGER_DISTANCE = 110; // Distancia física de arrastre en px requerida para activar la recarga
const VISUAL_MAX_DESCENT = 70; // Descenso visual máximo en px de la cápsula
const STRETCH_PEAK_FRAME = 30; // Fotograma exacto donde la billetera alcanza su estiramiento máximo
const TOTAL_FRAMES = 60; // Total de fotogramas de la animación

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
      loop: false,
      autoplay: false,
      animationData: SWIPE_ANIMATION_DATA
    });
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
    if (diffY > 10 && Math.abs(diffY) > Math.abs(diffX) * 1.1) {
      isPulling = true;
      const pullVisualY = Math.min(VISUAL_MAX_DESCENT, diffY * 0.42); // Descenso visual suave con amortiguación

      pullContainer.style.transition = 'none';
      pullContainer.style.transform = `translate(-50%, ${pullVisualY}px)`;
      pullContainer.style.opacity = `${Math.min(1, diffY / 25)}`;

      // Mapeo 1:1 con la distancia física del dedo: no se adelanta, llega al frame 30 justo al punto de quiebre
      const progressRatio = Math.min(1, Math.max(0, (diffY - 10) / (FINGER_TRIGGER_DISTANCE - 10)));
      const targetFrame = Math.min(STRETCH_PEAK_FRAME, Math.floor(progressRatio * STRETCH_PEAK_FRAME));

      if (lottieInstance) {
        lottieInstance.goToAndStop(targetFrame, true);
      }

      // Feedback háptico al alcanzar el punto de quiebre
      if (diffY >= FINGER_TRIGGER_DISTANCE && !hasVibratedBreakpoint) {
        hasVibratedBreakpoint = true;
        if (navigator.vibrate) navigator.vibrate(25);
      } else if (diffY < FINGER_TRIGGER_DISTANCE) {
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

    const diffY = (e => {
      return pullStartY ? (window._lastPullDiffY || 0) : 0;
    })();

    // Verificar si alcanzó la distancia de quiebre requerida
    if (hasVibratedBreakpoint) {
      // Alcanzó el punto de quiebre: disparar recarga y continuar animación desde el fotograma 30
      triggerPullRefresh();
    } else {
      // No alcanzó el punto de quiebre: des-estirar y regresar arriba
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
    pullContainer.style.transform = `translate(-50%, ${VISUAL_MAX_DESCENT}px)`;
    pullContainer.style.opacity = '1';
  }

  // Continuar fluidamente la animación expulsando la tarjeta desde el punto de estiramiento (24 -> 60)
  if (lottieInstance) {
    lottieInstance.loop = true;
    lottieInstance.playSegments([STRETCH_PEAK_FRAME, TOTAL_FRAMES], true);
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
  }, 800);
}

function resetPullIndicator() {
  if (pullContainer) {
    pullContainer.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 240ms ease';
    pullContainer.style.transform = 'translate(-50%, -100px)';
    pullContainer.style.opacity = '0';
  }
  if (lottieInstance) {
    lottieInstance.loop = false;
    lottieInstance.stop();
    lottieInstance.goToAndStop(0, true);
  }
}

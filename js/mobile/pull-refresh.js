import { SWIPE_ANIMATION_DATA } from "../Animaciones/swipe-data.js";
import { appState, currentWalletId, appId, db } from "./core-state.js";
import { renderMobileUI } from "./vista-dashboard.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let pullStartY = 0;
let pullStartX = 0;
let isPulling = false;
let isRefreshing = false;
let pullContainer = null;
let pullLottieEl = null;
let pullTextEl = null;
let lottieInstance = null;

const PULL_THRESHOLD = 70; // px necesarios para activar recarga

export function initPullToRefresh() {
  pullContainer = document.getElementById('pull-to-refresh-container');
  pullLottieEl = document.getElementById('pull-to-refresh-lottie');
  pullTextEl = document.getElementById('pull-to-refresh-text');

  if (!pullContainer || !pullLottieEl) return;

  // Inicializar reproductor Lottie para el indicador de Pull-to-Refresh
  if (window.lottie) {
    pullLottieEl.innerHTML = '';
    lottieInstance = window.lottie.loadAnimation({
      container: pullLottieEl,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      animationData: SWIPE_ANIMATION_DATA
    });
  }

  const onTouchStart = (e) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) return; // Solo permitir si está arriba del todo

    pullStartY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    pullStartX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    isPulling = false;
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

    // Solo si el movimiento es predominantemente vertical hacia abajo
    if (diffY > 10 && Math.abs(diffY) > Math.abs(diffX)) {
      isPulling = true;
      const pullProgress = Math.min(100, diffY * 0.45); // Física elástica de resistencia

      pullContainer.style.transition = 'none';
      pullContainer.style.transform = `translate(-50%, ${pullProgress}px)`;
      pullContainer.style.opacity = `${Math.min(1, pullProgress / 30)}`;

      if (pullProgress >= PULL_THRESHOLD) {
        if (pullTextEl) pullTextEl.textContent = 'Suelta para actualizar';
        if (lottieInstance && !lottieInstance.isPaused) lottieInstance.play();
      } else {
        if (pullTextEl) pullTextEl.textContent = 'Desliza para recargar';
      }

      if (e.cancelable && diffY > 15) {
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

    if (currentPull >= PULL_THRESHOLD) {
      triggerPullRefresh();
    } else {
      resetPullIndicator();
    }

    pullStartY = 0;
    isPulling = false;
  };

  if ('PointerEvent' in window) {
    document.addEventListener('pointerdown', onTouchStart, { passive: true });
    window.addEventListener('pointermove', onTouchMove, { passive: false });
    window.addEventListener('pointerup', onTouchEnd, { passive: true });
    window.addEventListener('pointercancel', onTouchEnd, { passive: true });
  } else {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }
}

export async function triggerPullRefresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  if (pullContainer) {
    pullContainer.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease';
    pullContainer.style.transform = 'translate(-50%, 65px)';
    pullContainer.style.opacity = '1';
  }

  if (pullTextEl) pullTextEl.textContent = 'Actualizando finanzas...';
  if (lottieInstance) {
    lottieInstance.goToAndPlay(0, true);
  }

  if (navigator.vibrate) navigator.vibrate([25, 40, 25]);

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

  // Mantener animación fluida visible mínimo 800ms
  setTimeout(() => {
    if (pullTextEl) pullTextEl.textContent = '¡Actualizado!';
    setTimeout(() => {
      resetPullIndicator();
      isRefreshing = false;
    }, 350);
  }, 750);
}

function resetPullIndicator() {
  if (pullContainer) {
    pullContainer.style.transition = 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease';
    pullContainer.style.transform = 'translate(-50%, -80px)';
    pullContainer.style.opacity = '0';
  }
  if (lottieInstance) {
    lottieInstance.stop();
  }
}

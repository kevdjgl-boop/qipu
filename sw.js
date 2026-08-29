// Service Worker para Qipu 3.0 PWA
const CACHE_NAME = 'qipu-v3-cache-v63';
const ASSETS_TO_CACHE = [
  './index.html',
  './mobile.html',
  './app.html',
  './manifest.json',
  './js/Animaciones/swipe-data.js',
  './js/Animaciones/trash-data.js',
  './js/Animaciones/Icono_chat.svg',
  './js/mobile/pull-refresh.js',
  './js/mobile/voice-chat.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Precache offline omitido:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar peticiones de desarrollo, Live Server WebSocket, Firebase y CDNs externos
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes('/ws') ||
    url.pathname.endsWith('.ws') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Network first con fallback seguro a cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Si es navegación a página HTML, intentar fallback
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('./mobile.html') || await caches.match('./index.html');
          if (fallback) return fallback;
        }

        return new Response('Offline - Recurso no disponible', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});



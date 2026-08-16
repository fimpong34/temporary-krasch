// Keep the app shell local after the first visit so navigation does not wait
// for the network, CDN, or a server response.
const CACHE_NAME = 'cashapp-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './home.html',
  './contact-pay.html',
  './activty.html',
  './card.html',
  './profile.html',
  './savings.html',
  './saving.css',
  './dark-mode.js',
  './footer.display.js',
  './nav-performance.js',
  './font/CashSans.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // HTML navigation is cache-first. This makes the main screens appear
  // immediately once the app has been opened, even on a slow connection.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Static files are served from cache when available, then saved after their
  // first successful request. API requests continue to use the network.
  if (new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }))
    );
  }
});

// Cache immutable/static assets only. Protected HTML must always be fetched
// from the network so an old authenticated screen can never be replayed.
const CACHE_NAME = 'cashapp-shell-v6';
const APP_SHELL = [
  './saving.css',
  './dark-mode.js',
  './footer.display.js',
  './nav-performance.js',
  './guard.js',
  './site.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
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

  const requestUrl = new URL(event.request.url);

  // Authentication and all other API responses must always come from the
  // server. Caching /api/auth/status can leave the UI permanently stuck in a
  // logged-out state even after a successful login.
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Never cache document navigation. This prevents stale/broken pages and
  // authenticated Profile/Activity screens from surviving a logout/deploy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        '<!doctype html><meta name="viewport" content="width=device-width"><title>Offline</title><p>You are offline. Reconnect and reload this page.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      ))
    );
    return;
  }

  // Static files are served from cache when available, then saved after their
  // first successful request. API requests continue to use the network.
  if (requestUrl.origin === self.location.origin) {
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

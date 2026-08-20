// Cache immutable/static assets only. Protected HTML must always be fetched
// from the network so an old authenticated screen can never be replayed.
const CACHE_NAME = 'cashapp-shell-v7';
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
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const contentType = response.headers.get('content-type') || '';
          const contentLength = Number(response.headers.get('content-length'));
          const isEmpty = Number.isFinite(contentLength) && contentLength === 0;

          if (!response.ok || !contentType.includes('text/html') || isEmpty) {
            throw new Error('Invalid navigation response');
          }
          return response;
        })
        // iOS can occasionally surface an interrupted navigation as a
        // zero-byte document. Retry once from the network before showing a
        // real HTML offline screen.
        .catch(() => fetch(event.request, { cache: 'reload' }))
        .then((response) => {
          const contentType = response.headers.get('content-type') || '';
          if (!response.ok || !contentType.includes('text/html')) {
            throw new Error('Navigation retry failed');
          }
          return response;
        })
        .catch(() => new Response(
          '<!doctype html><meta name="viewport" content="width=device-width"><title>Connection problem</title><style>body{font:17px system-ui;padding:40px;text-align:center}button{font:inherit;padding:12px 20px}</style><h1>Connection problem</h1><p>Please reconnect and try again.</p><button onclick="location.reload()">Try again</button>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
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

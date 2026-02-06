const CACHE_NAME = 'chessle-v5';
const ASSETS = [
  '/chessle/',
  '/chessle/index',
  '/chessle/game',
  '/chessle/styles.css',
  '/chessle/app.js',
  '/chessle/game.js',
  '/chessle/db.js',
  '/chessle/manifest.json',
  '/chessle/icon-192.png',
  '/chessle/icon-512.png'
];

// Normalize URL to canonical extensionless format
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /chessle/index -> /chessle/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

// Install - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const fetchPromises = ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            // Cache under normalized URL
            const normalized = normalizeUrl(url);
            await cache.put(normalized, response.clone());
          }
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      });
      await Promise.all(fetchPromises);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('Deleting old caches:', keys.filter(k => k !== CACHE_NAME));
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // Force immediate control of all pages
  self.clients.claim();
});

// Match cache using normalized URL (ignores query params for HTML pages)
async function matchCache(request) {
  const url = new URL(request.url);

  // Only normalize same-origin HTML requests
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    const normalized = normalizeUrl(request.url);
    const cache = await caches.open(CACHE_NAME);
    return cache.match(normalized);
  }

  // For other requests, try exact match
  return caches.match(request);
}

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(async (response) => {
      // Cache successful GET requests
      if (response.ok && event.request.method === 'GET') {
        const url = new URL(event.request.url);
        // Only normalize same-origin HTML pages
        if (url.origin === self.location.origin && event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const normalized = normalizeUrl(event.request.url);
          cache.put(normalized, response.clone());
        } else {
          // Cache external resources as-is
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
      }
      return response;
    }).catch(async () => {
      // Network failed, try cache
      const cached = await matchCache(event.request);
      if (cached) {
        return cached;
      }
      // No cache, return offline page for navigation
      if (event.request.mode === 'navigate') {
        const fallback = await matchCache(new Request('/chessle/'));
        if (fallback) return fallback;
      }
      return new Response('Offline - content not cached', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

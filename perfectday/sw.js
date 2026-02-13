const CACHE_NAME = 'perfectday-v1';
const ASSETS = [
  '/perfectday/',
  '/perfectday/index',
  '/perfectday/styles.css',
  '/perfectday/app.js',
  '/perfectday/tile-cache.js',
  '/perfectday/sensors.js',
  '/perfectday/manifest.json',
  '/perfectday/icon-192.png',
  '/perfectday/icon-512.png'
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;

  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const fetchPromises = ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
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

self.addEventListener('activate', (event) => {
  console.log('Service worker activating:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

async function matchCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept CDN or tile server requests - let the app handle those
  if (url.hostname !== self.location.hostname) {
    return;
  }

  event.respondWith(
    matchCache(event.request).then(async (cached) => {
      const networkPromise = fetch(event.request).then(async (response) => {
        if (response.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          const normalized = normalizeUrl(event.request.url);
          cache.put(normalized, response.clone());
        }
        return response;
      }).catch(() => null);

      if (cached) {
        networkPromise;
        return cached;
      }

      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }

      if (event.request.mode === 'navigate') {
        const fallback = await matchCache(new Request('/perfectday/'));
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

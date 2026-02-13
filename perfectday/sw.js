const CACHE_NAME = 'perfectday-v6';
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

// CDN assets needed for offline — cached separately since they're cross-origin
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.css'
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
      // Cache local assets
      const localPromises = ASSETS.map(async (url) => {
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

      // Cache CDN assets (stored by their full URL)
      const cdnPromises = CDN_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (err) {
          console.warn('Failed to cache CDN:', url, err);
        }
      });

      await Promise.all([...localPromises, ...cdnPromises]);
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

  // Tile server requests — let the app's custom protocol handle these via IndexedDB
  if (url.hostname.includes('tiles.openfreemap.org')) {
    return;
  }

  // CDN requests (MapLibre JS/CSS) — serve from cache, update in background
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request.url);
        const networkPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request.url, response.clone());
          return response;
        }).catch(() => null);

        if (cached) return cached;
        const networkResponse = await networkPromise;
        if (networkResponse) return networkResponse;
        return new Response('Offline - CDN asset not cached', { status: 503 });
      })
    );
    return;
  }

  // Local app assets — cache-first with background refresh
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

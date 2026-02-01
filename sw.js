const CACHE_NAME = 'wecreatethis-v10';
const ASSETS = [
  '/',
  '/index',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/beautiful-mind/icon-192.png',
  '/birdle/icon-192.png',
  '/hardle/icon-192.png',
  '/tarot/icon-192.png'
];

// Normalize URL to canonical extensionless format
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /index -> /
  if (path === '/index') {
    path = '/';
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

// Match cache using normalized URL (ignores query params)
async function matchCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

// Fetch - cache first with background update
self.addEventListener('fetch', (event) => {
  event.respondWith(
    matchCache(event.request).then(async (cached) => {
      // Start background network request for updates
      const networkPromise = fetch(event.request).then(async (response) => {
        if (response.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          const normalized = normalizeUrl(event.request.url);
          cache.put(normalized, response.clone());
        }
        return response;
      }).catch(() => null);

      // Return cached response immediately if available
      if (cached) {
        networkPromise; // Update in background
        return cached;
      }

      // No cache, wait for network
      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Network failed and no cache, return offline page
      if (event.request.mode === 'navigate') {
        const fallback = await matchCache(new Request('/'));
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

const CACHE_NAME = 'wecreatethis-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle requests within root scope (not subapps)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/beautiful-mind/') || url.pathname.startsWith('/birdle/')) {
    return; // Let subapp service workers handle these
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed, try cache
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // For navigation requests, serve cached index as fallback
        if (event.request.mode === 'navigate') {
          const index = await caches.match('/index.html');
          if (index) {
            return index;
          }
        }
        // Return a proper error response instead of undefined
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

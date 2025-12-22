const CACHE_NAME = 'birdle-v11';
const ASSETS = [
  '/birdle/',
  '/birdle/index.html',
  '/birdle/search.html',
  '/birdle/games.html',
  '/birdle/new-game.html',
  '/birdle/game.html',
  '/birdle/bird.html',
  '/birdle/styles.css',
  '/birdle/app.js',
  '/birdle/ebird.js',
  '/birdle/manifest.json',
  '/birdle/icon-192.png',
  '/birdle/icon-512.png'
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

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/birdle/index.html');
      }
    })
  );
});

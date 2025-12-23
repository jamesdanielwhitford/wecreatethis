const CACHE_NAME = 'birdle-v48';
const ASSETS = [
  '/birdle/',
  '/birdle/index.html',
  '/birdle/search.html',
  '/birdle/games.html',
  '/birdle/new-game.html',
  '/birdle/game.html',
  '/birdle/bird.html',
  '/birdle/life.html',
  '/birdle/daily.html',
  '/birdle/styles.css',
  '/birdle/app.js',
  '/birdle/db.js',
  '/birdle/life.js',
  '/birdle/ebird.js',
  '/birdle/manifest.json',
  '/birdle/icon-192.png',
  '/birdle/icon-512.png',
  '/birdle/_headers'
];

// Install - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Force immediate activation
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

// Fetch - network first, fallback to cache (ensures updates when online)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      // Cache successful GET requests
      if (response.ok && event.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      // Network failed, try cache
      return caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        // No cache, return offline page for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/birdle/index.html');
        }
        throw new Error('No network and no cache available');
      });
    })
  );
});

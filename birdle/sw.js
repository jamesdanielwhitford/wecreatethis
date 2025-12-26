const CACHE_NAME = 'birdle-v79';
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
  '/birdle/bingo.html',
  '/birdle/sync.html',
  '/birdle/styles.css',
  '/birdle/app.js',
  '/birdle/db.js',
  '/birdle/life.js',
  '/birdle/ebird.js',
  '/birdle/location.js',
  '/birdle/sync/webrtc.js',
  '/birdle/sync/signaling.js',
  '/birdle/sync/sync.js',
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

// Helper to try matching URL with .html suffix for extensionless navigation
async function matchWithHtmlFallback(request) {
  const url = new URL(request.url);

  // Try exact match first
  let cached = await caches.match(request);
  if (cached) return cached;

  // For navigation requests, try adding .html suffix
  if (request.mode === 'navigate') {
    // If URL has no extension and doesn't end with /, try .html version
    if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      const htmlUrl = new URL(url.pathname + '.html', url.origin);
      cached = await caches.match(htmlUrl.href);
      if (cached) return cached;
    }
  }

  return null;
}

// Fetch - network first, fallback to cache (ensures updates when online)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(async (response) => {
      // Cache successful GET requests
      if (response.ok && event.request.method === 'GET') {
        // Safari doesn't allow serving redirected responses from SW
        // Create a clean Response without redirect metadata
        let responseToCache = response.clone();
        if (response.redirected) {
          const body = await response.clone().blob();
          responseToCache = new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(async () => {
      // Network failed, try cache with HTML fallback for extensionless URLs
      const cached = await matchWithHtmlFallback(event.request);
      if (cached) {
        return cached;
      }
      // No cache, return offline page for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/birdle/index.html');
      }
      throw new Error('No network and no cache available');
    })
  );
});

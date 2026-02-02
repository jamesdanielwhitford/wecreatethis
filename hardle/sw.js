const CACHE_NAME = 'hardle-v38';

// Normalize URLs to canonical format (extensionless, no query params)
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /hardle/index -> /hardle/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  // Ensure trailing slash for directory paths
  if (path === '/hardle') {
    path = '/hardle/';
  }

  return urlObj.origin + path;
}

// Assets to cache on install
const ASSETS = [
  '/hardle/',
  '/hardle/randle',
  '/hardle/testle',
  '/hardle/styles.css',
  '/hardle/words.js',
  '/hardle/game.js',
  '/hardle/ui.js',
  '/hardle/app.js',
  '/hardle/manifest.json',
  '/hardle/icon-192.png',
  '/hardle/icon-512.png'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('hardle-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activate complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only handle same-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      const normalizedUrl = normalizeUrl(url);

      return cache.match(normalizedUrl).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            cache.put(normalizedUrl, networkResponse.clone());
          }
          return networkResponse;
        }).catch((error) => {
          console.log('[SW] Fetch failed:', error);
          // Could return offline fallback page here
          throw error;
        });
      });
    })
  );
});

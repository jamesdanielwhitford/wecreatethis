// Service Worker for Git Notes
const CACHE_NAME = 'git-notes-v4';

// Normalize URL function - strips .html and query params
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /app/index -> /app/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

// Files to cache
const urlsToCache = [
  '/git-notes/',
  '/git-notes/index.html',
  '/git-notes/repo.html',
  '/git-notes/editor.html',
  '/git-notes/settings.html',
  '/git-notes/styles.css',
  '/git-notes/app.js',
  '/git-notes/repo.js',
  '/git-notes/editor.js',
  '/git-notes/settings.js',
  '/git-notes/db.js',
  '/git-notes/github.js',
  '/git-notes/manifest.json',
  '/git-notes/icon-192.png',
  '/git-notes/icon-512.png'
];

// Install event - cache all files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app files');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      const normalizedUrl = normalizeUrl(event.request.url);

      return cache.match(normalizedUrl).then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // Update cache in background (stale-while-revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(normalizedUrl, networkResponse.clone());
            }
          }).catch(() => {
            // Network error, continue using cached version
          });

          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            cache.put(normalizedUrl, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});

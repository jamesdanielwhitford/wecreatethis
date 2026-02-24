const CACHE_NAME = 'longform-v2';

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

const urlsToCache = [
  '/longform/',
  '/longform/index.html',
  '/longform/post',
  '/longform/post.html',
  '/longform/manifest.json',
  '/longform/icon-192.png',
  '/longform/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching Long Form files');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      const normalizedUrl = normalizeUrl(event.request.url);

      return cache.match(normalizedUrl).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(normalizedUrl, networkResponse.clone());
            }
          }).catch(() => {});

          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(normalizedUrl, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});

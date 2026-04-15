const CACHE_NAME = 'slowread-v4';

const ASSETS = [
  '/slowread/',
  '/slowread/reader',
  '/slowread/settings',
  '/slowread/app.js',
  '/slowread/reader.js',
  '/slowread/settings.js',
  '/slowread/styles.css',
  '/slowread/manifest.json',
  '/slowread/book.json',
  '/slowread/icon-192.png',
  '/slowread/icon-512.png',
];

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path.endsWith('/index')) path = path.slice(0, -5);
  return urlObj.origin + path;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for cross-origin
  if (url.origin !== location.origin) return;

  const normalized = normalizeUrl(event.request.url);

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(normalized);
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) cache.put(normalized, response.clone());
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

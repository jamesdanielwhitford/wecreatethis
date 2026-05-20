const CACHE_NAME = 'chesstimer-v5';

const ASSETS = [
  '/chesstimer/',
  '/chesstimer/index.html',
  '/chesstimer/app.js',
  '/chesstimer/manifest.json',
  '/chesstimer/icon-192.png',
  '/chesstimer/icon-512.png',
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
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const normalized = normalizeUrl(event.request.url);
      const cached = await cache.match(normalized) || await cache.match(event.request);
      if (cached) {
        fetch(event.request).then(r => { if (r && r.ok) cache.put(normalized, r); }).catch(() => {});
        return cached;
      }
      const response = await fetch(event.request);
      if (response && response.ok) cache.put(normalized, response.clone());
      return response;
    })
  );
});

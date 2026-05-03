const CACHE_NAME = 'iris-v1';
const ASSETS = [
  '/iris/',
  '/iris/index',
  '/iris/manifest.json',
  '/iris/icon-192.png',
  '/iris/icon-512.png',
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path === '/iris/index') path = '/iris/';
  return urlObj.origin + path;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(normalizeUrl(url), res.clone());
        } catch {}
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const normalized = normalizeUrl(event.request.url);
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(normalized);
      if (cached) return cached;
      const res = await fetch(event.request);
      if (res.ok) cache.put(normalized, res.clone());
      return res;
    })
  );
});

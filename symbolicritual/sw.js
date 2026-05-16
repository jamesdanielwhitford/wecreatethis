const CACHE_NAME = 'symbolic-ritual-v1';
const ASSETS = [
  '/symbolicritual/',
  '/symbolicritual/index',
  '/symbolicritual/admin',
  '/symbolicritual/manifest.json',
  '/symbolicritual/icon-192.png',
  '/symbolicritual/icon-512.png',
  '/symbolicritual/app.js',
  '/symbolicritual/admin.js',
  '/symbolicritual/db.js',
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path === '/symbolicritual/index') path = '/symbolicritual/';
  return urlObj.origin + path;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(ASSETS.map(async url => {
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(normalizeUrl(url), res.clone());
        } catch {}
      }));
    })
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

async function matchCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

self.addEventListener('fetch', event => {
  // Let API calls and data URIs pass through — only cache same-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.url.startsWith('data:')) return;

  event.respondWith(
    matchCache(event.request).then(async cached => {
      const networkPromise = fetch(event.request).then(async res => {
        if (res.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(normalizeUrl(event.request.url), res.clone());
        }
        return res;
      }).catch(() => null);

      if (cached) return cached;
      const net = await networkPromise;
      if (net) return net;

      if (event.request.mode === 'navigate') {
        const fallback = await matchCache(new Request('/symbolicritual/'));
        if (fallback) return fallback;
      }

      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});

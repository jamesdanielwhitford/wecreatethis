const CACHE_NAME = 'starrynight-v1';

const ASSETS = [
  '/starrynight/',
  '/starrynight/index',
  '/starrynight/week',
  '/starrynight/styles.css',
  '/starrynight/app.js',
  '/starrynight/week.js',
  '/starrynight/astronomy.js',
  '/starrynight/weather.js',
  '/starrynight/manifest.json',
  '/starrynight/icon-192.png',
  '/starrynight/icon-512.png',
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.js',
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path === '/starrynight/index') path = '/starrynight/';
  return urlObj.origin + path;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache same-origin assets
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(normalizeUrl(url), res.clone());
      } catch {}
    }));
    // Cache CDN assets by full URL
    await Promise.all(CDN_ASSETS.map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res.clone());
      } catch {}
    }));
  })());
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

async function matchCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass through cross-origin API calls (Open-Meteo, Nominatim, AstronomyAPI)
  // but serve CDN assets (SunCalc) from cache
  if (url.hostname !== self.location.hostname) {
    if (url.hostname.includes('jsdelivr.net')) {
      // CDN: cache-first
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request.url);
        if (cached) return cached;
        try {
          const res = await fetch(event.request);
          if (res.ok) await cache.put(event.request.url, res.clone());
          return res;
        } catch {
          return new Response('CDN unavailable', { status: 503 });
        }
      })());
    }
    // All other cross-origin (APIs): let through to network
    return;
  }

  // Same-origin: cache-first with background update
  event.respondWith(
    matchCache(event.request).then(async (cached) => {
      const networkPromise = fetch(event.request).then(async (res) => {
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
        const fallback = await matchCache(new Request('/starrynight/'));
        if (fallback) return fallback;
      }

      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});

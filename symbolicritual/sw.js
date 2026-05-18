// Cache for HTML/JS/CSS app shell — bumped on every release.
const CACHE_NAME = 'symbolic-ritual-v16';
// Cache for R2 media. Bumped only when we want to evict everything, otherwise
// growth is bounded by a runtime LRU.
const MEDIA_CACHE = 'symbolic-ritual-media-v1';
// Origins whose responses should be cached as media. Cross-origin R2 URLs
// otherwise bypass the SW entirely.
const MEDIA_ORIGINS = ['https://pub-25f015d2275645df9e510a68115aed04.r2.dev'];
// Soft cap on media cache size in bytes. When exceeded the oldest entries are
// evicted at idle time. ~200 MB is large enough for a long scroll session but
// well under the per-origin quota on every platform.
const MEDIA_CACHE_MAX_BYTES = 200 * 1024 * 1024;
// How often (in fetches) we run the trim pass. Set high so we don't pay the
// cost on every navigation.
const TRIM_INTERVAL = 32;
let fetchCounter = 0;

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
  '/symbolicritual/api.js',
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path === '/symbolicritual/index') path = '/symbolicritual/';
  return urlObj.origin + path;
}

function isMediaRequest(url) {
  return MEDIA_ORIGINS.includes(url.origin);
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CACHE_NAME && k !== MEDIA_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function matchAppCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

// Media: cache-first, network-fallback. R2 objects are immutable per key (each
// upload generates a new filename), so we can serve from cache indefinitely
// without revalidation. Range requests (used by <video>) are passed through to
// the network rather than served from cache — the Cache API doesn't honour
// byte ranges and serving a full body to a range request confuses the player.
async function handleMediaRequest(request) {
  if (request.headers.has('Range')) {
    return fetch(request);
  }
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request.url);
  if (cached) {
    // Background trim pass — runs roughly every TRIM_INTERVAL media fetches.
    if ((++fetchCounter % TRIM_INTERVAL) === 0) {
      trimMediaCache().catch(() => {});
    }
    return cached;
  }
  // Force CORS so the response has readable headers (R2 sends ACAO: *). Without
  // this, an <img> tag's default no-cors mode yields an opaque response, which
  // can't be size-tracked and confuses the trim pass.
  const corsReq = new Request(request.url, { mode: 'cors', credentials: 'omit' });
  let res;
  try {
    res = await fetch(corsReq);
  } catch {
    return new Response('Offline', { status: 503 });
  }
  // Only cache complete (200) responses — never partial (206) or error responses.
  if (res.status === 200) {
    cache.put(request.url, res.clone()).catch(() => {});
  }
  return res;
}

// Trim oldest media entries when the total estimated size exceeds the cap.
// Uses Content-Length headers to estimate without re-reading bodies.
async function trimMediaCache() {
  const cache = await caches.open(MEDIA_CACHE);
  const reqs = await cache.keys();
  // Walk in insertion order (oldest first) and accumulate sizes. Cache API
  // preserves insertion order across browsers.
  const entries = [];
  let total = 0;
  for (const req of reqs) {
    const res = await cache.match(req);
    if (!res) continue;
    const len = Number(res.headers.get('Content-Length') || 0);
    entries.push({ req, len });
    total += len;
  }
  if (total <= MEDIA_CACHE_MAX_BYTES) return;
  // Evict oldest until under cap.
  for (const { req, len } of entries) {
    if (total <= MEDIA_CACHE_MAX_BYTES) break;
    await cache.delete(req);
    total -= len;
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('data:')) return;

  const url = new URL(event.request.url);

  // Cross-origin: only media gets cached, everything else passes through.
  if (url.origin !== self.location.origin) {
    if (isMediaRequest(url)) {
      event.respondWith(handleMediaRequest(event.request));
    }
    return;
  }

  // Same-origin app shell: stale-while-revalidate.
  event.respondWith(
    matchAppCache(event.request).then(async cached => {
      const networkPromise = fetch(event.request).then(async res => {
        if (res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(normalizeUrl(event.request.url), res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => null);

      if (cached) return cached;
      const net = await networkPromise;
      if (net) return net;

      if (event.request.mode === 'navigate') {
        const fallback = await matchAppCache(new Request('/symbolicritual/'));
        if (fallback) return fallback;
      }

      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});

// Network-first service worker with cache fallback.
//
// Strategy: every same-origin GET goes to the network first, so users always
// see the latest deploy while online. If the network fails or takes longer
// than NETWORK_TIMEOUT_MS (flaky wifi, offline), the cached copy is served
// instead. ASSETS are pre-cached at install so the app works offline from
// the first visit. CACHE_NAME only needs bumping to purge deleted files;
// routine updates reach users without any version change.
const CACHE_NAME = 'wecreatethis-v25';
const APP_ROOT = '/';
const NETWORK_TIMEOUT_MS = 3000;

const ASSETS = [
  '/',
  '/index',
  '/contact',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/migrate.html',
  '/beautiful-mind/icon-192.png',
  '/birdle/icon-192.png',
  '/hardle/icon-192.png',
  '/tarot/icon-192.png',
  '/perfectday/icon-192.png',
  '/voice-notes/icon-192.png',
  '/starrynight/icon-192.png',
  '/blog/icon-192.png'
];

// Normalize URL to canonical extensionless format (safety net for stray
// .html links and bookmarks; ignores query params for cache keys).
function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /index -> /
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

// Install - pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(normalizeUrl(url), response.clone());
          }
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      }));
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Race the network against a timer so flaky connections degrade to cache
// quickly instead of hanging.
function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function networkFirst(request) {
  const normalized = normalizeUrl(request.url);
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(normalized, response.clone());
    }
    return response;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(normalized);
    if (cached) return cached;

    // Offline navigation to an uncached page: fall back to the app shell
    if (request.mode === 'navigate') {
      const shell = await cache.match(normalizeUrl(APP_ROOT));
      if (shell) return shell;
    }

    return new Response('Offline - content not cached', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});

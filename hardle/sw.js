// Stale-while-revalidate service worker with update notification.
//
// Strategy: same-origin GETs are served from cache instantly (native-app
// feel), while a background fetch revalidates the cache. When the fresh
// response for a shell asset differs from what was just served, the SW
// posts {type: 'sw-updated'} to its clients and /sw-toast.js shows a
// "Refresh" pill, so updates land the same visit, on the user's terms.
// Offline just serves the cache; uncached offline navigations fall back
// to the app shell. ASSETS are pre-cached at install so the app works
// offline from the first visit. CACHE_NAME only needs bumping to purge
// deleted files; routine updates flow through revalidation.
const CACHE_NAME = 'hardle-v59';
const APP_ROOT = '/hardle/';

const ASSETS = [
  '/hardle/index.html',
  '/hardle/styles.css',
  '/hardle/words.js',
  '/hardle/game.js',
  '/hardle/ui.js',
  '/hardle/app.js',
  '/sw-toast.js',
  '/hardle/manifest.json',
  '/hardle/icon-192.png',
  '/hardle/icon-512.png'
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

// Shell assets (normalized): changes to these are worth an update toast.
const SHELL_URLS = new Set(ASSETS.map((url) => normalizeUrl(url)));

// Rewrap before caching to strip redirect metadata. Cloudflare Pages (and
// the _redirects self-rewrites) mark responses redirected:true; serving such
// a cached response to a navigation fails with ERR_FAILED in Chrome/Safari.
function cleanResponse(response) {
  if (!response.redirected) return response;
  return response.blob().then((body) =>
    new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  );
}

// Install - pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(normalizeUrl(url), await cleanResponse(response.clone()));
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

// Header-only comparison; bodies are never read. If we can't tell, stay quiet.
function responsesDiffer(a, b) {
  const etagA = a.headers.get('ETag');
  const etagB = b.headers.get('ETag');
  if (etagA && etagB) return etagA !== etagB;
  const lenA = a.headers.get('Content-Length');
  const lenB = b.headers.get('Content-Length');
  if (lenA && lenB) return lenA !== lenB;
  const modA = a.headers.get('Last-Modified');
  const modB = b.headers.get('Last-Modified');
  if (modA && modB) return modA !== modB;
  return false;
}

async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'sw-updated' }));
}

async function staleWhileRevalidate(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(normalized);

  const networkPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      if (cached && SHELL_URLS.has(normalized) && responsesDiffer(cached, response)) {
        notifyClientsOfUpdate();
      }
      await cache.put(normalized, await cleanResponse(response.clone()));
    }
    return response;
  });

  if (cached) {
    // Serve stale immediately; the revalidation continues in the background.
    networkPromise.catch(() => {});
    return cached;
  }

  try {
    return await networkPromise;
  } catch (err) {
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
  event.respondWith(staleWhileRevalidate(event.request));
});

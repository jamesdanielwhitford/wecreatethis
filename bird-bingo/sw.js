const CACHE_NAME = 'bird-bingo-v1';
const ASSETS = [
  '/bird-bingo/',
  '/bird-bingo/index',
  '/bird-bingo/daily',
  '/bird-bingo/practice',
  '/bird-bingo/bird',
  '/bird-bingo/life',
  '/bird-bingo/styles.css',
  '/bird-bingo/app.js',
  '/bird-bingo/db.js',
  '/bird-bingo/ebird.js',
  '/bird-bingo/location.js',
  '/bird-bingo/bingo.js',
  '/bird-bingo/manifest.json',
  '/bird-bingo/icon-192.png',
  '/bird-bingo/icon-512.png',
  '/sw-toast.js'
];

// Normalize URL to canonical extensionless format
function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /bird-bingo/index -> /bird-bingo/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

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

// Shell assets (normalized): changes to these are worth an update toast.
const SHELL_URLS = new Set(ASSETS.map((url) => normalizeUrl(url)));

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

// Stale-while-revalidate for same-origin: serve cached immediately,
// revalidate in background. Cross-origin (eBird API, images) is network-first
// with exact-URL caching.
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
    networkPromise.catch(() => {});
    return cached;
  }

  try {
    return await networkPromise;
  } catch (err) {
    if (request.mode === 'navigate') {
      const shell = await cache.match(normalizeUrl('/bird-bingo/'));
      if (shell) return shell;
    }
    return new Response('Offline - content not cached', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Fetch - stale-while-revalidate for same-origin, network-first for cross-origin
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Cross-origin requests (eBird API, iNaturalist, Wikipedia images): network-first with exact-URL caching
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        return new Response('Offline - content not cached', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
    return;
  }

  // Same-origin: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

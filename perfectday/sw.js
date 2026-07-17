const CACHE_NAME = 'perfectday-v10';
const ASSETS = [
  '/perfectday/',
  '/perfectday/index',
  '/perfectday/styles.css',
  '/perfectday/app.js',
  '/perfectday/tile-cache.js',
  '/perfectday/sensors.js',
  '/perfectday/manifest.json',
  '/perfectday/icon-192.png',
  '/perfectday/icon-512.png',
  '/sw-toast.js'
];

// CDN assets needed for offline — cached separately since they're cross-origin
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4/dist/maplibre-gl.css'
];

function normalizeUrl(url, base = self.location.origin) {
  const urlObj = new URL(url, base);
  let path = urlObj.pathname;

  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local assets
      const localPromises = ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const normalized = normalizeUrl(url);
            await cache.put(normalized, await cleanResponse(response.clone()));
          }
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      });

      // Cache CDN assets (stored by their full URL)
      const cdnPromises = CDN_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (err) {
          console.warn('Failed to cache CDN:', url, err);
        }
      });

      await Promise.all([...localPromises, ...cdnPromises]);
    })
  );
  self.skipWaiting();
});

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

// Stale-while-revalidate for same-origin app assets
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
      const shell = await cache.match(normalizeUrl('/perfectday/'));
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
  const url = new URL(event.request.url);

  // Tile server requests — let the app's custom protocol handle these via IndexedDB
  if (url.hostname.includes('tiles.openfreemap.org')) {
    return;
  }

  // CDN requests (MapLibre JS/CSS) — serve from cache, update in background
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request.url);
        const networkPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request.url, response.clone());
          return response;
        }).catch(() => null);

        if (cached) return cached;
        const networkResponse = await networkPromise;
        if (networkResponse) return networkResponse;
        return new Response('Offline - CDN asset not cached', { status: 503 });
      })
    );
    return;
  }

  // Local app assets — stale-while-revalidate
  if (event.request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

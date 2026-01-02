// Service Worker for Tarot Reader

const CACHE_NAME = 'tarot-v2';
const ASSETS = [
  '/tarot/index.html',
  '/tarot/reading.html',
  '/tarot/style.css',
  '/tarot/app.js',
  '/tarot/reading.js',
  '/tarot/db.js',
  '/tarot/tarot-data.js',
  '/tarot/manifest.json',
  '/tarot/icon-192.png',
  '/tarot/icon-512.png'
];

// Helper: Create a clean response without redirect metadata (for Safari)
function stripRedirectMetadata(response) {
  if (!response.redirected) {
    return response.clone();
  }
  // Create new Response without redirect flag
  return response.blob().then(body => {
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  });
}

// Install - cache all assets with redirect stripping
self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Fetch each asset individually and strip redirect metadata
      const fetchPromises = ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const cleanResponse = await stripRedirectMetadata(response);
            await cache.put(url, cleanResponse);
          }
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      });
      await Promise.all(fetchPromises);
    })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('Deleting old caches:', keys.filter(k => k !== CACHE_NAME));
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // Force immediate control of all pages
  self.clients.claim();
});

// Helper to match cache, ignoring query params
async function matchCache(request) {
  const url = new URL(request.url);

  // Try exact match first
  let cached = await caches.match(request);
  if (cached) return cached;

  // Try matching without query params
  cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  // For navigation requests, try additional fallbacks
  if (request.mode === 'navigate') {
    // Try adding .html suffix for extensionless URLs
    if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      const htmlUrl = new URL(url.pathname + '.html', url.origin);
      cached = await caches.match(htmlUrl.href);
      if (cached) return cached;
    }
    // Handle /tarot/ -> /tarot/index.html
    if (url.pathname === '/tarot/' || url.pathname === '/tarot') {
      cached = await caches.match('/tarot/index.html');
      if (cached) return cached;
    }
  }

  return null;
}

// Fetch - network first, fallback to cache (ensures updates when online)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(async (response) => {
      // Cache successful GET requests
      if (response.ok && event.request.method === 'GET') {
        // Always strip redirect metadata before caching AND returning
        const cleanResponse = await stripRedirectMetadata(response);

        // Clone BEFORE returning (avoids race condition with body consumption)
        const responseToCache = cleanResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        // Return clean response to client (Safari requires this)
        return cleanResponse;
      }
      return response;
    }).catch(async () => {
      // Network failed, try cache (ignores query params, handles extensionless URLs)
      const cached = await matchCache(event.request);
      if (cached) {
        return cached;
      }
      // No cache, return offline page for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/tarot/index.html');
      }
      throw new Error('No network and no cache available');
    })
  );
});

const CACHE_NAME = 'birdle-v80';
const ASSETS = [
  '/birdle/index.html',
  '/birdle/search.html',
  '/birdle/games.html',
  '/birdle/new-game.html',
  '/birdle/game.html',
  '/birdle/bird.html',
  '/birdle/life.html',
  '/birdle/daily.html',
  '/birdle/bingo.html',
  '/birdle/sync.html',
  '/birdle/styles.css',
  '/birdle/app.js',
  '/birdle/db.js',
  '/birdle/life.js',
  '/birdle/ebird.js',
  '/birdle/location.js',
  '/birdle/sync/webrtc.js',
  '/birdle/sync/signaling.js',
  '/birdle/sync/sync.js',
  '/birdle/manifest.json',
  '/birdle/icon-192.png',
  '/birdle/icon-512.png'
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

// Helper to try matching URL with .html suffix for extensionless navigation
async function matchWithHtmlFallback(request) {
  const url = new URL(request.url);

  // Try exact match first
  let cached = await caches.match(request);
  if (cached) return cached;

  // For navigation requests, try adding .html suffix
  if (request.mode === 'navigate') {
    // If URL has no extension and doesn't end with /, try .html version
    if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      const htmlUrl = new URL(url.pathname + '.html', url.origin);
      cached = await caches.match(htmlUrl.href);
      if (cached) return cached;
    }
    // Also handle /birdle/ -> /birdle/index.html
    if (url.pathname === '/birdle/' || url.pathname === '/birdle') {
      cached = await caches.match('/birdle/index.html');
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

        // Cache the clean response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cleanResponse.clone());
        });

        // Return clean response to client (Safari requires this)
        return cleanResponse;
      }
      return response;
    }).catch(async () => {
      // Network failed, try cache with HTML fallback for extensionless URLs
      const cached = await matchWithHtmlFallback(event.request);
      if (cached) {
        return cached;
      }
      // No cache, return offline page for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/birdle/index.html');
      }
      throw new Error('No network and no cache available');
    })
  );
});

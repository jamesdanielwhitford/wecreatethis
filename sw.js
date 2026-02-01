const CACHE_NAME = 'wecreatethis-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/beautiful-mind/icon-192.png',
  '/birdle/icon-192.png',
  '/tarot/icon-192.png'
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

  // Try matching without query params (for same-origin only)
  if (url.origin === self.location.origin) {
    cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
  }

  // For navigation requests, try additional fallbacks
  if (request.mode === 'navigate') {
    // Handle / or /index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      cached = await caches.match('/index.html');
      if (!cached) cached = await caches.match('/');
      if (cached) return cached;
    }

    // Try adding .html suffix for extensionless URLs
    if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      const htmlUrl = url.pathname + '.html';
      cached = await caches.match(htmlUrl);
      if (cached) return cached;
    }
  }

  return null;
}

// Fetch - cache first with background update (instant load, updates silently)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    matchCache(event.request).then(async (cached) => {
      // Start background network request for updates
      const networkPromise = fetch(event.request).then(async (response) => {
        // Cache successful GET requests in background
        if (response.ok && event.request.method === 'GET') {
          const cleanResponse = await stripRedirectMetadata(response);
          const responseToCache = cleanResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => null); // Ignore network errors silently

      // Return cached response immediately if available
      if (cached) {
        // Update cache in background (user doesn't wait)
        networkPromise;
        return cached;
      }

      // No cache, wait for network (first visit only)
      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Network failed and no cache, return offline page
      if (event.request.mode === 'navigate') {
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
      }

      // Return a proper 503 response instead of throwing or returning null
      return new Response('Offline - content not cached', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

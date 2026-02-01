const CACHE_NAME = 'beautiful-mind-v6';
const ASSETS = [
  '/beautiful-mind/',
  '/beautiful-mind/index.html',
  '/beautiful-mind/app.js',
  '/beautiful-mind/styles.css',
  '/beautiful-mind/manifest.json',
  '/beautiful-mind/icon-192.png',
  '/beautiful-mind/icon-512.png',
  '/beautiful-mind/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
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

            // Cache under the requested URL
            await cache.put(url, cleanResponse.clone());

            // If the response was redirected, also cache under the final URL
            if (response.redirected && response.url !== url) {
              const finalUrl = new URL(response.url).pathname;
              await cache.put(finalUrl, cleanResponse.clone());
              console.log(`Cached ${url} as both ${url} and ${finalUrl}`);
            }
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
    // Handle /beautiful-mind/index.html -> /beautiful-mind/ or /beautiful-mind
    if (url.pathname === '/beautiful-mind/index.html') {
      cached = await caches.match('/beautiful-mind/');
      if (cached) return cached;
      cached = await caches.match('/beautiful-mind');
      if (cached) return cached;
    }

    // Handle /beautiful-mind/ or /beautiful-mind -> /beautiful-mind/index.html
    if (url.pathname === '/beautiful-mind/' || url.pathname === '/beautiful-mind') {
      cached = await caches.match('/beautiful-mind/index.html');
      if (cached) return cached;
    }

    // Try both with and without .html extension
    // Cloudflare redirects .html -> extensionless, so we need to check both
    if (url.pathname.endsWith('.html')) {
      // Has .html - try without it
      const noExtUrl = url.pathname.slice(0, -5);
      cached = await caches.match(noExtUrl);
      if (cached) return cached;
    } else if (!url.pathname.endsWith('/')) {
      // No extension - try adding .html
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
        const fallback = await caches.match('/beautiful-mind/index.html');
        if (fallback) return fallback;
      }

      // Return a proper 503 response instead of throwing
      return new Response('Offline - content not cached', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Service Worker for Tarot Reader

const CACHE_NAME = 'tarot-v30';
const ASSETS = [
  '/tarot/',
  '/tarot/index',
  '/tarot/reading',
  '/tarot/card-detail',
  '/tarot/deck',
  '/tarot/deck-card-detail',
  '/tarot/style.css',
  '/tarot/app.js',
  '/tarot/reading.js',
  '/tarot/card-detail.js',
  '/tarot/deck.js',
  '/tarot/deck-card-detail.js',
  '/tarot/deck-manager.js',
  '/tarot/db.js',
  '/tarot/tarot-data.js',
  '/migrate-receiver.js',
  '/tarot/card-descriptions.js',
  '/tarot/card-back-patterns.js',
  '/tarot/manifest.json',
  // Card images
  '/tarot/images/01 of Cups.webp',
  '/tarot/images/01 of Pentacles.webp',
  '/tarot/images/01 of Swords.webp',
  '/tarot/images/01 of Wands.webp',
  '/tarot/images/02 of Cups.webp',
  '/tarot/images/02 of Pentacles.webp',
  '/tarot/images/02 of Swords.webp',
  '/tarot/images/02 of Wands.webp',
  '/tarot/images/03 of Cups.webp',
  '/tarot/images/03 of Pentacles.webp',
  '/tarot/images/03 of Swords.webp',
  '/tarot/images/03 of Wands.webp',
  '/tarot/images/04 of Cups.webp',
  '/tarot/images/04 of Pentacles.webp',
  '/tarot/images/04 of Swords.webp',
  '/tarot/images/04 of Wands.webp',
  '/tarot/images/05 of Cups.webp',
  '/tarot/images/05 of Pentacles.webp',
  '/tarot/images/05 of Swords.webp',
  '/tarot/images/05 of Wands.webp',
  '/tarot/images/06 of Cups.webp',
  '/tarot/images/06 of Pentacles.webp',
  '/tarot/images/06 of Swords.webp',
  '/tarot/images/06 of Wands.webp',
  '/tarot/images/07 of Cups.webp',
  '/tarot/images/07 of Pentacles.webp',
  '/tarot/images/07 of Swords.webp',
  '/tarot/images/07 of Wands.webp',
  '/tarot/images/08 of Cups.webp',
  '/tarot/images/08 of Pentacles.webp',
  '/tarot/images/08 of Swords.webp',
  '/tarot/images/08 of Wands.webp',
  '/tarot/images/09 of Cups.webp',
  '/tarot/images/09 of Pentacles.webp',
  '/tarot/images/09 of Swords.webp',
  '/tarot/images/09 of Wands.webp',
  '/tarot/images/10 of Cups.webp',
  '/tarot/images/10 of Pentacles.webp',
  '/tarot/images/10 of Swords.webp',
  '/tarot/images/10 of Wands.webp',
  '/tarot/images/Chariot.webp',
  '/tarot/images/Death.webp',
  '/tarot/images/Devil.webp',
  '/tarot/images/Emperor.webp',
  '/tarot/images/Empress.webp',
  '/tarot/images/Fool.webp',
  '/tarot/images/Hanged Man.webp',
  '/tarot/images/Hermit.webp',
  '/tarot/images/Hierophant.webp',
  '/tarot/images/High Priestess.webp',
  '/tarot/images/Judgment.webp',
  '/tarot/images/Justice.webp',
  '/tarot/images/King of Cups.webp',
  '/tarot/images/King of Pentacles.webp',
  '/tarot/images/King of Swords.webp',
  '/tarot/images/King of Wands.webp',
  '/tarot/images/Knight of Cups.webp',
  '/tarot/images/Knight of Pentacles.webp',
  '/tarot/images/Knight of Swords.webp',
  '/tarot/images/Knight of Wands.webp',
  '/tarot/images/Lovers.webp',
  '/tarot/images/Magician.webp',
  '/tarot/images/Moon.webp',
  '/tarot/images/Page of Cups.webp',
  '/tarot/images/Page of Pentacles.webp',
  '/tarot/images/Page of Swords.webp',
  '/tarot/images/Page of Wands.webp',
  '/tarot/images/Queen of Cups.webp',
  '/tarot/images/Queen of Pentacles.webp',
  '/tarot/images/Queen of Swords.webp',
  '/tarot/images/Queen of Wands.webp',
  '/tarot/images/Star.webp',
  '/tarot/images/Strength.webp',
  '/tarot/images/Sun.webp',
  '/tarot/images/Temperance.webp',
  '/tarot/images/Tower.webp',
  '/tarot/images/Wheel of Fortune.webp',
  '/tarot/images/World.webp'
];

// Normalize URL to canonical extensionless format
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /tarot/index -> /tarot/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}

// Install - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const fetchPromises = ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            // Cache under normalized URL
            const normalized = normalizeUrl(url);
            await cache.put(normalized, response.clone());
          }
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      });
      await Promise.all(fetchPromises);
    })
  );
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

// Match cache using normalized URL (ignores query params)
async function matchCache(request) {
  const normalized = normalizeUrl(request.url);
  const cache = await caches.open(CACHE_NAME);
  return cache.match(normalized);
}

// Fetch - cache first with background update
self.addEventListener('fetch', (event) => {
  event.respondWith(
    matchCache(event.request).then(async (cached) => {
      // Start background network request for updates
      const networkPromise = fetch(event.request).then(async (response) => {
        if (response.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          const normalized = normalizeUrl(event.request.url);
          cache.put(normalized, response.clone());
        }
        return response;
      }).catch(() => null);

      // Return cached response immediately if available
      if (cached) {
        networkPromise; // Update in background
        return cached;
      }

      // No cache, wait for network
      const networkResponse = await networkPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Network failed and no cache, return offline page
      if (event.request.mode === 'navigate') {
        const fallback = await matchCache(new Request('/tarot/'));
        if (fallback) return fallback;
      }

      return new Response('Offline - content not cached', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Message handler for deck caching
self.addEventListener('message', async (event) => {
  const { type, deckId, imageUrls } = event.data;

  if (type === 'CACHE_DECK') {
    const cache = await caches.open(CACHE_NAME);
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    for (const url of imageUrls) {
      try {
        const response = await fetch(url, { headers });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (err) {
        console.warn('Failed to cache deck image:', url, err);
      }
    }

    console.log(`Cached deck: ${deckId}`);
  } else if (type === 'REMOVE_DECK') {
    const cache = await caches.open(CACHE_NAME);

    for (const url of imageUrls) {
      try {
        await cache.delete(url);
      } catch (err) {
        console.warn('Failed to remove deck image:', url, err);
      }
    }

    console.log(`Removed deck from cache: ${deckId}`);
  }
});

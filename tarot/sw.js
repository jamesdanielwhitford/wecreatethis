// Network-first service worker with cache fallback.
//
// Strategy: every same-origin GET goes to the network first, so users always
// see the latest deploy while online. If the network fails or takes longer
// than NETWORK_TIMEOUT_MS (flaky wifi, offline), the cached copy is served
// instead. ASSETS are pre-cached at install so the app works offline from
// the first visit. CACHE_NAME only needs bumping to purge deleted files;
// routine updates reach users without any version change.
const CACHE_NAME = 'tarot-v34';
const APP_ROOT = '/tarot/';
const NETWORK_TIMEOUT_MS = 3000;

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

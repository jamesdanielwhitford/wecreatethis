const CACHE_NAME = 'blog-v7';

// App shell only, listed as canonical (extensionless) URLs since those are
// the keys the fetch handler looks up. Content (home.md, post index.md
// files) is derived from content-manifest.json at install time and served
// network-first, so new posts appear without a service worker version bump.
const ASSETS = [
  '/blog/',
  '/blog/section',
  '/blog/app.js',
  '/blog/style.css',
  '/blog/manifest.json',
];

const MANIFEST_URL = '/blog/content-manifest.json';

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path.endsWith('/index')) path = path.slice(0, -5);
  return urlObj.origin + path;
}

// Content is anything under /blog/content/ plus the manifest itself.
function isContent(pathname) {
  return pathname.startsWith('/blog/content/') || pathname === MANIFEST_URL;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.all(ASSETS.map(async url => {
      const response = await fetch(url);
      if (response.ok) await cache.put(new URL(url, self.location.origin).href, response);
    }));

    // Cache all published content listed in the manifest (best effort).
    try {
      const response = await fetch(MANIFEST_URL);
      const manifest = await response.clone().json();
      await cache.put(new URL(MANIFEST_URL, self.location.origin).href, response);

      const urls = ['/blog/content/home.md'];
      for (const section of manifest.sections) {
        for (const post of section.posts) {
          urls.push(`/blog/content/${section.path}/${post.slug}/index.md`);
        }
      }
      await Promise.all(urls.map(url => cache.add(url).catch(() => {})));
    } catch (e) {
      // Offline or manifest missing; runtime caching will fill in later.
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const normalized = normalizeUrl(event.request.url);

  // Content: network-first so new/edited posts show up immediately,
  // falling back to cache when offline.
  if (isContent(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(normalized, clone));
        }
        return response;
      }).catch(() => caches.match(normalized))
    );
    return;
  }

  // Shell and everything else: cache-first.
  event.respondWith(
    caches.match(normalized).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(normalized, clone));
        }
        return response;
      }).catch(err => {
        // Offline navigation to a section page we haven't visited yet:
        // any /blog/... path is served by the cached section shell.
        if (event.request.mode === 'navigate' && url.pathname.startsWith('/blog/')) {
          return caches.match(new URL('/blog/section', self.location.origin).href).then(shell => {
            if (shell) return shell;
            throw err;
          });
        }
        throw err;
      });
    })
  );
});

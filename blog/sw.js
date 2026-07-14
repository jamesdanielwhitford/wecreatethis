const CACHE_NAME = 'blog-v6';

const ASSETS = [
  '/blog/',
  '/blog/index.html',
  '/blog/section.html',
  '/blog/app.js',
  '/blog/manifest.json',
  '/blog/content-manifest.json',
  '/blog/content/home.md',
  '/blog/content/dev-tools/how-to-write-sick-loops-in-claude-code/index.md',
  '/blog/content/demo/post-one/index.md',
  '/blog/content/demo/post-two/index.md',
  '/blog/content/demo/post-three/index.md',
];

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path.endsWith('/index')) path = path.slice(0, -5);
  return urlObj.origin + path;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
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
  const normalized = normalizeUrl(event.request.url);
  event.respondWith(
    caches.match(normalized).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(normalized, clone));
        }
        return response;
      });
    })
  );
});

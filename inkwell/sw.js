const CACHE_NAME = 'inkwell-v6';

const ASSETS = [
  '/inkwell/',
  '/inkwell/note',
  '/inkwell/settings',
  '/inkwell/app.js',
  '/inkwell/note.js',
  '/inkwell/store.js',
  '/inkwell/storage.js',
  '/inkwell/db.js',
  '/inkwell/settings.js',
  '/inkwell/api.js',
  '/inkwell/voice',
  '/inkwell/voice.js',
  '/inkwell/chat',
  '/inkwell/chat.js',
  '/inkwell/manifest.json',
];

function normalizeUrl(url) {
  const u = new URL(url);
  let p = u.pathname;
  if (p.endsWith('.html')) p = p.slice(0, -5);
  if (p.endsWith('/index')) p = p.slice(0, -6) + '/';
  return u.origin + p;
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Pass through cross-origin requests (API calls)
  if (url.origin !== location.origin) return;
  const key = normalizeUrl(e.request.url);
  e.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(key);
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
});

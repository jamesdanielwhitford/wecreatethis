const CACHE_NAME = 'wecreatethis-v4';

// Install - skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - pass through to network, no interception
// This prevents ERR_FAILED issues on Chrome
self.addEventListener('fetch', () => {
  // Do nothing - let the browser handle all requests normally
  return;
});

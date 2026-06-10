// Service worker for the Tower of Hanoi benchmark.
// App shell is cached for offline use (manual play works offline);
// the live API and MCP endpoint are always network-only.

const CACHE = "towersofhanoi-v1";
const SHELL = [
  "/towersofhanoi/",
  "/towersofhanoi/index.html",
  "/towersofhanoi/style.css",
  "/towersofhanoi/app.js",
  "/towersofhanoi/manifest.json",
  "/towersofhanoi/icon-192.png",
  "/towersofhanoi/icon-512.png",
];

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;
  if (path.endsWith(".html")) path = path.slice(0, -5);
  if (path.endsWith("/index")) path = path.slice(0, -5);
  return urlObj.origin + path;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Live data and the MCP endpoint must never be cached.
  if (url.pathname.startsWith("/towersofhanoi/api/") || url.pathname === "/towersofhanoi/mcp") {
    return;
  }
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(normalizeUrl(event.request.url), { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(normalizeUrl(event.request.url), copy));
          }
          return res;
        })
    )
  );
});

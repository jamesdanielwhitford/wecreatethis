const CACHE_NAME = 'wecreatethis-v28';

// App shell only, listed as canonical (extensionless) URLs since those are
// the keys the fetch handler looks up. Content (home.md, post index.md
// files) is derived from content-manifest.json at install time and served
// network-first, so new posts appear without a service worker version bump.
const ASSETS = [
  '/',
  '/section',
  '/app.js',
  '/icons.js',
  '/style.css',
  '/manifest.json',
  '/sw-toast.js',
];

const MANIFEST_URL = '/content-manifest.json';

function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;
  if (path.endsWith('.html')) path = path.slice(0, -5);
  if (path.endsWith('/index')) path = path.slice(0, -5);
  return urlObj.origin + path;
}

// Content is anything under /content/ plus the manifest itself.
function isContent(pathname) {
  return pathname.startsWith('/content/') || pathname === MANIFEST_URL;
}

// Rewrap before caching to strip redirect metadata. Cloudflare Pages (and
// the _redirects self-rewrites that serve every section path) mark responses
// redirected:true; serving such a cached response to a navigation fails with
// ERR_FAILED in Chrome/Safari.
// Cheap "did this actually change?" check on headers alone, so the update
// toast only fires for real changes. Same logic as the root sw.js.
function responsesDiffer(a, b) {
  const etagA = a.headers.get('ETag');
  const etagB = b.headers.get('ETag');
  if (etagA && etagB) return etagA !== etagB;
  const lenA = a.headers.get('Content-Length');
  const lenB = b.headers.get('Content-Length');
  if (lenA && lenB) return lenA !== lenB;
  const modA = a.headers.get('Last-Modified');
  const modB = b.headers.get('Last-Modified');
  if (modA && modB) return modA !== modB;
  return false;
}

function cleanResponse(response) {
  if (!response.redirected) return Promise.resolve(response);
  return response.blob().then(body =>
    new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  );
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // `cache: 'reload'` bypasses the HTTP cache, so a CACHE_NAME bump can
    // never pre-cache a stale shell asset (the shell is served cache-first
    // with no revalidation, so a stale entry would stick).
    await Promise.all(ASSETS.map(async url => {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) {
        await cache.put(new URL(url, self.location.origin).href, await cleanResponse(response));
      }
    }));

    // Cache all published content listed in the manifest (best effort).
    try {
      const response = await fetch(MANIFEST_URL, { cache: 'reload' });
      const manifest = await response.clone().json();
      await cache.put(new URL(MANIFEST_URL, self.location.origin).href, await cleanResponse(response));

      const urls = ['/content/home.md'];
      for (const section of manifest.sections) {
        for (const post of section.posts) {
          urls.push(`/content/${section.path}/${post.slug}/index.md`);
        }
      }
      await Promise.all(urls.map(async url => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) {
            await cache.put(new URL(url, self.location.origin).href, await cleanResponse(res));
          }
        } catch (e) {
          // Best effort; runtime caching fills in later.
        }
      }));
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
          caches.open(CACHE_NAME).then(async cache =>
            cache.put(normalized, await cleanResponse(clone))
          );
        }
        return response;
      }).catch(() => caches.match(normalized))
    );
    return;
  }

  // Shell: stale-while-revalidate. The cached copy is served immediately
  // (instant loads), while a background fetch refreshes it. Without the
  // revalidation a cache-first shell can pin a visitor to an old app.js
  // indefinitely - new CSS with old JS, which looks like broken rendering
  // rather than a stale cache.
  event.respondWith(
    caches.match(normalized).then(cached => {
      const network = fetch(event.request).then(async response => {
        if (response.ok) {
          const fresh = await cleanResponse(response.clone());
          const cache = await caches.open(CACHE_NAME);
          // Tell open clients when a shell asset actually changed, so
          // /sw-toast.js can offer a refresh instead of silently swapping
          // code under a page that is already running.
          if (cached && responsesDiffer(cached, fresh)) {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(c => c.postMessage({ type: 'sw-updated' }));
          }
          await cache.put(normalized, fresh);
        }
        return response;
      }).catch(err => {
        // Offline navigation to a section page we haven't visited yet:
        // any path is served by the cached section shell.
        if (event.request.mode === 'navigate') {
          return caches.match(new URL('/section', self.location.origin).href).then(shell => {
            if (shell) return shell;
            throw err;
          });
        }
        throw err;
      });

      return cached || network;
    })
  );
});

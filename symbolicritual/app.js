import { getItems, getItemBySlug, putItems } from './db.js';
import { fetchItems } from './api.js';

const MOCK_MODE = new URLSearchParams(location.search).has('mock');

const MOCK_ITEMS = [
  { id: 1, slug: 1, media_type: 'image', media_url: '/symbolicritual/test-assets/01-landscape.png', alt: 'Wide landscape, warm sand tones', captured_at: '2026-05-16T11:09', lat: -33.8688, lng: 151.2093, caption: 'The light arrived before the sound did.', lang: 'en', width: 1920, height: 1080 },
  { id: 2, slug: 2, media_type: 'image', media_url: '/symbolicritual/test-assets/02-portrait.png', alt: 'Tall portrait, cool blue tones', captured_at: '2026-05-14T07:33', lat: 51.5074, lng: -0.1278, caption: null, lang: 'en', width: 1080, height: 1920 },
  { id: 3, slug: 3, media_type: 'image', media_url: '/symbolicritual/test-assets/03-square.png', alt: 'Square frame, soft violet tones', captured_at: '2026-05-10T18:02', lat: 34.0522, lng: -118.2437, caption: 'الضوء وصل قبل أن يصل الصوت.', lang: 'ar', width: 1080, height: 1080 },
  { id: 4, slug: 4, media_type: 'image', media_url: '/symbolicritual/test-assets/04-ultrawide.png', alt: 'Ultra-wide panoramic, muted green tones', captured_at: '2026-05-08T06:15', lat: 48.8566, lng: 2.3522, caption: 'Horizon as threshold.', lang: 'en', width: 2560, height: 800 },
  { id: 5, slug: 5, media_type: 'image', media_url: '/symbolicritual/test-assets/05-tall.png', alt: 'Very tall narrow frame, terracotta tones', captured_at: '2026-05-05T14:45', lat: 40.7128, lng: -74.0060, caption: null, lang: 'en', width: 600, height: 1800 },
];

const feed = document.getElementById('feed');
const sentinel = document.getElementById('scroll-sentinel');
const offlineBar = document.getElementById('offline-bar');

const RTL_LANGS = ['ar','he','fa','ur','yi','dv','ps','sd'];

let lowestSlug = null;
let highestSlug = null;
let loadingMore = false;
let loadingEl = null;
let currentUrlSlug = null;
let urlUpdateScheduled = false;

// O(1) check of whether a slug has already been rendered.
const renderedSlugs = new Set();

function dir(lang) {
  return RTL_LANGS.some(l => (lang || 'en').startsWith(l)) ? 'rtl' : 'ltr';
}

function formatDatetime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const date = d.toLocaleDateString('en-CA');
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}  ${time}`;
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return '';
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function showLoading() {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.className = 'loading-pulse';
  loadingEl.setAttribute('aria-label', 'Loading');
  loadingEl.setAttribute('role', 'status');
  feed.insertBefore(loadingEl, sentinel);
}

function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}

function showEmpty() {
  const msg = document.createElement('p');
  msg.className = 'feed-message';
  msg.textContent = 'Nothing here yet.';
  feed.insertBefore(msg, sentinel);
}

function showOffline() { offlineBar.classList.add('visible'); }
function hideOffline() { offlineBar.classList.remove('visible'); }

// Number of items rendered so far. First item gets eager+high priority.
let renderIndex = 0;

function renderItem(item) {
  const isFirst = renderIndex === 0;
  renderIndex++;

  const article = document.createElement('article');
  article.className = 'item';
  article.dataset.id = item.id;
  article.dataset.slug = item.slug;

  const figure = document.createElement('figure');

  let media;
  if (item.media_type === 'video') {
    media = document.createElement('video');
    media.className = 'item-media';
    media.controls = true;
    media.preload = 'metadata';
    media.playsInline = true;
    if (item.width) media.width = item.width;
    if (item.height) media.height = item.height;
    if (item.track_src) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.srclang = item.lang || 'en';
      track.label = item.lang || 'en';
      track.src = item.track_src;
      media.appendChild(track);
    }
    const source = document.createElement('source');
    source.src = item.media_url;
    source.type = item.media_mime || 'video/mp4';
    media.appendChild(source);
  } else {
    media = document.createElement('img');
    media.className = 'item-media';
    media.alt = item.alt || '';
    // width/height attributes give the browser an aspect ratio so it can reserve
    // correctly-sized space before the bytes arrive. This eliminates layout shift.
    if (item.width) media.width = item.width;
    if (item.height) media.height = item.height;
    media.loading = isFirst ? 'eager' : 'lazy';
    media.decoding = isFirst ? 'sync' : 'async';
    media.fetchPriority = isFirst ? 'high' : 'low';
    media.src = item.media_url;

    media.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'item-media-error';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', item.alt || 'Image unavailable');
      placeholder.textContent = item.alt || 'Image unavailable';
      // Preserve aspect ratio if we know it, otherwise the CSS default kicks in.
      if (item.width && item.height) {
        placeholder.style.aspectRatio = `${item.width} / ${item.height}`;
      }
      media.replaceWith(placeholder);
    }, { once: true });
  }

  const figcaption = document.createElement('figcaption');
  const meta = document.createElement('div');
  meta.className = 'meta';

  const dt = document.createElement('span');
  dt.className = 'meta-datetime';
  dt.textContent = formatDatetime(item.captured_at);
  meta.appendChild(dt);

  const coords = formatCoords(item.lat, item.lng);
  if (coords) {
    const co = document.createElement('a');
    co.className = 'meta-coords';
    co.href = `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}&zoom=15`;
    co.target = '_blank';
    co.rel = 'noopener noreferrer';
    co.setAttribute('aria-label', 'View location on OpenStreetMap (opens in new tab)');
    co.textContent = coords;
    meta.appendChild(co);
  }

  figcaption.appendChild(meta);

  if (item.caption) {
    const cap = document.createElement('p');
    cap.className = 'meta-caption';
    cap.lang = item.lang || 'en';
    cap.dir = dir(item.lang);
    cap.textContent = item.caption;
    figcaption.appendChild(cap);
  }

  figure.appendChild(media);
  figure.appendChild(figcaption);
  article.appendChild(figure);
  return article;
}

// Single IntersectionObserver tracks which item is currently centered in the
// viewport. It uses a thin horizontal band at the middle of the viewport as the
// root area — only the item crossing that band counts as "current". This avoids
// the O(n) recomputation the previous visibilityMap approach required on every
// callback.
const urlObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const slug = entry.target.dataset.slug;
    if (slug === currentUrlSlug) continue;
    currentUrlSlug = slug;
    if (!urlUpdateScheduled) {
      urlUpdateScheduled = true;
      requestAnimationFrame(() => {
        urlUpdateScheduled = false;
        history.replaceState({ slug: currentUrlSlug }, '', `?item=${currentUrlSlug}`);
      });
    }
  }
}, {
  // Band of ~2px at the vertical centre of the viewport. The item whose figure
  // crosses this band is treated as the "current" one.
  rootMargin: '-50% 0px -50% 0px',
  threshold: 0,
});

// Prefetch observer: when an item is approaching the viewport (within 1.5 viewport
// heights), upgrade its image's fetchPriority. Combined with native lazy-loading,
// this gives smooth scrolling without flashing as items appear.
const prefetchObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const img = entry.target.querySelector('img.item-media');
    if (img && img.fetchPriority === 'low') img.fetchPriority = 'high';
    // Stop watching once we've boosted it.
    prefetchObserver.unobserve(entry.target);
  }
}, {
  rootMargin: '150% 0px 150% 0px',
  threshold: 0,
});

function observeItem(el) {
  urlObserver.observe(el);
  prefetchObserver.observe(el);
}

const sentinelObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: '300% 0px' });

function appendItem(item) {
  if (renderedSlugs.has(item.slug)) return null;
  const el = renderItem(item);
  feed.insertBefore(el, sentinel);
  renderedSlugs.add(item.slug);
  observeItem(el);
  if (lowestSlug === null || item.slug < lowestSlug) lowestSlug = item.slug;
  if (highestSlug === null || item.slug > highestSlug) highestSlug = item.slug;
  return el;
}

function prependItem(item) {
  if (renderedSlugs.has(item.slug)) return null;
  const el = renderItem(item);
  feed.insertBefore(el, feed.firstChild);
  renderedSlugs.add(item.slug);
  observeItem(el);
  if (lowestSlug === null || item.slug < lowestSlug) lowestSlug = item.slug;
  if (highestSlug === null || item.slug > highestSlug) highestSlug = item.slug;
  return el;
}

async function loadMore() {
  if (loadingMore) return;
  loadingMore = true;
  try {
    const items = MOCK_MODE
      ? MOCK_ITEMS.filter(i => lowestSlug === null || i.slug < lowestSlug).slice(0, 20)
      : await getItems({ before: lowestSlug, limit: 20 });
    for (const item of items) appendItem(item);
  } finally {
    loadingMore = false;
  }
}

async function loadNewer(aboveSlug) {
  const items = await getItems({ after: aboveSlug, limit: 20 });
  // getItems(after:) returns ascending; reverse to descending so prepending in order
  // places the newest at the top of the feed.
  for (const item of [...items].reverse()) prependItem(item);
}

async function init() {
  showLoading();

  const params = new URLSearchParams(location.search);
  const targetSlug = params.get('item') ? Number(params.get('item')) : null;

  if (targetSlug) {
    let item = await getItemBySlug(targetSlug);
    if (!item) {
      // Not in local cache yet — sync from API first so the target item can be located.
      await syncFromApi().catch(() => {});
      item = await getItemBySlug(targetSlug);
    }
    if (item) {
      hideLoading();
      const el = appendItem(item);
      if (el) el.scrollIntoView();
      await Promise.all([loadMore(), loadNewer(item.slug)]);
    } else {
      hideLoading();
      history.replaceState({}, '', location.pathname);
      await loadMore();
      if (feed.querySelectorAll('.item').length === 0) showEmpty();
    }
  } else {
    await loadMore();
    hideLoading();
    if (feed.querySelectorAll('.item').length === 0) {
      await syncFromApi().catch(() => {});
      if (feed.querySelectorAll('.item').length === 0) showEmpty();
    }
  }

  sentinelObserver.observe(sentinel);
  if (!MOCK_MODE) syncFromApi().catch(() => {});
}

async function syncFromApi() {
  let items;
  try {
    items = await fetchItems({ limit: 20 });
    hideOffline();
  } catch {
    showOffline();
    return;
  }
  if (!items?.length) return;

  // Single IndexedDB transaction for all writes — N round trips become 1.
  await putItems(items);

  hideLoading();

  // API returns newest-first (ORDER BY slug DESC). Split into three buckets so each
  // is inserted in the right place with predictable DOM order.
  const newer = [];
  const older = [];
  const middle = [];
  for (const item of items) {
    if (renderedSlugs.has(item.slug)) continue;
    if (highestSlug === null || item.slug > highestSlug) newer.push(item);
    else if (item.slug < lowestSlug) older.push(item);
    else middle.push(item);
  }

  // Newer items: iterate ascending so each prepend lands beneath the previous,
  // leaving the highest slug at the top of the feed.
  for (const item of [...newer].reverse()) prependItem(item);

  // Older items: API already gave us newest-first, which is the order we want
  // when appending below existing items.
  for (const item of older) appendItem(item);

  // Middle items are unusual (would only happen if local cache was partially
  // populated). Insert each before the first existing item with a smaller slug.
  for (const item of middle) {
    const el = renderItem(item);
    let inserted = false;
    for (const existing of feed.querySelectorAll('.item')) {
      if (Number(existing.dataset.slug) < item.slug) {
        feed.insertBefore(el, existing);
        inserted = true;
        break;
      }
    }
    if (!inserted) feed.insertBefore(el, sentinel);
    renderedSlugs.add(item.slug);
    observeItem(el);
    if (lowestSlug === null || item.slug < lowestSlug) lowestSlug = item.slug;
    if (highestSlug === null || item.slug > highestSlug) highestSlug = item.slug;
  }
}

init();

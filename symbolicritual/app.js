import { getItems, getItemBySlug, putItem } from './db.js';
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
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RTL_LANGS = ['ar','he','fa','ur','yi','dv','ps','sd'];

let itemCount = 0;
let lowestId = null;
let highestId = null;
let loading = false;
let loadingEl = null;

const visibilityMap = new Map();

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

function renderItem(item) {
  const position = itemCount++;

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
    media.src = item.media_url;
    media.alt = item.alt || '';
    if (item.width) media.width = item.width;
    if (item.height) media.height = item.height;
    media.loading = position === 0 ? 'eager' : 'lazy';
    media.decoding = position === 0 ? 'sync' : 'async';

    // Broken image fallback
    media.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'item-media-error';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', item.alt || 'Image unavailable');
      placeholder.textContent = item.alt || 'Image unavailable';
      media.replaceWith(placeholder);
    };
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
    co.setAttribute('aria-label', `View location on OpenStreetMap (opens in new tab)`);
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

const MIN_GAP = 32; // px — minimum breathing room above and below each item

function applyItemPadding(el) {
  const vh = window.innerHeight;
  const figure = el.querySelector('figure');
  const contentHeight = figure ? figure.getBoundingClientRect().height : el.getBoundingClientRect().height;
  const pad = Math.max(MIN_GAP, (vh - contentHeight) / 2);
  el.style.paddingTop = pad + 'px';
  el.style.paddingBottom = pad + 'px';
  el.style.opacity = '1';
}

const itemResizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const item = entry.target.closest('.item');
    if (item) applyItemPadding(item);
  }
});

function observeItem(el) {
  urlObserver.observe(el);
  const figure = el.querySelector('figure');
  if (figure) itemResizeObserver.observe(figure);
  // Defer first measurement until after browser layout
  requestAnimationFrame(() => applyItemPadding(el));
  const media = el.querySelector('img, video');
  if (media) {
    media.addEventListener('load', () => applyItemPadding(el), { once: true });
    media.addEventListener('loadedmetadata', () => applyItemPadding(el), { once: true });
  }
}

const urlObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const slug = entry.target.dataset.slug;
    if (entry.isIntersecting) {
      visibilityMap.set(slug, entry.intersectionRatio);
    } else {
      visibilityMap.delete(slug);
    }
  }
  if (visibilityMap.size === 0) return;
  let bestSlug = null, bestRatio = -1;
  for (const [slug, ratio] of visibilityMap) {
    if (ratio > bestRatio) { bestRatio = ratio; bestSlug = slug; }
  }
  if (bestSlug) history.replaceState({ slug: bestSlug }, '', `?item=${bestSlug}`);
}, { threshold: [0, 0.25, 0.5, 0.75, 1] });

const sentinelObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: '200px' });

async function loadMore() {
  if (loading) return;
  loading = true;
  const items = MOCK_MODE
    ? MOCK_ITEMS.filter(i => lowestId === null || i.slug < lowestId).slice(0, 20)
    : await getItems({ before: lowestId, limit: 20 });
  for (const item of items) {
    const el = renderItem(item);
    feed.insertBefore(el, sentinel);
    observeItem(el);
    if (lowestId === null || item.slug < lowestId) lowestId = item.slug;
    if (highestId === null || item.slug > highestId) highestId = item.slug;
  }
  loading = false;
}

async function loadNewer(aboveSlug) {
  const items = await getItems({ after: aboveSlug, limit: 20 });
  const firstChild = feed.firstChild;
  for (const item of [...items].reverse()) {
    const el = renderItem(item);
    feed.insertBefore(el, firstChild);
    observeItem(el);
    if (highestId === null || item.slug > highestId) highestId = item.slug;
  }
}

async function init() {
  showLoading();

  const params = new URLSearchParams(location.search);
  const targetSlug = params.get('item') ? Number(params.get('item')) : null;

  if (targetSlug) {
    // Try local cache first, fall back to API sync which will populate it
    let item = await getItemBySlug(targetSlug);
    if (!item) {
      // Not in local cache yet — sync from API first
      await syncFromApi().catch(() => {});
      item = await getItemBySlug(targetSlug);
    }
    if (item) {
      hideLoading();
      const el = renderItem(item);
      feed.insertBefore(el, sentinel);
      observeItem(el);
      lowestId = item.slug;
      highestId = item.slug;
      el.scrollIntoView();
      await Promise.all([loadMore(), loadNewer(item.slug)]);
    } else {
      // Slug not found anywhere — fall back to top of feed
      hideLoading();
      history.replaceState({}, '', location.pathname);
      await loadMore();
      if (feed.querySelectorAll('.item').length === 0) showEmpty();
    }
  } else {
    await loadMore();
    hideLoading();
    if (feed.querySelectorAll('.item').length === 0) {
      // Nothing in local cache — try API
      await syncFromApi().catch(() => {});
      if (feed.querySelectorAll('.item').length === 0) showEmpty();
    }
  }

  sentinelObserver.observe(sentinel);
  if (!MOCK_MODE) syncFromApi().catch(() => {});
}

async function syncFromApi() {
  try {
    const items = await fetchItems({ limit: 20 });
    if (!items?.length) return;
    hideOffline();
    for (const item of items) {
      await putItem(item);
      if (!feed.querySelector(`[data-slug="${item.slug}"]`)) {
        hideLoading();
        const el = renderItem(item);
        const existing = [...feed.querySelectorAll('.item')];
        const insertBefore = existing.find(e => Number(e.dataset.slug) < item.slug);
        feed.insertBefore(el, insertBefore || sentinel);
        observeItem(el);
        if (lowestId === null || item.slug < lowestId) lowestId = item.slug;
        if (highestId === null || item.slug > highestId) highestId = item.slug;
      }
    }
  } catch {
    showOffline();
  }
}

window.addEventListener('resize', () => {
  for (const el of feed.querySelectorAll('.item')) applyItemPadding(el);
});

init();

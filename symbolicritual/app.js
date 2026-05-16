import { getItems, getItem, putItem } from './db.js';
import { fetchItems, fetchItem } from './api.js';

const feed = document.getElementById('feed');
const sentinel = document.getElementById('scroll-sentinel');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RTL_LANGS = ['ar','he','fa','ur','yi','dv','ps','sd'];

let lowestId = null;
let highestId = null;
let loading = false;

// Tracks intersection ratios per item so we update URL to the most-visible one
const visibilityMap = new Map();

function dir(lang) {
  return RTL_LANGS.some(l => (lang || 'en').startsWith(l)) ? 'rtl' : 'ltr';
}

function formatDatetime(iso) {
  // iso is "YYYY-MM-DDTHH:MM" or full ISO string
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}  ${time}`;
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return '';
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function renderItem(item) {
  const article = document.createElement('article');
  article.className = 'item';
  article.dataset.id = item.id;

  const figure = document.createElement('figure');

  let media;
  if (item.media_type === 'video') {
    media = document.createElement('video');
    media.className = 'item-media';
    media.controls = true;
    media.preload = 'metadata';
    if (!reduceMotion) media.autoplay = false; // autoplay added in later stage when needed
    if (item.width) media.width = item.width;
    if (item.height) media.height = item.height;
    const track = document.createElement('track');
    track.kind = 'captions';
    track.srclang = item.lang || 'en';
    track.label = item.lang || 'en';
    if (item.track_src) track.src = item.track_src;
    media.appendChild(track);
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
    media.loading = 'lazy';
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
    const co = document.createElement('span');
    co.className = 'meta-coords';
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

function observeItem(el) {
  urlObserver.observe(el);
}

// Tracks intersection ratio per item, updates URL to whichever is most visible
const urlObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const id = entry.target.dataset.id;
    if (entry.isIntersecting) {
      visibilityMap.set(id, entry.intersectionRatio);
    } else {
      visibilityMap.delete(id);
    }
  }
  if (visibilityMap.size === 0) return;
  // Pick the item with the highest intersection ratio
  let bestId = null, bestRatio = -1;
  for (const [id, ratio] of visibilityMap) {
    if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
  }
  if (bestId) history.replaceState({ id: bestId }, '', `?item=${bestId}`);
}, { threshold: [0, 0.25, 0.5, 0.75, 1] });

// Triggers loading more items when sentinel enters view
const sentinelObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMore();
}, { rootMargin: '200px' });

async function loadMore() {
  if (loading) return;
  loading = true;
  const items = await getItems({ before: lowestId, limit: 20 });
  for (const item of items) {
    const el = renderItem(item);
    feed.insertBefore(el, sentinel);
    observeItem(el);
    if (lowestId === null || item.id < lowestId) lowestId = item.id;
    if (highestId === null || item.id > highestId) highestId = item.id;
  }
  loading = false;
}

// Loads items newer than highestId and prepends them above the feed
async function loadNewer(aboveId) {
  const items = await getItems({ after: aboveId, limit: 20 });
  const firstChild = feed.firstChild;
  for (const item of [...items].reverse()) {
    const el = renderItem(item);
    feed.insertBefore(el, firstChild);
    observeItem(el);
    if (highestId === null || item.id > highestId) highestId = item.id;
  }
}

async function init() {
  const params = new URLSearchParams(location.search);
  const targetId = params.get('item') ? Number(params.get('item')) : null;

  if (targetId) {
    const item = await getItem(targetId);
    if (item) {
      const el = renderItem(item);
      feed.insertBefore(el, sentinel);
      observeItem(el);
      lowestId = item.id;
      highestId = item.id;
      el.scrollIntoView();
      // Load older items below and newer items above
      await Promise.all([loadMore(), loadNewer(item.id)]);
    } else {
      await loadMore();
    }
  } else {
    await loadMore();
  }

  sentinelObserver.observe(sentinel);

  // Background sync from API — writes new items to IndexedDB and renders them
  syncFromApi().catch(() => {});
}

async function syncFromApi() {
  const items = await fetchItems({ limit: 20 });
  if (!items?.length) return;
  for (const item of items) {
    await putItem(item);
    // Render if not already in the feed
    if (!feed.querySelector(`[data-id="${item.id}"]`)) {
      const el = renderItem(item);
      // Insert in correct position (newest first = smallest DOM index)
      const existing = [...feed.querySelectorAll('.item')];
      const after = existing.find(e => Number(e.dataset.id) < item.id);
      feed.insertBefore(el, after || sentinel);
      observeItem(el);
      if (lowestId === null || item.id < lowestId) lowestId = item.id;
      if (highestId === null || item.id > highestId) highestId = item.id;
    }
  }
}

init();

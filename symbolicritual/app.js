import { getItems, getItem } from './db.js';

const feed = document.getElementById('feed');
const sentinel = document.getElementById('scroll-sentinel');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RTL_LANGS = ['ar','he','fa','ur','yi','dv','ps','sd'];

let lowestId = null;
let loading = false;

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

// Updates URL when item crosses 50% of viewport
const urlObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const id = entry.target.dataset.id;
      history.replaceState({ id }, '', `?item=${id}`);
    }
  }
}, { threshold: 0.5 });

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
  }
  loading = false;
}

async function init() {
  const params = new URLSearchParams(location.search);
  const targetId = params.get('item');

  if (targetId) {
    // Load the target item first, scroll to it, then load the rest
    const item = await getItem(Number(targetId));
    if (item) {
      const el = renderItem(item);
      feed.insertBefore(el, sentinel);
      observeItem(el);
      lowestId = item.id;
      el.scrollIntoView();
    }
    // Load items older than target below
    await loadMore();
  } else {
    await loadMore();
  }

  sentinelObserver.observe(sentinel);
}

init();

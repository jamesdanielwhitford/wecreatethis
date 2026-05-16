import { getItems, putItem, deleteItemBySlug, getMaxSlug, getItemBySlug } from './db.js';
import { uploadMedia, createItem, updateItem, removeItem } from './api.js';

let exifr;
async function loadExifr() {
  if (exifr) return exifr;
  const mod = await import('https://cdn.jsdelivr.net/npm/exifr/dist/mini.esm.js');
  exifr = mod.default ?? mod;
  return exifr;
}

async function extractExif(file) {
  if (file.type.startsWith('video/')) return {};
  try {
    const lib = await loadExifr();
    const data = await lib.parse(file, { gps: true, tiff: true, exif: true });
    if (!data) return {};
    const result = {};
    // Datetime: prefer DateTimeOriginal, fall back to DateTimeDigitized
    const dt = data.DateTimeOriginal ?? data.DateTimeDigitized ?? data.CreateDate;
    if (dt instanceof Date && !isNaN(dt)) {
      // datetime-local wants YYYY-MM-DDTHH:MM, local time
      const pad = n => String(n).padStart(2, '0');
      result.capturedAt = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    if (data.latitude != null) result.lat = data.latitude;
    if (data.longitude != null) result.lng = data.longitude;
    return result;
  } catch {
    return {};
  }
}

const API_BASE = 'https://symbolic-ritual.james-052.workers.dev';

// --- Auth gate ---
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const tokenInput = document.getElementById('token-input');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout-btn');

function getToken() { return sessionStorage.getItem('sr-auth-token') || ''; }

async function verifyToken(token) {
  try {
    const res = await fetch(`${API_BASE}/api/items/next-slug`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    // Worker not deployed yet — accept any non-empty token for local dev
    return token.length > 0;
  }
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) return;
  loginStatus.textContent = 'Checking...';
  const ok = await verifyToken(token);
  if (ok) {
    sessionStorage.setItem('sr-auth-token', token);
    loginStatus.textContent = '';
    showAdmin();
  } else {
    loginStatus.textContent = 'Invalid token.';
    tokenInput.value = '';
    tokenInput.focus();
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('sr-auth-token');
  adminScreen.style.display = 'none';
  loginScreen.style.display = '';
  tokenInput.value = '';
  tokenInput.focus();
});

function showAdmin() {
  loginScreen.style.display = 'none';
  adminScreen.style.display = '';
  setupForm();
  renderList();
}

// Boot
if (getToken()) {
  showAdmin();
} else {
  loginScreen.style.display = '';
}

// --- Admin UI ---
let selectedFile = null;
let editingSlug = null;
let formSetup = false;

function setupForm() {
  if (formSetup) return;
  formSetup = true;

  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const dropzoneLabel = document.getElementById('dropzone-label');
  const altGroup = document.getElementById('alt-group');
  const slugInput = document.getElementById('slug');
  const altInput = document.getElementById('alt');
  const capturedAt = document.getElementById('captured-at');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');
  const captionInput = document.getElementById('caption');
  const langInput = document.getElementById('lang');
  const submitBtn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('status');

  capturedAt.value = new Date().toISOString().slice(0, 16);
  getMaxSlug().then(max => { if (!slugInput.value) slugInput.value = max + 1; });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    selectedFile = file;
    showPreview(file, dropzone, dropzoneLabel, altGroup);
    const exif = await extractExif(file);
    if (exif.capturedAt && !editingSlug) capturedAt.value = exif.capturedAt;
    if (exif.lat != null && !editingSlug) latInput.value = exif.lat;
    if (exif.lng != null && !editingSlug) lngInput.value = exif.lng;
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const isVideo = selectedFile?.type.startsWith('video/');
    const slug = parseInt(slugInput.value);

    if (!editingSlug && !selectedFile) { statusEl.textContent = 'Choose a file first.'; return; }
    if (!editingSlug && !isVideo && !altInput.value.trim()) { statusEl.textContent = 'Alt text is required for images.'; return; }
    if (!capturedAt.value) { statusEl.textContent = 'Capture date is required.'; return; }
    if (!slug || slug < 1) { statusEl.textContent = 'Item number must be a positive integer.'; return; }

    // Validate coordinates
    const lat = latInput.value ? parseFloat(latInput.value) : null;
    const lng = lngInput.value ? parseFloat(lngInput.value) : null;
    if (lat !== null && (lat < -90 || lat > 90)) { statusEl.textContent = 'Latitude must be between -90 and 90.'; latInput.focus(); return; }
    if (lng !== null && (lng < -180 || lng > 180)) { statusEl.textContent = 'Longitude must be between -180 and 180.'; lngInput.focus(); return; }

    // Warn on slug conflict (only when adding, not editing)
    if (!editingSlug) {
      const existing = await getItemBySlug(slug);
      if (existing) { statusEl.textContent = `Item #${slug} already exists. Choose a different number or edit the existing item.`; slugInput.focus(); return; }
    }

    submitBtn.disabled = true;

    try {
      let mediaUrl, mediaType, mediaMime, r2_key, width, height;

      if (selectedFile) {
        statusEl.textContent = 'Uploading media...';
        mediaMime = selectedFile.type;
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
        const dims = await getImageDimensions(selectedFile);
        width = dims.width;
        height = dims.height;
        const uploaded = await uploadMedia(selectedFile);
        mediaUrl = uploaded.mediaUrl;
        r2_key = uploaded.key;
      }

      statusEl.textContent = editingSlug ? 'Saving...' : 'Adding...';

      const payload = {
        slug,
        captured_at: capturedAt.value,
        lat,
        lng,
        caption: captionInput.value.trim() || null,
        lang: langInput.value.trim() || 'en',
        alt: altInput.value.trim() || '',
        ...(selectedFile && { media_url: mediaUrl, media_mime: mediaMime, media_type: mediaType, r2_key, width, height }),
      };

      let savedItem;
      if (editingSlug) {
        savedItem = await updateItem(editingSlug, payload);
        editingSlug = null;
        submitBtn.textContent = 'Add item';
      } else {
        savedItem = await createItem(payload);
      }

      // Write to local IndexedDB cache
      await putItem(savedItem);
      statusEl.textContent = editingSlug === null ? 'Saved.' : 'Added.';

      resetForm(dropzone, dropzoneLabel, altGroup, altInput, capturedAt, latInput, lngInput, captionInput, langInput, slugInput);
      await renderList();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Expose startEdit so renderList can call it
  window._startEdit = (item) => {
    editingSlug = item.slug;
    slugInput.value = item.slug;
    capturedAt.value = item.captured_at.slice(0, 16);
    latInput.value = item.lat ?? '';
    lngInput.value = item.lng ?? '';
    captionInput.value = item.caption ?? '';
    langInput.value = item.lang ?? 'en';
    altInput.value = item.alt ?? '';

    const old = dropzone.querySelector('.dropzone-preview');
    if (old) old.remove();
    selectedFile = null;

    const isVideo = item.media_type === 'video';
    altGroup.style.display = isVideo ? 'none' : '';

    let preview;
    if (isVideo) {
      preview = document.createElement('video');
      preview.src = item.media_url;
      preview.preload = 'metadata';
      preview.muted = true;
    } else {
      preview = document.createElement('img');
      preview.src = item.media_url;
      preview.alt = item.alt || '';
    }
    preview.className = 'dropzone-preview';
    dropzone.insertBefore(preview, dropzoneLabel);
    dropzoneLabel.textContent = 'Current file — choose a new one to replace it';
    dropzone.classList.add('has-file');

    document.getElementById('submit-btn').textContent = 'Save changes';
    statusEl.textContent = `Editing item #${item.slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

function resetForm(dropzone, dropzoneLabel, altGroup, altInput, capturedAt, latInput, lngInput, captionInput, langInput, slugInput) {
  selectedFile = null;
  document.getElementById('file-input').value = '';
  const old = dropzone.querySelector('.dropzone-preview');
  if (old) old.remove();
  dropzoneLabel.textContent = 'Choose image or video';
  dropzone.classList.remove('has-file');
  altInput.value = '';
  capturedAt.value = new Date().toISOString().slice(0, 16);
  latInput.value = '';
  lngInput.value = '';
  captionInput.value = '';
  langInput.value = 'en';
  altGroup.style.display = '';
  getMaxSlug().then(max => { slugInput.value = max + 1; });
}

function showPreview(file, dropzone, dropzoneLabel, altGroup) {
  const isVideo = file.type.startsWith('video/');
  altGroup.style.display = isVideo ? 'none' : '';
  const old = dropzone.querySelector('.dropzone-preview');
  if (old) old.remove();
  const url = URL.createObjectURL(file);
  let preview;
  if (isVideo) {
    preview = document.createElement('video');
    preview.src = url;
    preview.preload = 'metadata';
    preview.muted = true;
  } else {
    preview = document.createElement('img');
    preview.src = url;
  }
  preview.className = 'dropzone-preview';
  dropzone.insertBefore(preview, dropzoneLabel);
  dropzoneLabel.textContent = file.name;
  dropzone.classList.add('has-file');
}


function getImageDimensions(file) {
  return new Promise(resolve => {
    if (file.type.startsWith('video/')) { resolve({ width: null, height: null }); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: null, height: null }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function formatDatetime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA') + '  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return '';
  const label = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="View location on OpenStreetMap (opens in new tab)">${label}</a>`;
}

function rtlDir(lang) {
  const rtl = ['ar','he','fa','ur','yi','dv','ps','sd'];
  return rtl.some(l => (lang || 'en').startsWith(l)) ? 'rtl' : 'ltr';
}

async function renderList() {
  const itemList = document.getElementById('item-list');
  const items = await getItems({ limit: 200 });
  itemList.innerHTML = '';

  if (!items.length) {
    itemList.innerHTML = '<p class="empty">No items yet.</p>';
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'item-row';

    let thumb;
    if (item.media_type === 'video') {
      thumb = document.createElement('video');
      thumb.src = item.media_url;
      thumb.preload = 'metadata';
      thumb.muted = true;
    } else {
      thumb = document.createElement('img');
      thumb.src = item.media_url;
      thumb.alt = item.alt || '';
    }
    thumb.className = 'item-thumb';

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.innerHTML = `
      <span style="opacity:0.4;font-size:0.75rem">#${item.slug}</span>
      <span>${formatDatetime(item.captured_at)}</span>
      <span class="item-meta-coords">${formatCoords(item.lat, item.lng)}</span>
      ${item.caption ? `<span class="item-meta-caption" lang="${item.lang}" dir="${rtlDir(item.lang)}">${item.caption}</span>` : ''}
    `;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => window._startEdit(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Delete item #${item.slug}?`)) return;
      try {
        await removeItem(item.slug);
      } catch (e) {
        console.warn('API delete failed, removing locally only:', e.message);
      }
      await deleteItemBySlug(item.slug);
      await renderList();
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    itemList.appendChild(row);
  }
}

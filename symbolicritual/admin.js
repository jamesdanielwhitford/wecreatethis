import { getItems, putItem, deleteItemBySlug, getMaxSlug, getItemBySlug } from './db.js';

const API_BASE = 'https://symbolic-ritual.workers.dev';

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

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    selectedFile = file;
    showPreview(file, dropzone, dropzoneLabel, altGroup);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const isVideo = selectedFile?.type.startsWith('video/');
    const slug = parseInt(slugInput.value);

    if (!editingSlug && !selectedFile) { statusEl.textContent = 'Choose a file first.'; return; }
    if (!editingSlug && !isVideo && !altInput.value.trim()) { statusEl.textContent = 'Alt text is required for images.'; return; }
    if (!capturedAt.value) { statusEl.textContent = 'Capture date is required.'; return; }
    if (!slug || slug < 1) { statusEl.textContent = 'Item number must be a positive integer.'; return; }

    submitBtn.disabled = true;
    statusEl.textContent = editingSlug ? 'Saving...' : 'Adding...';

    try {
      let mediaUrl, mediaType, mediaMime, width, height;

      if (selectedFile) {
        mediaMime = selectedFile.type;
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
        mediaUrl = await readFileAsDataUrl(selectedFile);
        const dims = await getImageDimensions(mediaUrl, selectedFile.type);
        width = dims.width;
        height = dims.height;
      }

      const item = {
        slug,
        captured_at: capturedAt.value,
        lat: latInput.value ? parseFloat(latInput.value) : null,
        lng: lngInput.value ? parseFloat(lngInput.value) : null,
        caption: captionInput.value.trim() || null,
        lang: langInput.value.trim() || 'en',
        alt: altInput.value.trim() || '',
      };

      if (selectedFile) {
        item.media_url = mediaUrl;
        item.media_mime = mediaMime;
        item.media_type = mediaType;
        item.width = width;
        item.height = height;
      }

      if (editingSlug) {
        const existing = await getItemBySlug(editingSlug);
        await putItem({ ...existing, ...item });
        statusEl.textContent = 'Saved.';
        editingSlug = null;
        submitBtn.textContent = 'Add item';
      } else {
        await putItem(item);
        statusEl.textContent = 'Added.';
      }

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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl, type) {
  return new Promise(resolve => {
    if (type.startsWith('video/')) { resolve({ width: null, height: null }); return; }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = dataUrl;
  });
}

function formatDatetime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA') + '  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return '';
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
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

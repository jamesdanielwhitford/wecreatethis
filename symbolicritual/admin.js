import { getItems, putItem, deleteItem } from './db.js';

const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const dropzoneLabel = document.getElementById('dropzone-label');
const altGroup = document.getElementById('alt-group');
const altInput = document.getElementById('alt');
const capturedAt = document.getElementById('captured-at');
const latInput = document.getElementById('lat');
const lngInput = document.getElementById('lng');
const captionInput = document.getElementById('caption');
const langInput = document.getElementById('lang');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');
const itemList = document.getElementById('item-list');

let selectedFile = null;
let editingId = null;  // non-null when editing an existing item

// Set default datetime to now
capturedAt.value = new Date().toISOString().slice(0, 16);

// File selection
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  selectedFile = file;
  showPreview(file);
});

function showPreview(file) {
  const isVideo = file.type.startsWith('video/');
  altGroup.style.display = isVideo ? 'none' : '';

  // Remove old preview
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

function setStatus(msg) { statusEl.textContent = msg; }

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

form.addEventListener('submit', async e => {
  e.preventDefault();

  const isVideo = selectedFile?.type.startsWith('video/');

  if (!editingId && !selectedFile) { setStatus('Choose a file first.'); return; }
  if (!isVideo && !altInput.value.trim() && !editingId) { setStatus('Alt text is required for images.'); return; }
  if (!capturedAt.value) { setStatus('Capture date is required.'); return; }

  submitBtn.disabled = true;
  setStatus(editingId ? 'Saving...' : 'Adding...');

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
      media_type: mediaType ?? (editingId ? undefined : 'image'),
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
      item.width = width;
      item.height = height;
    }

    if (editingId) {
      // Merge with existing item
      const existing = await import('./db.js').then(m => m.getItem(editingId));
      await putItem({ ...existing, ...item });
      setStatus('Saved.');
      editingId = null;
      submitBtn.textContent = 'Add item';
    } else {
      await putItem(item);
      setStatus('Added.');
    }

    resetForm();
    await renderList();
  } catch (err) {
    setStatus('Error: ' + err.message);
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});

function resetForm() {
  selectedFile = null;
  fileInput.value = '';
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

async function renderList() {
  const items = await getItems({ limit: 200 });
  itemList.innerHTML = '';

  if (!items.length) {
    itemList.innerHTML = '<p class="empty">No items yet.</p>';
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'item-row';

    // Thumbnail
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

    // Meta
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.innerHTML = `
      <span>${formatDatetime(item.captured_at)}</span>
      <span class="item-meta-coords">${formatCoords(item.lat, item.lng)}</span>
      ${item.caption ? `<span class="item-meta-caption" lang="${item.lang}" dir="${rtlDir(item.lang)}">${item.caption}</span>` : ''}
    `;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Delete item from ${formatDatetime(item.captured_at)}?`)) return;
      await deleteItem(item.id);
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

function rtlDir(lang) {
  const rtl = ['ar','he','fa','ur','yi','dv','ps','sd'];
  return rtl.some(l => (lang || 'en').startsWith(l)) ? 'rtl' : 'ltr';
}

function startEdit(item) {
  editingId = item.id;
  capturedAt.value = item.captured_at.slice(0, 16);
  latInput.value = item.lat ?? '';
  lngInput.value = item.lng ?? '';
  captionInput.value = item.caption ?? '';
  langInput.value = item.lang ?? 'en';
  altInput.value = item.alt ?? '';
  submitBtn.textContent = 'Save changes';
  setStatus(`Editing item #${item.id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

renderList();

// IndexedDB layer for voice notes metadata + audio blobs

const META_DB = 'voice-notes-v3';
const AUDIO_DB = 'voice-notes-audio';

let metaDb = null;
let audioDb = null;

function openMetaDb() {
  if (metaDb) return Promise.resolve(metaDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB, 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('notes')) {
        const store = d.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = e => { metaDb = e.target.result; resolve(metaDb); };
    req.onerror = () => reject(req.error);
  });
}

function openAudioDb() {
  if (audioDb) return Promise.resolve(audioDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIO_DB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('blobs', { keyPath: 'id' });
    req.onsuccess = e => { audioDb = e.target.result; resolve(audioDb); };
    req.onerror = () => reject(req.error);
  });
}

// --- Note metadata ---

export async function getNotes(limit = 200) {
  const d = await openMetaDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('notes', 'readonly');
    const index = tx.objectStore('notes').index('createdAt');
    const results = [];
    const req = index.openCursor(null, 'prev');
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor || results.length >= limit) { resolve(results); return; }
      results.push(cursor.value);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getNote(id) {
  const d = await openMetaDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('notes', 'readonly');
    const req = tx.objectStore('notes').get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putNote(note) {
  const d = await openMetaDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('notes', 'readwrite');
    const req = tx.objectStore('notes').put(note);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function putNotes(notes) {
  if (!notes || notes.length === 0) return;
  const d = await openMetaDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    for (const note of notes) store.put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function deleteNote(id) {
  const d = await openMetaDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('notes', 'readwrite');
    const req = tx.objectStore('notes').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- Audio blobs ---

export async function saveAudioBlob(id, blob, mimeType) {
  const d = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ id, blob, mimeType });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlob(id) {
  const d = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioBlob(id) {
  const d = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

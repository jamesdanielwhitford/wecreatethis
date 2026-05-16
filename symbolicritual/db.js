const DB_NAME = 'symbolic-ritual-db';
const DB_VERSION = 1;

let db;

function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('items')) {
        const store = d.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('captured_at', 'captured_at', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// Returns items ordered newest first. Pass before=id to paginate.
export async function getItems({ before = null, limit = 20 } = {}) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const results = [];
    const req = store.openCursor(null, 'prev');
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor || results.length >= limit) { resolve(results); return; }
      const item = cursor.value;
      if (before === null || item.id < before) {
        results.push(item);
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getItem(id) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readonly');
    const req = tx.objectStore('items').get(Number(id));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putItem(item) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readwrite');
    const req = tx.objectStore('items').put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(id) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readwrite');
    const req = tx.objectStore('items').delete(Number(id));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

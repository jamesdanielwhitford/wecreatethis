const DB_NAME = 'symbolic-ritual-db';
const DB_VERSION = 2;

let db;

function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('items')) {
        const store = d.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('slug', 'slug', { unique: true });
        store.createIndex('captured_at', 'captured_at', { unique: false });
      } else {
        // v1 -> v2: add slug index if missing
        const store = e.target.transaction.objectStore('items');
        if (!store.indexNames.contains('slug')) {
          store.createIndex('slug', 'slug', { unique: true });
        }
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// Returns items ordered newest first by slug. Pass before/after as slug values.
export async function getItems({ before = null, after = null, limit = 20 } = {}) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readonly');
    const index = tx.objectStore('items').index('slug');
    const results = [];

    if (after !== null) {
      const range = IDBKeyRange.lowerBound(after, true);
      const req = index.openCursor(range, 'next');
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) { resolve(results); return; }
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    } else {
      const range = before !== null ? IDBKeyRange.upperBound(before, true) : null;
      const req = index.openCursor(range, 'prev');
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) { resolve(results); return; }
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    }
  });
}

// Look up by slug (the user-visible number)
export async function getItemBySlug(slug) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readonly');
    const req = tx.objectStore('items').index('slug').get(Number(slug));
    req.onsuccess = () => resolve(req.result ?? null);
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

// Returns the highest slug currently stored locally
export async function getMaxSlug() {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readonly');
    const req = tx.objectStore('items').index('slug').openCursor(null, 'prev');
    req.onsuccess = e => {
      const cursor = e.target.result;
      resolve(cursor ? cursor.value.slug : 0);
    };
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

export async function deleteItemBySlug(slug) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('items', 'readwrite');
    const index = tx.objectStore('items').index('slug');
    const getReq = index.getKey(Number(slug));
    getReq.onsuccess = () => {
      if (getReq.result == null) { resolve(); return; }
      const delReq = tx.objectStore('items').delete(getReq.result);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

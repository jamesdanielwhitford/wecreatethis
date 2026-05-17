// IndexedDB adapter. Same export surface as store.js.

const DB_NAME = 'inkwell-db';
const DB_VERSION = 1;
let db;

function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('nodes')) {
        const store = d.createObjectStore('nodes', { keyPath: 'id' });
        store.createIndex('parent_id', 'parent_id', { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function getChildren(parentId) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('nodes', 'readonly');
    const req = tx.objectStore('nodes').getAll();
    req.onsuccess = () => {
      const all = req.result;
      const children = all
        .filter(n => parentId === null ? n.parent_id === null : n.parent_id === parentId)
        .sort((a, b) => a.position - b.position);
      resolve(children);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getNode(id) {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const req = d.transaction('nodes', 'readonly').objectStore('nodes').get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putNode(node) {
  const d = await openDb();
  const now = new Date().toISOString();
  const updated = { ...node, updated_at: now };
  if (!updated.created_at) updated.created_at = now;
  return new Promise((resolve, reject) => {
    const req = d.transaction('nodes', 'readwrite').objectStore('nodes').put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNode(id) {
  const d = await openDb();
  // Recursively collect descendants
  const all = await new Promise((resolve, reject) => {
    const req = d.transaction('nodes', 'readonly').objectStore('nodes').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const toDelete = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of all) {
      if (n.parent_id === cur && !toDelete.has(n.id)) {
        toDelete.add(n.id);
        queue.push(n.id);
      }
    }
  }
  return new Promise((resolve, reject) => {
    const tx = d.transaction('nodes', 'readwrite');
    const store = tx.objectStore('nodes');
    for (const delId of toDelete) store.delete(delId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllDescendants(id) {
  const d = await openDb();
  const all = await new Promise((resolve, reject) => {
    const req = d.transaction('nodes', 'readonly').objectStore('nodes').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const ids = new Set();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of all) {
      if (n.parent_id === cur) { ids.add(n.id); queue.push(n.id); }
    }
  }
  return all.filter(n => ids.has(n.id));
}

export async function createNode({ parent_id = null, type, title = '', body = null, source = null } = {}) {
  const children = await getChildren(parent_id);
  const position = children.length ? Math.max(...children.map(n => n.position)) + 1 : 0;
  const now = new Date().toISOString();
  const node = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    parent_id, type, title, body, source, position, created_at: now, updated_at: now,
  };
  return putNode(node);
}

export async function getAllNodes() {
  const d = await openDb();
  return new Promise((resolve, reject) => {
    const req = d.transaction('nodes', 'readonly').objectStore('nodes').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

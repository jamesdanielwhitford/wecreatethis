// Thin adapter. Selects store.js (localStorage) or db.js+api.js (authenticated).
// All exported functions return Promises.

import * as store from './store.js';
import * as db from './db.js';
import * as api from './api.js';

export function isAuthed() {
  return !!sessionStorage.getItem('inkwell-auth-token');
}

// Sync all nodes changed since last sync into IndexedDB.
// Stores the last-sync timestamp in localStorage.
export async function syncFromServer() {
  if (!isAuthed()) return;
  const since = localStorage.getItem('inkwell-last-sync') || null;
  try {
    const nodes = await api.syncSince(since);
    for (const node of nodes) await db.putNode(node);
    localStorage.setItem('inkwell-last-sync', new Date().toISOString());
  } catch (e) {
    console.warn('Inkwell sync failed:', e.message);
  }
}

function be() { return isAuthed() ? db : store; }

export const getChildren = (parentId) => Promise.resolve(be().getChildren(parentId));
export const getNode = (id) => Promise.resolve(be().getNode(id));
export const getAllDescendants = (id) => Promise.resolve(be().getAllDescendants(id));

export async function putNode(node) {
  const saved = await be().putNode(node);
  if (isAuthed()) {
    api.updateNode(node.id, saved).catch(() => {});
  }
  return saved;
}

export async function deleteNode(id) {
  await be().deleteNode(id);
  if (isAuthed()) {
    api.deleteNode(id).catch(() => {});
  }
}

export async function createNode(data) {
  const node = await be().createNode(data);
  if (isAuthed()) {
    api.createNode(node).catch(() => {});
  }
  return node;
}

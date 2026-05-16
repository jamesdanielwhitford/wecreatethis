// Thin adapter. Selects store.js (localStorage) or db.js (IndexedDB) based on auth.
// db.js and api.js are added in Stage 6/7. For now always delegates to store.js.

import * as store from './store.js';

function isAuthed() {
  return !!sessionStorage.getItem('inkwell-auth-token');
}

// These will conditionally import db.js once Stage 6 is built.
// For now all paths go to store.js.

export function getChildren(parentId) { return Promise.resolve(store.getChildren(parentId)); }
export function getNode(id) { return Promise.resolve(store.getNode(id)); }
export function putNode(node) { return Promise.resolve(store.putNode(node)); }
export function deleteNode(id) { return Promise.resolve(store.deleteNode(id)); }
export function getAllDescendants(id) { return Promise.resolve(store.getAllDescendants(id)); }
export function createNode(data) { return Promise.resolve(store.createNode(data)); }
export { isAuthed };

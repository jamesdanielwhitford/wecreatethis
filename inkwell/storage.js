// Thin adapter. Selects store.js (localStorage) or db.js (IndexedDB) based on auth.
// All exported functions return Promises regardless of which backend is active.

import * as store from './store.js';
import * as db from './db.js';

export function isAuthed() {
  return !!sessionStorage.getItem('inkwell-auth-token');
}

function be() { return isAuthed() ? db : store; }

export const getChildren = (parentId) => Promise.resolve(be().getChildren(parentId));
export const getNode = (id) => Promise.resolve(be().getNode(id));
export const putNode = (node) => Promise.resolve(be().putNode(node));
export const deleteNode = (id) => Promise.resolve(be().deleteNode(id));
export const getAllDescendants = (id) => Promise.resolve(be().getAllDescendants(id));
export const createNode = (data) => Promise.resolve(be().createNode(data));

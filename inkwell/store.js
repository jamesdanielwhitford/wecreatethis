// localStorage adapter. Same export surface as db.js so storage.js can swap them.

const KEY = 'inkwell-nodes';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(nodes) {
  localStorage.setItem(KEY, JSON.stringify(nodes));
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getChildren(parentId) {
  const nodes = load();
  return nodes
    .filter(n => (parentId === null ? n.parent_id === null : n.parent_id === parentId))
    .sort((a, b) => a.position - b.position);
}

export function getNode(id) {
  return load().find(n => n.id === id) ?? null;
}

export function putNode(node) {
  const nodes = load();
  const idx = nodes.findIndex(n => n.id === node.id);
  const now = new Date().toISOString();
  const updated = { ...node, updated_at: now };
  if (!updated.created_at) updated.created_at = now;
  if (!updated.id) updated.id = uuid();
  if (idx >= 0) nodes[idx] = updated;
  else nodes.push(updated);
  save(nodes);
  return updated;
}

export function deleteNode(id) {
  let nodes = load();
  const toDelete = getAllDescendantIds(nodes, id);
  toDelete.add(id);
  nodes = nodes.filter(n => !toDelete.has(n.id));
  save(nodes);
}

export function getAllDescendants(id) {
  const nodes = load();
  const ids = getAllDescendantIds(nodes, id);
  return nodes.filter(n => ids.has(n.id));
}

function getAllDescendantIds(nodes, id) {
  const result = new Set();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    const children = nodes.filter(n => n.parent_id === current);
    for (const c of children) {
      result.add(c.id);
      queue.push(c.id);
    }
  }
  return result;
}

export function createNode({ parent_id = null, type, title = '', body = null, source = null } = {}) {
  const nodes = load();
  const siblings = nodes.filter(n =>
    parent_id === null ? n.parent_id === null : n.parent_id === parent_id
  );
  const position = siblings.length ? Math.max(...siblings.map(n => n.position)) + 1 : 0;
  return putNode({ id: uuid(), parent_id, type, title, body, source, position });
}

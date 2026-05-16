import * as storage from './storage.js';
import { syncFromServer } from './storage.js';

// Seed dev data once
async function maybeSeed() {
  if (localStorage.getItem('inkwell-seeded')) return;
  const work = await storage.createNode({ type: 'folder', title: 'Work', parent_id: null });
  const personal = await storage.createNode({ type: 'folder', title: 'Personal', parent_id: null });
  await storage.createNode({ type: 'folder', title: 'Projects', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Meeting notes 14 May', body: 'Discussed quarterly targets with the team.\n\n- Revenue on track\n- Marketing needs more spend in June\n- Two open roles to close by end of month', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Ideas for quarterly review', body: 'Focus on team wins. Highlight the product launch. Ask about morale.', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Reading list', body: 'The Pragmatic Programmer\nStructure and Interpretation of Computer Programs', parent_id: personal.id });
  localStorage.setItem('inkwell-seeded', '1');
}

let currentFolderId = null;
let currentNodes = [];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderList(nodes) {
  currentNodes = nodes;
  const ul = document.getElementById('node-list');
  ul.innerHTML = '';
  if (!nodes.length) {
    ul.innerHTML = '<li class="empty">No items here yet.</li>';
    return;
  }
  for (const node of nodes) {
    const li = document.createElement('li');
    li.dataset.id = node.id;

    const a = document.createElement('a');
    a.href = node.type === 'folder'
      ? `/inkwell/?folder=${node.id}`
      : `/inkwell/note?id=${node.id}`;
    a.innerHTML = `
      <span class="node-icon" aria-hidden="true">${node.type === 'folder' ? '&#128193;' : '&#128196;'}</span>
      <span class="node-info">
        <span class="node-title">${escHtml(node.title || 'Untitled')}</span>
        ${node.type === 'note' ? `<span class="node-meta">${formatDate(node.updated_at)}</span>` : ''}
      </span>`;

    const actions = document.createElement('span');
    actions.className = 'node-actions';
    actions.innerHTML = `
      <button class="action-btn" data-action="rename" data-id="${node.id}" aria-label="Rename">&#9998;</button>
      <button class="action-btn" data-action="delete" data-id="${node.id}" aria-label="Delete">&#10005;</button>`;

    li.appendChild(a);
    li.appendChild(actions);
    ul.appendChild(li);
  }
}

async function buildBreadcrumb(folderId) {
  const crumbs = [{ title: 'Inkwell', href: '/inkwell/' }];
  const chain = [];
  let id = folderId;
  while (id) {
    const node = await storage.getNode(id);
    if (!node) break;
    chain.unshift(node);
    id = node.parent_id;
  }
  for (const node of chain) {
    crumbs.push({ title: node.title, href: `/inkwell/?folder=${node.id}` });
  }
  const nav = document.getElementById('breadcrumb');
  nav.innerHTML = crumbs.map((c, i) =>
    i < crumbs.length - 1
      ? `<span><a href="${c.href}">${escHtml(c.title)}</a></span>`
      : `<span>${escHtml(c.title)}</span>`
  ).join('');
  const h1 = document.getElementById('folder-title');
  if (h1) h1.textContent = chain.length ? chain[chain.length - 1].title : 'Inkwell';
}

async function reload() {
  const nodes = await storage.getChildren(currentFolderId);
  renderList(nodes);
}

// Creation menu
function showMenu() {
  const existing = document.getElementById('create-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.id = 'create-menu';
  menu.innerHTML = `
    <button data-create="folder">&#128193; New folder</button>
    <button data-create="note">&#128196; New note</button>
    <button data-create="voice">&#127908; Voice note</button>
    <button data-create="chat">&#129302; AI chat</button>`;
  document.body.appendChild(menu);

  // Position below the + button
  const btn = document.getElementById('btn-new');
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.right = `${document.documentElement.clientWidth - rect.right}px`;

  menu.addEventListener('click', async e => {
    const type = e.target.dataset.create;
    if (!type) return;
    menu.remove();
    if (type === 'note') {
      const node = await storage.createNode({ type: 'note', title: '', body: '', parent_id: currentFolderId, source: 'typed' });
      location.href = `/inkwell/note?id=${node.id}`;
    } else if (type === 'voice') {
      const dest = currentFolderId ? `?parent=${currentFolderId}` : '';
      location.href = `/inkwell/voice${dest}`;
    } else if (type === 'chat') {
      const dest = currentFolderId ? `?parent=${currentFolderId}` : '';
      location.href = `/inkwell/chat${dest}`;
    } else {
      const title = prompt('Folder name:');
      if (!title) return;
      await storage.createNode({ type: 'folder', title: title.trim(), parent_id: currentFolderId });
      reload();
    }
  });

  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== btn) menu.remove();
  }, { once: true });
}

async function handleAction(action, id) {
  if (action === 'rename') {
    const node = await storage.getNode(id);
    if (!node) return;
    const title = prompt('Rename:', node.title);
    if (title === null) return;
    await storage.putNode({ ...node, title: title.trim() });
    reload();
  } else if (action === 'delete') {
    const node = await storage.getNode(id);
    if (!node) return;
    const label = node.type === 'folder' ? 'folder and all its contents' : 'note';
    if (!confirm(`Delete this ${label}?`)) return;
    await storage.deleteNode(id);
    reload();
  }
}

async function init() {
  // Only seed when unauthenticated
  if (!storage.isAuthed()) await maybeSeed();
  // Sync from server in background (no await — don't block render)
  syncFromServer().then(() => reload()).catch(() => {});
  const params = new URLSearchParams(location.search);
  currentFolderId = params.get('folder') || null;
  await buildBreadcrumb(currentFolderId);
  await reload();

  document.getElementById('btn-new').addEventListener('click', e => {
    e.stopPropagation();
    showMenu();
  });

  document.getElementById('node-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    handleAction(btn.dataset.action, btn.dataset.id);
  });
}

init();

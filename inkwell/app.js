import * as storage from './storage.js';

// Seed dev data once
async function maybeeSeed() {
  if (localStorage.getItem('inkwell-seeded')) return;
  const work = await storage.createNode({ type: 'folder', title: 'Work', parent_id: null });
  const personal = await storage.createNode({ type: 'folder', title: 'Personal', parent_id: null });
  await storage.createNode({ type: 'folder', title: 'Projects', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Meeting notes 14 May', body: 'Discussed quarterly targets with the team.\n\n- Revenue on track\n- Marketing needs more spend in June\n- Two open roles to close by end of month', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Ideas for quarterly review', body: 'Focus on team wins. Highlight the product launch. Ask about morale.', parent_id: work.id });
  await storage.createNode({ type: 'note', title: 'Reading list', body: 'The Pragmatic Programmer\nStructure and Interpretation of Computer Programs', parent_id: personal.id });
  localStorage.setItem('inkwell-seeded', '1');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderList(nodes) {
  const ul = document.getElementById('node-list');
  ul.innerHTML = '';
  if (!nodes.length) {
    ul.innerHTML = '<li class="empty">No items here yet.</li>';
    return;
  }
  for (const node of nodes) {
    const li = document.createElement('li');
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
    li.appendChild(a);
    ul.appendChild(li);
  }
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function buildBreadcrumb(folderId) {
  const crumbs = [{ title: 'Inkwell', href: '/inkwell/' }];
  let id = folderId;
  const chain = [];
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

async function init() {
  await maybeeSeed();
  const params = new URLSearchParams(location.search);
  const folderId = params.get('folder') || null;
  await buildBreadcrumb(folderId);
  const nodes = await storage.getChildren(folderId);
  renderList(nodes);
}

init();

import * as storage from './storage.js';

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = '/inkwell/'; return; }

  const node = await storage.getNode(id);
  if (!node) { location.href = '/inkwell/'; return; }

  document.title = `${node.title || 'Untitled'} — Inkwell`;

  // Breadcrumb
  await buildBreadcrumb(node);

  // Render title and body as static text (Stage 3 makes them editable)
  document.getElementById('note-title').textContent = node.title || 'Untitled';
  document.getElementById('note-body').textContent = node.body || '';
}

async function buildBreadcrumb(node) {
  const crumbs = [{ title: 'Inkwell', href: '/inkwell/' }];
  const chain = [];
  let id = node.parent_id;
  while (id) {
    const parent = await storage.getNode(id);
    if (!parent) break;
    chain.unshift(parent);
    id = parent.parent_id;
  }
  for (const n of chain) {
    crumbs.push({ title: n.title, href: `/inkwell/?folder=${n.id}` });
  }
  crumbs.push({ title: node.title || 'Untitled' });

  const nav = document.getElementById('breadcrumb');
  nav.innerHTML = crumbs.map((c, i) =>
    i < crumbs.length - 1 && c.href
      ? `<span><a href="${c.href}">${escHtml(c.title)}</a></span>`
      : `<span>${escHtml(c.title || 'Untitled')}</span>`
  ).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();

import * as storage from './storage.js';

let currentNode = null;
let saveTimer = null;
const AUTOSAVE_DELAY = 800;

const titleEl = document.getElementById('note-title');
const bodyEl = document.getElementById('note-body');
const statusEl = document.getElementById('save-status');

async function save() {
  if (!currentNode) return;
  currentNode.title = titleEl.textContent.trim();
  currentNode.body = bodyEl.textContent;
  await storage.putNode(currentNode);
  document.title = `${currentNode.title || 'Untitled'} — Inkwell`;
  showStatus('Saved');
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, AUTOSAVE_DELAY);
}

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add('visible');
  clearTimeout(statusEl._hideTimer);
  statusEl._hideTimer = setTimeout(() => statusEl.classList.remove('visible'), 1500);
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

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = '/inkwell/'; return; }

  const node = await storage.getNode(id);
  if (!node) { location.href = '/inkwell/'; return; }
  currentNode = node;

  document.title = `${node.title || 'Untitled'} — Inkwell`;
  await buildBreadcrumb(node);

  titleEl.textContent = node.title || '';
  bodyEl.textContent = node.body || '';

  titleEl.addEventListener('input', scheduleSave);
  bodyEl.addEventListener('input', scheduleSave);

  // Cmd/Ctrl+S = immediate save
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      clearTimeout(saveTimer);
      save();
    }
  });
}

init();

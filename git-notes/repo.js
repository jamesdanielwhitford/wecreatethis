// Git Notes - Repo View (Folders and Files)

let repoId = null;
let currentRepo = null;
let currentFolderId = null;
let folders = [];
let files = [];

async function init() {
  await initDB();

  const params = new URLSearchParams(window.location.search);
  repoId = parseInt(params.get('id'));
  currentFolderId = parseInt(params.get('folder')) || null;

  if (!repoId) {
    window.location.href = 'index.html';
    return;
  }

  currentRepo = await getRepo(repoId);
  if (!currentRepo) {
    alert('Repo not found');
    window.location.href = 'index.html';
    return;
  }

  await loadItems();
  renderHeader();
  renderBreadcrumb();
  renderItems();

  document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
  document.getElementById('newFileBtn').addEventListener('click', createNewFile);
}

async function loadItems() {
  folders = await getFoldersByParent(repoId, currentFolderId);
  files = await getFilesByFolder(repoId, currentFolderId);
}

function renderHeader() {
  const branch = currentRepo.github?.connected ? ` (${currentRepo.github.branch})` : '';
  document.getElementById('repoName').textContent = currentRepo.name + branch;
}

function renderBreadcrumb() {
  // Build breadcrumb path
  let breadcrumb = '/';
  document.getElementById('breadcrumb').textContent = breadcrumb;
}

function renderItems() {
  const itemsList = document.getElementById('itemsList');
  const emptyState = document.getElementById('emptyState');

  if (folders.length === 0 && files.length === 0) {
    itemsList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  let html = '';

  // Render folders
  folders.forEach(folder => {
    html += `
      <a href="repo.html?id=${repoId}&folder=${folder.id}" class="item">
        <div class="item-title">
          <span class="icon">📁</span>${escapeHtml(folder.name)}
        </div>
      </a>
    `;
  });

  // Render files
  files.forEach(file => {
    html += `
      <a href="editor.html?id=${file.id}" class="item">
        <div class="item-title">
          <span class="icon">📄</span>${escapeHtml(file.name)}
        </div>
      </a>
    `;
  });

  itemsList.innerHTML = html;
}

async function createNewFolder() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;

  const folder = {
    repoId: repoId,
    parentId: currentFolderId,
    name: name.trim(),
    path: name.trim() // TODO: Build full path
  };

  await saveFolder(folder);
  await loadItems();
  renderItems();
}

async function createNewFile() {
  const name = prompt('File name (e.g., notes.md):');
  if (!name || !name.trim()) return;

  const file = {
    repoId: repoId,
    folderId: currentFolderId,
    name: name.trim(),
    path: name.trim(), // TODO: Build full path
    content: '',
    synced: false
  };

  const fileId = await saveFile(file);
  window.location.href = `editor.html?id=${fileId}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();

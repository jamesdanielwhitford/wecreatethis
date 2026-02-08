// Git Notes - Repo View (Folders and Files)

let repoId = null;
let currentRepo = null;
let currentFolderId = null;
let currentFolder = null;
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

  if (currentFolderId) {
    currentFolder = await getFolder(currentFolderId);
  }

  await loadItems();
  renderHeader();
  await renderBreadcrumb();
  renderItems();
  await checkCommitButton();

  document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
  document.getElementById('newFileBtn').addEventListener('click', createNewFile);
  document.getElementById('settingsBtn').addEventListener('click', () => {
    window.location.href = `settings.html?id=${repoId}`;
  });
  document.getElementById('commitBtn').addEventListener('click', commitChanges);
}

async function loadItems() {
  folders = await getFoldersByParent(repoId, currentFolderId);
  files = await getFilesByFolder(repoId, currentFolderId);
}

function renderHeader() {
  const branch = currentRepo.github?.connected ? ` (${currentRepo.github.branch})` : '';
  document.getElementById('repoName').textContent = currentRepo.name + branch;
}

async function renderBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  const parts = await buildBreadcrumb();

  breadcrumb.innerHTML = parts.map((part, idx) => {
    if (idx === parts.length - 1) {
      // Current location - not clickable
      return `<span>${escapeHtml(part.name)}</span>`;
    } else {
      // Parent - clickable
      const url = part.folderId ? `repo.html?id=${repoId}&folder=${part.folderId}` : `repo.html?id=${repoId}`;
      return `<a href="${url}">${escapeHtml(part.name)}</a>`;
    }
  }).join(' / ');
}

async function buildBreadcrumb() {
  const parts = [];

  // Start with root
  parts.push({ name: '/', folderId: null });

  // Build path from current folder
  if (currentFolder) {
    const folderPath = await getFullFolderPath(currentFolder);
    parts.push(...folderPath);
  }

  return parts;
}

async function getFullFolderPath(folder) {
  const path = [];
  let current = folder;

  while (current) {
    path.unshift({ name: current.name, folderId: current.id });

    if (current.parentId) {
      current = await getFolder(current.parentId);
    } else {
      current = null;
    }
  }

  return path;
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
      <div class="item-wrapper">
        <a href="repo.html?id=${repoId}&folder=${folder.id}" class="item">
          <div class="item-title">
            <span class="icon">📁</span>${escapeHtml(folder.name)}
          </div>
        </a>
        <button class="item-menu" data-type="folder" data-id="${folder.id}">⋮</button>
      </div>
    `;
  });

  // Render files
  files.forEach(file => {
    html += `
      <div class="item-wrapper">
        <a href="editor.html?id=${file.id}" class="item">
          <div class="item-title">
            <span class="icon">📄</span>${escapeHtml(file.name)}
          </div>
        </a>
        <button class="item-menu" data-type="file" data-id="${file.id}">⋮</button>
      </div>
    `;
  });

  itemsList.innerHTML = html;

  // Attach menu handlers
  document.querySelectorAll('.item-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.dataset.type;
      const id = parseInt(btn.dataset.id);
      showItemMenu(type, id);
    });
  });
}

function showItemMenu(type, id) {
  const item = type === 'folder'
    ? folders.find(f => f.id === id)
    : files.find(f => f.id === id);

  if (!item) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${escapeHtml(item.name)}</h2>
      <button id="renameItem" class="btn">Rename</button>
      <button id="deleteItem" class="btn btn-danger">Delete</button>
      <button id="cancelMenu" class="btn">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#renameItem').addEventListener('click', () => {
    modal.remove();
    renameItem(type, id);
  });

  modal.querySelector('#deleteItem').addEventListener('click', () => {
    modal.remove();
    deleteItemConfirm(type, id);
  });

  modal.querySelector('#cancelMenu').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function renameItem(type, id) {
  const item = type === 'folder'
    ? folders.find(f => f.id === id)
    : files.find(f => f.id === id);

  if (!item) return;

  const newName = prompt(`Rename ${type}:`, item.name);
  if (!newName || !newName.trim() || newName === item.name) return;

  item.name = newName.trim();

  if (type === 'folder') {
    await saveFolder(item);
  } else {
    await saveFile(item);
  }

  await loadItems();
  renderItems();
}

async function deleteItemConfirm(type, id) {
  const item = type === 'folder'
    ? folders.find(f => f.id === id)
    : files.find(f => f.id === id);

  if (!item) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Delete ${type === 'folder' ? 'Folder' : 'File'}?</h2>
      <p>Delete "${escapeHtml(item.name)}"?</p>
      <p><strong>This cannot be undone.</strong></p>
      <div class="modal-buttons">
        <button id="cancelDelete" class="btn">Cancel</button>
        <button id="confirmDelete" class="btn btn-danger">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#confirmDelete').addEventListener('click', async () => {
    if (type === 'folder') {
      await deleteFolder(id);
    } else {
      await deleteFile(id);
    }

    await loadItems();
    renderItems();
    modal.remove();
  });

  modal.querySelector('#cancelDelete').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function createNewFolder() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;

  const folder = {
    repoId: repoId,
    parentId: currentFolderId,
    name: name.trim(),
    path: await buildPath(name.trim())
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
    path: await buildPath(name.trim()),
    content: '',
    synced: false
  };

  const fileId = await saveFile(file);
  window.location.href = `editor.html?id=${fileId}`;
}

async function buildPath(name) {
  if (!currentFolder) {
    return name;
  }

  const folderPath = await getFullFolderPath(currentFolder);
  const pathParts = folderPath.map(f => f.name);
  pathParts.push(name);

  return pathParts.join('/');
}

async function checkCommitButton() {
  const commitButton = document.getElementById('commitButton');

  // Only show if connected to GitHub
  if (!currentRepo.github?.connected) {
    commitButton.classList.add('hidden');
    return;
  }

  // Check if there are unsynced files
  const allFiles = await getFilesByRepo(repoId);
  const unsyncedFiles = allFiles.filter(f => !f.synced);

  if (unsyncedFiles.length > 0) {
    commitButton.classList.remove('hidden');
  } else {
    commitButton.classList.add('hidden');
  }
}

async function commitChanges() {
  const commitBtn = document.getElementById('commitBtn');
  commitBtn.textContent = 'Syncing...';
  commitBtn.disabled = true;

  try {
    const result = await syncRepoToGitHub(repoId);

    if (result.success) {
      alert(`Successfully synced ${result.successCount} file(s) to GitHub!`);
      await checkCommitButton(); // Hide button after successful sync
    } else {
      alert(`Sync completed with errors.\nSuccess: ${result.successCount}\nFailed: ${result.errorCount}`);
    }
  } catch (error) {
    alert(`Sync failed: ${error.message}`);
  }

  commitBtn.textContent = 'Commit Changes';
  commitBtn.disabled = false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to get a single folder (not in db.js yet)
async function getFolder(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

init();

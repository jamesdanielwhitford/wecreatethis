// Git Notes - Home Page (Repos List)

let repos = [];

async function init() {
  await initDB();
  await loadRepos();
  renderRepos();

  document.getElementById('newRepoBtn').addEventListener('click', createNewRepo);
}

async function loadRepos() {
  repos = await getAllRepos();
}

function renderRepos() {
  const reposList = document.getElementById('reposList');
  const emptyState = document.getElementById('emptyState');

  if (repos.length === 0) {
    reposList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  reposList.innerHTML = repos.map(repo => {
    const branch = repo.github?.connected ? ` (${repo.github.branch})` : '';
    const connectedIcon = repo.github?.connected ? ' 🔗' : '';

    return `
      <div class="item-wrapper">
        <a href="repo.html?id=${repo.id}" class="item">
          <div class="item-title">
            <span class="icon">📁</span>${escapeHtml(repo.name)}${escapeHtml(branch)}${connectedIcon}
          </div>
          <div class="item-meta">Updated ${formatDate(repo.updatedAt)}</div>
        </a>
        <button class="item-menu" data-id="${repo.id}">⋮</button>
      </div>
    `;
  }).join('');

  // Attach menu handlers
  document.querySelectorAll('.item-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const repoId = parseInt(btn.dataset.id);
      showRepoMenu(repoId);
    });
  });
}

function showRepoMenu(repoId) {
  const repo = repos.find(r => r.id === repoId);
  if (!repo) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${escapeHtml(repo.name)}</h2>
      <button id="renameRepo" class="btn">Rename</button>
      <button id="deleteRepo" class="btn btn-danger">Delete</button>
      <button id="cancelMenu" class="btn">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#renameRepo').addEventListener('click', () => {
    modal.remove();
    renameRepo(repoId);
  });

  modal.querySelector('#deleteRepo').addEventListener('click', () => {
    modal.remove();
    deleteRepoConfirm(repoId);
  });

  modal.querySelector('#cancelMenu').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function renameRepo(repoId) {
  const repo = repos.find(r => r.id === repoId);
  if (!repo) return;

  const newName = prompt('Rename repo:', repo.name);
  if (!newName || !newName.trim() || newName === repo.name) return;

  repo.name = newName.trim();
  await saveRepo(repo);
  await loadRepos();
  renderRepos();
}

async function deleteRepoConfirm(repoId) {
  const repo = repos.find(r => r.id === repoId);
  if (!repo) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Delete Repo?</h2>
      <p>Delete "${escapeHtml(repo.name)}" and all its contents?</p>
      <p><strong>This cannot be undone.</strong></p>
      <div class="modal-buttons">
        <button id="cancelDelete" class="btn">Cancel</button>
        <button id="confirmDelete" class="btn btn-danger">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#confirmDelete').addEventListener('click', async () => {
    await deleteRepo(repoId);
    await loadRepos();
    renderRepos();
    modal.remove();
  });

  modal.querySelector('#cancelDelete').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function createNewRepo() {
  // Show modal for repo creation
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Create New Repo</h2>
      <label for="newRepoName">Repo name:</label>
      <input type="text" id="newRepoName" placeholder="my-notes" autofocus>

      <div id="githubOption" class="hidden" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border: 1px solid #ccc;">
        <label>
          <input type="checkbox" id="connectGithub">
          Connect to GitHub now
        </label>
        <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Uses cached token to connect immediately</p>
      </div>

      <div class="modal-buttons" style="margin-top: 16px;">
        <button id="cancelCreate" class="btn">Cancel</button>
        <button id="confirmCreate" class="btn btn-primary">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Check if token is cached
  const cachedToken = localStorage.getItem('github_token');
  if (cachedToken) {
    document.getElementById('githubOption').classList.remove('hidden');
  }

  // Handle create
  modal.querySelector('#confirmCreate').addEventListener('click', async () => {
    const name = document.getElementById('newRepoName').value.trim();

    if (!name) {
      alert('Please enter a repo name');
      return;
    }

    const connectGithub = document.getElementById('connectGithub')?.checked;

    const newRepo = {
      name: name,
      github: { connected: false }
    };

    const repoId = await saveRepo(newRepo);
    await loadRepos();
    renderRepos();
    modal.remove();

    // If connect to GitHub is checked, open settings
    if (connectGithub && repoId) {
      window.location.href = `settings.html?id=${repoId}`;
    }
  });

  // Handle cancel
  modal.querySelector('#cancelCreate').addEventListener('click', () => {
    modal.remove();
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Enter key to create
  document.getElementById('newRepoName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#confirmCreate').click();
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

init();

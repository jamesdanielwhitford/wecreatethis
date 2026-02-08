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
      <a href="repo.html?id=${repo.id}" class="item">
        <div class="item-title">
          <span class="icon">📁</span>${escapeHtml(repo.name)}${escapeHtml(branch)}${connectedIcon}
        </div>
        <div class="item-meta">Updated ${formatDate(repo.updatedAt)}</div>
      </a>
    `;
  }).join('');
}

async function createNewRepo() {
  const name = prompt('Repo name:');
  if (!name || !name.trim()) return;

  const newRepo = {
    name: name.trim(),
    github: { connected: false }
  };

  await saveRepo(newRepo);
  await loadRepos();
  renderRepos();
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

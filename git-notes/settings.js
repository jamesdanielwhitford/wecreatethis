// Git Notes - Repository Settings (GitHub Connection)

let repoId = null;
let currentRepo = null;
let currentToken = null;
let availableRepos = [];

async function init() {
  await initDB();

  const params = new URLSearchParams(window.location.search);
  repoId = parseInt(params.get('id'));

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

  document.getElementById('repoName').textContent = currentRepo.name;

  // Set up back button
  document.getElementById('backBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `repo.html?id=${repoId}`;
  });

  // Show appropriate section
  if (currentRepo.github?.connected) {
    showConnected();
  } else {
    showNotConnected();
    // Load cached token if available
    loadCachedToken();
  }

  // Event listeners
  document.getElementById('testTokenBtn').addEventListener('click', verifyToken);
  document.getElementById('clearTokenBtn').addEventListener('click', clearCachedToken);
  document.getElementById('connectBtn').addEventListener('click', connectToGitHub);
  document.getElementById('disconnectBtn').addEventListener('click', disconnectFromGitHub);
  document.getElementById('pullBtn')?.addEventListener('click', manualPullFromGitHub);
  document.getElementById('repoSelect').addEventListener('change', loadBranches);
  document.getElementById('repoSearch').addEventListener('input', filterRepos);
  document.getElementById('branchSearch').addEventListener('input', filterBranches);
}

function clearCachedToken() {
  localStorage.removeItem('github_token');
  document.getElementById('tokenInput').value = '';
  document.getElementById('tokenInput').type = 'password';
  document.getElementById('tokenStatus').classList.add('hidden');
  document.getElementById('repoSelection').classList.add('hidden');

  // Clear all state
  currentToken = null;
  availableRepos = [];
  availableBranches = [];
  document.getElementById('repoSearch').value = '';
  document.getElementById('branchSearch').value = '';

  alert('Cached token cleared');
}

function loadCachedToken() {
  const cachedToken = localStorage.getItem('github_token');
  if (cachedToken) {
    document.getElementById('tokenInput').value = cachedToken;
    document.getElementById('tokenInput').type = 'text';

    // Show hint that token is cached
    const statusDiv = document.getElementById('tokenStatus');
    statusDiv.textContent = 'ℹ Using cached token - click Verify Token to continue';
    statusDiv.classList.remove('hidden');
  }
}

function showNotConnected() {
  document.getElementById('notConnected').classList.remove('hidden');
  document.getElementById('connected').classList.add('hidden');
}

function showConnected() {
  document.getElementById('connected').classList.remove('hidden');
  document.getElementById('notConnected').classList.add('hidden');

  const { owner, repo, branch, lastSync } = currentRepo.github;

  document.getElementById('connectedRepo').textContent = `${owner}/${repo}`;
  document.getElementById('connectedBranch').textContent = branch;
  document.getElementById('lastSync').textContent = lastSync
    ? new Date(lastSync).toLocaleString()
    : 'Never';
}

async function verifyToken() {
  const token = document.getElementById('tokenInput').value.trim();
  const testBtn = document.getElementById('testTokenBtn');

  if (!token) {
    alert('Please enter a GitHub token');
    return;
  }

  // Disable button during verification
  testBtn.disabled = true;
  testBtn.textContent = 'Verifying...';

  const statusDiv = document.getElementById('tokenStatus');
  statusDiv.textContent = 'Verifying token...';
  statusDiv.classList.remove('hidden');

  const result = await testGitHubToken(token);

  // Re-enable button
  testBtn.disabled = false;
  testBtn.textContent = 'Verify Token';

  if (result.success) {
    currentToken = token;
    statusDiv.textContent = `✓ Verified as ${result.username}`;

    // Cache token in localStorage for reuse
    localStorage.setItem('github_token', token);

    // Load repositories
    statusDiv.textContent = `✓ Verified as ${result.username} - Loading repositories...`;
    await loadRepositories();
  } else {
    statusDiv.textContent = `✗ ${result.error}`;
    currentToken = null;
    // Clear cached token if verification fails
    localStorage.removeItem('github_token');
  }
}

async function loadRepositories() {
  const repos = await listGitHubRepos(currentToken);
  availableRepos = repos;

  // Reset branch state when loading new repo list
  availableBranches = [];
  document.getElementById('branchSearch').value = '';
  renderBranchList([]);

  renderRepoList(repos);
  document.getElementById('repoSelection').classList.remove('hidden');
}

function renderRepoList(repos) {
  const select = document.getElementById('repoSelect');
  select.innerHTML = '';

  if (repos.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- No repositories found --';
    select.appendChild(option);
    return;
  }

  repos.forEach(repo => {
    const option = document.createElement('option');
    option.value = JSON.stringify({ owner: repo.owner, name: repo.name });
    option.textContent = repo.fullName;
    option.dataset.fullName = repo.fullName.toLowerCase();
    select.appendChild(option);
  });
}

function filterRepos() {
  const searchTerm = document.getElementById('repoSearch').value.toLowerCase();

  if (!searchTerm) {
    renderRepoList(availableRepos);
    return;
  }

  const filtered = availableRepos.filter(repo =>
    repo.fullName.toLowerCase().includes(searchTerm) ||
    repo.name.toLowerCase().includes(searchTerm)
  );

  renderRepoList(filtered);
}

let availableBranches = [];

async function loadBranches() {
  const repoSelect = document.getElementById('repoSelect');
  const selectedValue = repoSelect.value;

  // Clear branch search box first
  document.getElementById('branchSearch').value = '';

  if (!selectedValue) {
    availableBranches = [];
    renderBranchList([]);
    return;
  }

  const { owner, name } = JSON.parse(selectedValue);

  // Show loading state
  renderBranchList([{ name: 'Loading branches...', value: '' }]);

  const branches = await listGitHubBranches(owner, name, currentToken);
  availableBranches = branches;

  renderBranchList(branches);
}

function renderBranchList(branches) {
  const branchSelect = document.getElementById('branchSelect');
  branchSelect.innerHTML = '';

  if (branches.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- No branches found --';
    branchSelect.appendChild(option);
    return;
  }

  // Handle loading state (when branch is an object)
  if (branches[0].name) {
    branches.forEach(branch => {
      const option = document.createElement('option');
      option.value = branch.value || '';
      option.textContent = branch.name;
      branchSelect.appendChild(option);
    });
    return;
  }

  // Normal branch rendering (when branch is a string)
  branches.forEach(branch => {
    const option = document.createElement('option');
    option.value = branch;
    option.textContent = branch;
    option.dataset.branchName = branch.toLowerCase();
    branchSelect.appendChild(option);
  });
}

function filterBranches() {
  const searchTerm = document.getElementById('branchSearch').value.toLowerCase().trim();

  // If no branches loaded yet, don't filter
  if (availableBranches.length === 0) {
    return;
  }

  if (!searchTerm) {
    renderBranchList(availableBranches);
    return;
  }

  const filtered = availableBranches.filter(branch =>
    branch.toLowerCase().includes(searchTerm)
  );

  renderBranchList(filtered);
}

async function connectToGitHub() {
  const repoSelect = document.getElementById('repoSelect');
  const branchSelect = document.getElementById('branchSelect');
  const connectBtn = document.getElementById('connectBtn');
  const statusDiv = document.getElementById('tokenStatus');

  const selectedRepo = repoSelect.value;
  const selectedBranch = branchSelect.value;

  if (!selectedRepo || !selectedBranch) {
    alert('Please select a repository and branch');
    return;
  }

  // Disable button and show loading
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';
  statusDiv.textContent = 'Connecting to GitHub...';
  statusDiv.classList.remove('hidden');

  const { owner, name } = JSON.parse(selectedRepo);

  // Update repo with GitHub info
  currentRepo.github = {
    connected: true,
    owner: owner,
    repo: name,
    branch: selectedBranch,
    token: currentToken,
    lastSync: null
  };

  await saveRepo(currentRepo);

  // Check if GitNotes/ folder exists and pull files
  statusDiv.textContent = 'Checking for existing files on GitHub...';

  const pullResult = await pullFromGitHub(repoId);

  if (pullResult.success && (pullResult.fileCount > 0 || pullResult.folderCount > 0)) {
    statusDiv.textContent = `✓ Synced ${pullResult.fileCount} file(s) and ${pullResult.folderCount} folder(s) from GitHub`;
    setTimeout(() => {
      alert(`Connected to GitHub!\n\nImported from GitHub:\n- ${pullResult.fileCount} file(s)\n- ${pullResult.folderCount} folder(s)`);
      showConnected();
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect';
    }, 500);
  } else {
    statusDiv.textContent = '✓ Connected (no existing files found)';
    setTimeout(() => {
      alert('Connected to GitHub!');
      showConnected();
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect';
    }, 500);
  }
}

async function manualPullFromGitHub() {
  if (!confirm('Pull files from GitHub?\n\nThis will download all files from the GitNotes/ folder on GitHub and add them to your local repo.\n\nExisting files with the same path will NOT be overwritten.')) {
    return;
  }

  const pullBtn = document.getElementById('pullBtn');
  const statusDiv = document.getElementById('pullStatus');

  // Disable button and show loading
  pullBtn.disabled = true;
  pullBtn.textContent = 'Pulling...';
  statusDiv.textContent = 'Pulling from GitHub...';
  statusDiv.classList.remove('hidden');

  const result = await pullFromGitHub(repoId);

  // Re-enable button
  pullBtn.disabled = false;
  pullBtn.textContent = 'Pull from GitHub';

  if (result.success) {
    if (result.fileCount > 0 || result.folderCount > 0) {
      statusDiv.textContent = `✓ Imported ${result.fileCount} file(s) and ${result.folderCount} folder(s)`;

      // Update lastSync display
      currentRepo = await getRepo(repoId);
      showConnected();
    } else {
      statusDiv.textContent = 'No new files found on GitHub';
    }

    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);
  } else {
    statusDiv.textContent = `✗ Error: ${result.error}`;
  }
}

async function disconnectFromGitHub() {
  const shouldClearToken = confirm('Disconnect from GitHub?\n\nClick OK to disconnect and keep token cached.\nClick Cancel to also clear the cached token.');

  currentRepo.github = {
    connected: false
  };

  await saveRepo(currentRepo);

  // If user clicked Cancel (false), clear the cached token
  if (!shouldClearToken) {
    localStorage.removeItem('github_token');
  }

  alert('Disconnected from GitHub');
  showNotConnected();

  // Clear form and state
  document.getElementById('tokenInput').value = '';
  document.getElementById('tokenStatus').classList.add('hidden');
  document.getElementById('repoSelection').classList.add('hidden');
  document.getElementById('repoSearch').value = '';
  document.getElementById('branchSearch').value = '';

  // Clear state variables
  currentToken = null;
  availableRepos = [];
  availableBranches = [];

  // Reload cached token if it still exists
  loadCachedToken();
}

init();

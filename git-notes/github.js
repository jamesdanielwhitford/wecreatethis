// GitHub API Integration for Git Notes

const GITHUB_API_BASE = 'https://api.github.com';

// Test GitHub token and get user info
async function testGitHubToken(token) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const user = await response.json();
    return {
      success: true,
      username: user.login,
      name: user.name
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// List user's repositories
async function listGitHubRepos(token) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    const repos = await response.json();
    return repos.map(repo => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch
    }));
  } catch (error) {
    console.error('Error listing repos:', error);
    return [];
  }
}

// List branches for a repository
async function listGitHubBranches(owner, repo, token) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }

    const branches = await response.json();
    return branches.map(branch => branch.name);
  } catch (error) {
    console.error('Error listing branches:', error);
    return [];
  }
}

// Get file content from GitHub
async function getGitHubFile(owner, repo, branch, path, token) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File doesn't exist
      }
      throw new Error('Failed to fetch file');
    }

    const data = await response.json();

    // Decode base64 content (UTF-8 safe)
    const content = decodeURIComponent(escape(atob(data.content)));

    return {
      content: content,
      sha: data.sha
    };
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

// UTF-8 safe base64 encoding
function utf8ToBase64(str) {
  // Convert string to UTF-8 bytes, then to base64
  return btoa(unescape(encodeURIComponent(str)));
}

// Create or update file on GitHub
async function updateGitHubFile(owner, repo, branch, path, content, message, token, sha = null) {
  try {
    const body = {
      message: message,
      content: utf8ToBase64(content), // UTF-8 safe base64 encode
      branch: branch
    };

    // If file exists, include SHA for update
    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update file');
    }

    const result = await response.json();
    return {
      success: true,
      sha: result.content.sha
    };
  } catch (error) {
    console.error('Error updating file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Delete file from GitHub
async function deleteGitHubFile(owner, repo, branch, path, message, token, sha) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          sha: sha,
          branch: branch
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Sync all files in a repo to GitHub
async function syncRepoToGitHub(repoId) {
  const repo = await getRepo(repoId);

  if (!repo.github?.connected) {
    return {
      success: false,
      error: 'Repo not connected to GitHub'
    };
  }

  const { owner, repo: repoName, branch, token } = repo.github;

  // Get all files that need syncing
  const files = await getFilesByRepo(repoId);
  const unsyncedFiles = files.filter(f => !f.synced);

  if (unsyncedFiles.length === 0) {
    return {
      success: true,
      message: 'No changes to sync'
    };
  }

  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  let successCount = 0;
  let errorCount = 0;

  for (const file of unsyncedFiles) {
    const gitHubPath = `git-notes/${file.path}`;
    const message = `Update from Git Notes - ${timestamp}`;

    // Get existing file SHA if it exists (needed for GitHub API)
    const existing = await getGitHubFile(owner, repoName, branch, gitHubPath, token);

    // Always push local version (overwrites GitHub)
    const result = await updateGitHubFile(
      owner,
      repoName,
      branch,
      gitHubPath,
      file.content,
      message,
      token,
      existing?.sha
    );

    if (result.success) {
      // Mark file as synced
      file.synced = true;
      await saveFile(file);
      successCount++;
    } else {
      errorCount++;
      console.error(`Failed to sync ${file.name}:`, result.error);
    }
  }

  // Update repo's lastSync
  repo.github.lastSync = new Date().toISOString();
  await saveRepo(repo);

  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    total: unsyncedFiles.length
  };
}

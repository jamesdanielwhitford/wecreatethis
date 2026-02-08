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

// Get directory tree from GitHub recursively
async function getGitHubTree(owner, repo, branch, path, token) {
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
        return null; // Path doesn't exist
      }
      throw new Error('Failed to fetch directory');
    }

    const items = await response.json();

    // If it's a single file (not an array), return null
    if (!Array.isArray(items)) {
      return null;
    }

    return items;
  } catch (error) {
    console.error('Error getting GitHub tree:', error);
    return null;
  }
}

// Pull all files from GitHub GitNotes/ folder into local repo
async function pullFromGitHub(repoId) {
  const repo = await getRepo(repoId);

  if (!repo.github?.connected) {
    return {
      success: false,
      error: 'Repo not connected to GitHub'
    };
  }

  const { owner, repo: repoName, branch, token } = repo.github;

  // Check if GitNotes/ folder exists
  const rootItems = await getGitHubTree(owner, repoName, branch, 'GitNotes', token);

  if (!rootItems) {
    return {
      success: true,
      message: 'No GitNotes folder on GitHub',
      fileCount: 0,
      folderCount: 0
    };
  }

  // Get existing files and folders to check for duplicates
  const existingFiles = await getFilesByRepo(repoId);
  const existingFolders = await getFoldersByRepo(repoId);

  const existingFilePaths = new Set(existingFiles.map(f => f.path));
  const existingFolderPaths = new Set(existingFolders.map(f => f.path));

  let fileCount = 0;
  let folderCount = 0;

  // Recursively process directories
  async function processDirectory(items, parentPath = '', parentFolderId = null) {
    for (const item of items) {
      if (item.type === 'dir') {
        const folderPath = parentPath ? `${parentPath}/${item.name}` : item.name;

        // Skip if folder already exists
        if (existingFolderPaths.has(folderPath)) {
          // Find existing folder ID for processing children
          const existingFolder = existingFolders.find(f => f.path === folderPath);
          if (existingFolder) {
            // Still process children, but use existing folder ID
            const subItems = await getGitHubTree(owner, repoName, branch, `GitNotes/${folderPath}`, token);
            if (subItems) {
              await processDirectory(subItems, folderPath, existingFolder.id);
            }
          }
          continue;
        }

        // Create new folder in IndexedDB
        const folder = {
          repoId: repoId,
          parentId: parentFolderId,
          name: item.name,
          path: folderPath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const request = await saveFolder(folder);

        // Get the saved folder with its ID
        const savedFolder = await new Promise((resolve) => {
          const transaction = db.transaction(['folders'], 'readonly');
          const store = transaction.objectStore('folders');
          const getRequest = store.get(request);
          getRequest.onsuccess = () => resolve(getRequest.result);
        });

        folderCount++;

        // Get contents of this directory
        const subItems = await getGitHubTree(owner, repoName, branch, `git-notes/${folderPath}`, token);
        if (subItems) {
          await processDirectory(subItems, folderPath, savedFolder.id);
        }

      } else if (item.type === 'file') {
        const filePath = parentPath ? `${parentPath}/${item.name}` : item.name;

        // Skip if file already exists (don't overwrite local changes)
        if (existingFilePaths.has(filePath)) {
          continue;
        }

        // Download file content
        const fileData = await getGitHubFile(owner, repoName, branch, `GitNotes/${filePath}`, token);

        if (fileData) {
          const file = {
            repoId: repoId,
            folderId: parentFolderId,
            name: item.name,
            path: filePath,
            content: fileData.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: true // Mark as synced since it came from GitHub
          };

          await saveFile(file);
          fileCount++;
        }
      }
    }
  }

  await processDirectory(rootItems);

  // Update repo's lastSync
  repo.github.lastSync = new Date().toISOString();
  await saveRepo(repo);

  return {
    success: true,
    fileCount,
    folderCount
  };
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

  // Get pending deletions
  const deletions = JSON.parse(localStorage.getItem(`pending_deletions_${repoId}`) || '[]');

  if (unsyncedFiles.length === 0 && deletions.length === 0) {
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

  // Handle deletions first
  for (const filePath of deletions) {
    const gitHubPath = `GitNotes/${filePath}`;
    const message = `Delete from Git Notes - ${timestamp}`;

    // Get existing file SHA (required for deletion)
    const existing = await getGitHubFile(owner, repoName, branch, gitHubPath, token);

    if (existing) {
      const result = await deleteGitHubFile(
        owner,
        repoName,
        branch,
        gitHubPath,
        message,
        token,
        existing.sha
      );

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to delete ${filePath}:`, result.error);
      }
    } else {
      // File doesn't exist on GitHub, just remove from pending deletions
      successCount++;
    }
  }

  // Clear pending deletions after processing
  if (deletions.length > 0) {
    localStorage.removeItem(`pending_deletions_${repoId}`);
  }

  // Handle file updates/creates
  for (const file of unsyncedFiles) {
    const gitHubPath = `GitNotes/${file.path}`;
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
    total: unsyncedFiles.length + deletions.length
  };
}

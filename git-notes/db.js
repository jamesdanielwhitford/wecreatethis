// IndexedDB wrapper for Git Notes
// Manages repos, folders, and files

const DB_NAME = 'git-notes-db';
const DB_VERSION = 1;

let db = null;

// Initialize database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Repos object store
      if (!db.objectStoreNames.contains('repos')) {
        const repoStore = db.createObjectStore('repos', {
          keyPath: 'id',
          autoIncrement: true
        });
        repoStore.createIndex('name', 'name', { unique: false });
        repoStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Folders object store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', {
          keyPath: 'id',
          autoIncrement: true
        });
        folderStore.createIndex('repoId', 'repoId', { unique: false });
        folderStore.createIndex('parentId', 'parentId', { unique: false });
        folderStore.createIndex('path', 'path', { unique: false });
      }

      // Files object store
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', {
          keyPath: 'id',
          autoIncrement: true
        });
        fileStore.createIndex('repoId', 'repoId', { unique: false });
        fileStore.createIndex('folderId', 'folderId', { unique: false });
        fileStore.createIndex('path', 'path', { unique: false });
        fileStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

// ===== REPOS =====

function getAllRepos() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['repos'], 'readonly');
    const store = transaction.objectStore('repos');
    const request = store.getAll();

    request.onsuccess = () => {
      const repos = request.result;
      repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      resolve(repos);
    };
    request.onerror = () => reject(request.error);
  });
}

function getRepo(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['repos'], 'readonly');
    const store = transaction.objectStore('repos');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveRepo(repo) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['repos'], 'readwrite');
    const store = transaction.objectStore('repos');

    repo.updatedAt = new Date().toISOString();
    if (!repo.createdAt) {
      repo.createdAt = repo.updatedAt;
    }
    if (!repo.github) {
      repo.github = { connected: false };
    }

    const request = store.put(repo);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteRepo(id) {
  return new Promise(async (resolve, reject) => {
    try {
      // Delete all folders in repo
      const folders = await getFoldersByRepo(id);
      for (const folder of folders) {
        await deleteFolder(folder.id);
      }

      // Delete all files in repo
      const files = await getFilesByRepo(id);
      for (const file of files) {
        await deleteFile(file.id);
      }

      // Delete repo
      const transaction = db.transaction(['repos'], 'readwrite');
      const store = transaction.objectStore('repos');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// ===== FOLDERS =====

function getFoldersByRepo(repoId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const index = store.index('repoId');
    const request = index.getAll(repoId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFolder(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFoldersByParent(repoId, parentId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.getAll();

    request.onsuccess = () => {
      const folders = request.result.filter(
        f => f.repoId === repoId && f.parentId === parentId
      );
      folders.sort((a, b) => a.name.localeCompare(b.name));
      resolve(folders);
    };
    request.onerror = () => reject(request.error);
  });
}

function saveFolder(folder) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readwrite');
    const store = transaction.objectStore('folders');

    folder.updatedAt = new Date().toISOString();
    if (!folder.createdAt) {
      folder.createdAt = folder.updatedAt;
    }

    const request = store.put(folder);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFolder(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders'], 'readwrite');
    const store = transaction.objectStore('folders');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===== FILES =====

function getFilesByRepo(repoId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const index = store.index('repoId');
    const request = index.getAll(repoId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFilesByFolder(repoId, folderId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.getAll();

    request.onsuccess = () => {
      const files = request.result.filter(
        f => f.repoId === repoId && f.folderId === folderId
      );
      files.sort((a, b) => a.name.localeCompare(b.name));
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
}

function getFile(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveFile(file) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');

    file.updatedAt = new Date().toISOString();
    if (!file.createdAt) {
      file.createdAt = file.updatedAt;
    }
    if (file.synced === undefined) {
      file.synced = false;
    }

    const request = store.put(file);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFile(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

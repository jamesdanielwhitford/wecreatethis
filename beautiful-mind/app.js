// ============================================
// Grain Effect (E-Reader Theme)
// ============================================
const grainCanvas = document.getElementById('grain');
const grainCtx = grainCanvas.getContext('2d');
const GRAIN_INTENSITY = 12;

function isDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function generateGrain() {
  // Use clientWidth/Height to avoid scrollbar issues
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;

  grainCanvas.width = width;
  grainCanvas.height = height;

  const imageData = grainCtx.createImageData(width, height);
  const data = imageData.data;

  // Base colors for light and dark mode
  let baseR, baseG, baseB;
  if (isDarkMode()) {
    baseR = 26;
    baseG = 26;
    baseB = 26;
  } else {
    baseR = 232;
    baseG = 230;
    baseB = 224;
  }

  for (let i = 0; i < data.length; i += 4) {
    // Create subtle color variations to mimic paper texture
    const variation = (Math.random() - 0.5) * GRAIN_INTENSITY;

    // Add slight warm/cool color shifts for more realistic paper feel
    const warmShift = (Math.random() - 0.5) * (GRAIN_INTENSITY * 0.3);

    data[i] = Math.max(0, Math.min(255, baseR + variation + warmShift)); // R
    data[i + 1] = Math.max(0, Math.min(255, baseG + variation)); // G
    data[i + 2] = Math.max(0, Math.min(255, baseB + variation - warmShift * 0.5)); // B
    data[i + 3] = 255; // A
  }

  grainCtx.putImageData(imageData, 0, 0);
}

// Generate grain on load
generateGrain();

// Regenerate on resize
window.addEventListener('resize', generateGrain);

// Regenerate on theme change
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', generateGrain);

// ============================================
// Storage Mode Detection
// ============================================
const USE_FILESYSTEM = 'showDirectoryPicker' in window;

// ============================================
// State
// ============================================
const state = {
  dirHandle: null,
  notes: [],
  currentNote: null,
  expandedFolders: new Set(['']),
  storageReady: false,
};

// File type mappings
const FILE_TYPES = {
  text: ['.md', '.txt'],
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  video: ['.mp4', '.webm', '.mov'],
  audio: ['.mp3', '.m4a', '.webm', '.wav', '.ogg'],
};

// ============================================
// IndexedDB Setup
// ============================================
let db = null;

function openDB() {
  // Return existing connection if already open
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notes-app', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      // Store for file system handles (desktop)
      if (!database.objectStoreNames.contains('handles')) {
        database.createObjectStore('handles');
      }
      // Store for notes (mobile fallback)
      if (!database.objectStoreNames.contains('notes')) {
        const notesStore = database.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('folder', 'folder', { unique: false });
      }
    };
  });
}

// ============================================
// File System Storage (Desktop)
// ============================================
const fsStorage = {
  async init() {
    await openDB();
    const handle = await this.loadHandle();
    if (handle) {
      // Try to verify permission without prompting (silent check)
      try {
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          state.dirHandle = handle;
          return true;
        }
      } catch (e) {
        // Handle doesn't exist or is invalid
      }
    }
    return false;
  },

  async selectFolder() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await this.saveHandle(handle);
      state.dirHandle = handle;
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
      return false;
    }
  },

  async saveHandle(handle) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'rootDir');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async loadHandle() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readonly');
      const request = tx.objectStore('handles').get('rootDir');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async requestPermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  },

  async getAllNotes() {
    return await scanDirectory(state.dirHandle);
  },

  async saveTextNote(folder, filename, content, meta) {
    const targetFolder = await getOrCreateFolder(state.dirHandle, folder);
    const fileContent = createFrontmatter(meta) + content;
    await writeTextFile(targetFolder, filename, fileContent);
  },

  async saveBinaryNote(folder, filename, blob, meta) {
    const targetFolder = await getOrCreateFolder(state.dirHandle, folder);
    await writeBinaryFile(targetFolder, filename, blob);
    await writeMetadataFS(targetFolder, filename, meta);
  },

  async readNote(note) {
    if (note.type === 'text') {
      const text = await readTextFileFS(note.handle);
      return { text, meta: parseFrontmatter(text).meta };
    } else {
      const url = await readBinaryFileFS(note.handle);
      const meta = await readMetadataFS(note.metaHandle);
      return { url, meta };
    }
  },

  async deleteNote(note) {
    const folderHandle = await getFolderHandle(state.dirHandle, note.folder);
    await folderHandle.removeEntry(note.name);
    if (note.metaHandle) {
      await folderHandle.removeEntry(`${note.name}.meta.json`);
    }
  },

  async deleteFolder(folderPath) {
    const parts = folderPath.split('/').filter(Boolean);
    const folderName = parts.pop();
    const parentPath = parts.join('/');
    const parentHandle = parentPath
      ? await getFolderHandle(state.dirHandle, parentPath)
      : state.dirHandle;
    await parentHandle.removeEntry(folderName, { recursive: true });
  },

  async updateMeta(note, meta) {
    const folderHandle = await getFolderHandle(state.dirHandle, note.folder);
    await writeMetadataFS(folderHandle, note.name, meta);
  },

  async exportAll() {
    const notes = await this.getAllNotes();
    const exportData = [];

    for (const note of notes) {
      const data = await this.readNote(note);
      const exportNote = {
        id: note.id,
        name: note.name,
        folder: note.folder,
        type: note.type,
      };

      if (note.type === 'text') {
        exportNote.content = data.text;
      } else {
        // Convert blob to base64
        const file = await note.handle.getFile();
        exportNote.data = await blobToBase64(file);
        exportNote.meta = data.meta;
      }

      exportData.push(exportNote);
    }

    return exportData;
  },

  async importAll(exportData) {
    for (const note of exportData) {
      if (note.type === 'text') {
        const parsed = parseFrontmatter(note.content);
        await this.saveTextNote(note.folder, note.name, parsed.content, parsed.meta);
      } else {
        const blob = await base64ToBlob(note.data);
        await this.saveBinaryNote(note.folder, note.name, blob, note.meta || {});
      }
    }
  },

  getStorageName() {
    return state.dirHandle?.name || 'Not set';
  }
};

// File System Helper Functions
async function scanDirectory(dirHandle, path = '') {
  const notes = [];
  const metaFiles = new Map();

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.meta.json')) {
      metaFiles.set(entry.name.replace('.meta.json', ''), entry);
    }
  }

  for await (const entry of dirHandle.values()) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      const subDir = await dirHandle.getDirectoryHandle(entry.name);
      notes.push(...await scanDirectory(subDir, fullPath));
    } else if (entry.kind === 'file' && !entry.name.endsWith('.meta.json')) {
      const type = getFileType(entry.name);
      if (type) {
        notes.push({
          id: fullPath,
          name: entry.name,
          path: fullPath,
          folder: path,
          type,
          handle: entry,
          metaHandle: metaFiles.get(entry.name) || null,
        });
      }
    }
  }
  return notes;
}

async function readTextFileFS(fileHandle) {
  const file = await fileHandle.getFile();
  return await file.text();
}

async function readBinaryFileFS(fileHandle) {
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}

async function writeTextFile(dirHandle, filename, content) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function writeBinaryFile(dirHandle, filename, blob) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readMetadataFS(metaHandle) {
  if (!metaHandle) return {};
  try {
    const text = await readTextFileFS(metaHandle);
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function writeMetadataFS(dirHandle, filename, meta) {
  await writeTextFile(dirHandle, `${filename}.meta.json`, JSON.stringify(meta, null, 2));
}

async function getOrCreateFolder(rootHandle, folderPath) {
  if (!folderPath) return rootHandle;
  let current = rootHandle;
  for (const part of folderPath.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

async function getFolderHandle(rootHandle, folderPath) {
  if (!folderPath) return rootHandle;
  let current = rootHandle;
  for (const part of folderPath.split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(part);
  }
  return current;
}

// ============================================
// IndexedDB Storage (Mobile Fallback)
// ============================================
const idbStorage = {
  async init() {
    await openDB();
    state.storageReady = true;
    return true;
  },

  async selectFolder() {
    // No folder selection needed for IndexedDB
    return true;
  },

  async getAllNotes() {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const request = tx.objectStore('notes').getAll();
      request.onsuccess = () => {
        const notes = request.result.map(note => ({
          ...note,
          path: note.id,
        }));
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveTextNote(folder, filename, content, meta) {
    const id = folder ? `${folder}/${filename}` : filename;
    const note = {
      id,
      name: filename,
      folder: folder || '',
      type: 'text',
      content,
      meta,
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this._saveNote(note);
  },

  async saveBinaryNote(folder, filename, blob, meta) {
    const id = folder ? `${folder}/${filename}` : filename;
    const type = getFileType(filename);
    // Convert blob to ArrayBuffer for better iOS Safari compatibility
    const arrayBuffer = await blob.arrayBuffer();
    const note = {
      id,
      name: filename,
      folder: folder || '',
      type,
      data: arrayBuffer,
      mimeType: blob.type || 'application/octet-stream',
      meta,
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this._saveNote(note);
  },

  async _saveNote(note) {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const request = tx.objectStore('notes').put(note);
      request.onerror = (e) => reject(new Error('Failed to save note: ' + (e.target.error?.message || 'Unknown error')));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error('Transaction failed: ' + (e.target.error?.message || 'Unknown error')));
    });
  },

  async readNote(note) {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const request = tx.objectStore('notes').get(note.id);
      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          reject(new Error('Note not found'));
          return;
        }
        if (data.type === 'text') {
          resolve({ text: data.content, meta: data.meta || {} });
        } else {
          // Handle both old (blob) and new (data/mimeType) formats
          let blob;
          if (data.data instanceof ArrayBuffer) {
            blob = new Blob([data.data], { type: data.mimeType || 'application/octet-stream' });
          } else if (data.blob) {
            blob = data.blob;
          } else {
            reject(new Error('Invalid note data'));
            return;
          }
          const url = URL.createObjectURL(blob);
          resolve({ url, meta: data.meta || {} });
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteNote(note) {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').delete(note.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteFolder(folderPath) {
    await openDB(); // Ensure DB is ready
    const notes = await this.getAllNotes();
    const toDelete = notes.filter(n =>
      n.folder === folderPath || n.folder.startsWith(folderPath + '/')
    );

    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      toDelete.forEach(note => store.delete(note.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async updateMeta(note, meta) {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.get(note.id);
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.meta = meta;
          data.updatedAt = new Date().toISOString();
          store.put(data);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async exportAll() {
    await openDB(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const request = tx.objectStore('notes').getAll();
      request.onsuccess = async () => {
        const notes = request.result;
        const exportData = [];

        for (const note of notes) {
          const exportNote = {
            id: note.id,
            name: note.name,
            folder: note.folder,
            type: note.type,
          };

          if (note.type === 'text') {
            exportNote.content = createFrontmatter(note.meta || {}) + note.content;
          } else {
            // Handle both old (blob) and new (data/mimeType) formats
            let blob;
            if (note.data instanceof ArrayBuffer) {
              blob = new Blob([note.data], { type: note.mimeType || 'application/octet-stream' });
            } else if (note.blob) {
              blob = note.blob;
            }
            if (blob) {
              exportNote.data = await blobToBase64(blob);
            }
            exportNote.meta = note.meta;
          }

          exportData.push(exportNote);
        }

        resolve(exportData);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async importAll(exportData) {
    for (const note of exportData) {
      if (note.type === 'text') {
        const parsed = parseFrontmatter(note.content);
        await this.saveTextNote(note.folder, note.name, parsed.content, parsed.meta);
      } else {
        const blob = await base64ToBlob(note.data);
        await this.saveBinaryNote(note.folder, note.name, blob, note.meta || {});
      }
    }
  },

  getStorageName() {
    return 'Browser Storage';
  }
};

// ============================================
// Storage Abstraction
// ============================================
const storage = USE_FILESYSTEM ? fsStorage : idbStorage;

function getFileType(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return null;
}

// ============================================
// Frontmatter & Metadata
// ============================================
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: text };

  const meta = {};
  match[1].split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      if (key.trim() === 'tags') {
        value = value.split(',').map((t) => t.trim()).filter(Boolean);
      }
      meta[key.trim()] = value;
    }
  });

  return { meta, content: match[2] };
}

function createFrontmatter(meta) {
  const lines = ['---'];
  if (meta.title) lines.push(`title: ${meta.title}`);
  if (meta.tags?.length) lines.push(`tags: ${meta.tags.join(', ')}`);
  if (meta.description) lines.push(`description: ${meta.description}`);
  if (meta.createdAt) lines.push(`createdAt: ${meta.createdAt}`);
  lines.push('---\n');
  return lines.join('\n');
}


// ============================================
// Router
// ============================================
function navigate(hash) {
  window.location.hash = hash;
}

async function router() {
  const hash = window.location.hash || '#/';
  const app = document.getElementById('app');

  // Always ensure storage is initialized
  await storage.init();

  if (hash === '#/' || hash === '#/notes' || hash === '') {
    renderNavigation(app);
  } else if (hash.startsWith('#/view/')) {
    const path = decodeURIComponent(hash.slice(7));
    renderViewNote(app, path);
  } else if (hash.startsWith('#/new')) {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const type = params.get('type') || 'text';
    renderAddNote(app, type);
  } else if (hash.startsWith('#/edit/')) {
    const path = decodeURIComponent(hash.slice(7));
    renderEditNote(app, path);
  } else {
    renderNavigation(app);
  }
}

window.addEventListener('hashchange', router);

// ============================================
// Navigation View
// ============================================
async function renderNavigation(container) {
  // For file system mode, check if folder is selected
  if (USE_FILESYSTEM && !state.dirHandle) {
    container.innerHTML = `
      <div class="empty-state">
        <h1>Notes</h1>
        <p>Select a folder to store your notes</p>
        <button id="selectFolder">Select Folder</button>
      </div>
    `;
    document.getElementById('selectFolder').onclick = async () => {
      if (await storage.selectFolder()) router();
    };
    return;
  }

  const storageName = storage.getStorageName();
  const showFolderSetting = USE_FILESYSTEM;

  container.innerHTML = `
    <div class="nav-view">
      <header>
        <h1>Notes</h1>
        <div class="header-actions">
          <button id="newNote">+ New</button>
          <button id="settingsBtn" class="icon-btn" title="Settings">&#9881;</button>
        </div>
      </header>
      <div id="notesList" class="notes-list">Loading...</div>
    </div>
    <div id="typeMenu" class="type-menu hidden">
      <button data-type="text">Text Note</button>
      <button data-type="image">Image</button>
      <button data-type="video">Video</button>
      <button data-type="audio">Audio</button>
    </div>
    <div id="settingsPanel" class="settings-panel hidden">
      <div class="settings-content">
        <div class="settings-header">
          <h2>Settings</h2>
          <button id="closeSettings" class="icon-btn">&#10005;</button>
        </div>
        <div class="settings-body">
          <div class="setting-item">
            <div class="setting-info">
              <strong>Storage</strong>
              <p id="currentFolder">${storageName}</p>
            </div>
            ${showFolderSetting ? '<button id="changeFolder">Change</button>' : ''}
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <strong>Export</strong>
              <p>Download all notes as JSON</p>
            </div>
            <button id="exportBtn">Export</button>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <strong>Import</strong>
              <p>Load notes from JSON file</p>
            </div>
            <label class="import-label">
              Import
              <input type="file" id="importInput" accept=".json" hidden>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  // New note menu
  const newBtn = document.getElementById('newNote');
  const typeMenu = document.getElementById('typeMenu');

  newBtn.onclick = () => typeMenu.classList.toggle('hidden');

  typeMenu.querySelectorAll('button').forEach((btn) => {
    btn.onclick = () => {
      typeMenu.classList.add('hidden');
      navigate(`#/new?type=${btn.dataset.type}`);
    };
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!newBtn.contains(e.target) && !typeMenu.contains(e.target)) {
      typeMenu.classList.add('hidden');
    }
  });

  // Settings panel
  const settingsPanel = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick = () => {
    settingsPanel.classList.remove('hidden');
  };
  document.getElementById('closeSettings').onclick = () => {
    settingsPanel.classList.add('hidden');
  };
  if (showFolderSetting) {
    document.getElementById('changeFolder').onclick = async () => {
      if (await storage.selectFolder()) {
        settingsPanel.classList.add('hidden');
        router();
      }
    };
  }

  // Export/Import
  document.getElementById('exportBtn').onclick = async () => {
    await exportNotes();
  };
  document.getElementById('importInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importNotes(file);
      settingsPanel.classList.add('hidden');
    }
  };

  // Close settings on backdrop click
  settingsPanel.onclick = (e) => {
    if (e.target === settingsPanel) {
      settingsPanel.classList.add('hidden');
    }
  };

  // Load and render notes
  state.notes = await storage.getAllNotes();
  renderNotesList();
}

function renderNotesList() {
  const container = document.getElementById('notesList');
  if (!state.notes.length) {
    container.innerHTML = '<p class="empty">No notes yet</p>';
    return;
  }

  // Group by folder
  const tree = {};
  state.notes.forEach((note) => {
    const folder = note.folder || '';
    if (!tree[folder]) tree[folder] = [];
    tree[folder].push(note);
  });

  // Sort folders
  const folders = Object.keys(tree).sort();

  let html = '';
  folders.forEach((folder) => {
    const isExpanded = state.expandedFolders.has(folder);
    const notes = tree[folder].sort((a, b) => a.name.localeCompare(b.name));

    if (folder) {
      html += `
        <div class="folder ${isExpanded ? 'expanded' : ''}" data-folder="${folder}">
          <div class="folder-header">
            <span class="folder-icon">${isExpanded ? '&#9660;' : '&#9654;'}</span>
            <span class="folder-name">${folder}</span>
            <button class="folder-delete" data-folder="${folder}" title="Delete folder">&#128465;</button>
          </div>
          <div class="folder-contents ${isExpanded ? '' : 'hidden'}">
            ${renderNotesInFolder(notes)}
          </div>
        </div>
      `;
    } else {
      html += renderNotesInFolder(notes);
    }
  });

  container.innerHTML = html;

  // Folder toggle handlers
  container.querySelectorAll('.folder-header').forEach((el) => {
    el.onclick = (e) => {
      // Don't toggle if clicking delete button
      if (e.target.classList.contains('folder-delete')) return;
      const folder = el.parentElement.dataset.folder;
      if (state.expandedFolders.has(folder)) {
        state.expandedFolders.delete(folder);
      } else {
        state.expandedFolders.add(folder);
      }
      renderNotesList();
    };
  });

  // Delete folder handlers
  container.querySelectorAll('.folder-delete').forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const folderPath = btn.dataset.folder;
      const notesInFolder = state.notes.filter((n) => n.folder === folderPath || n.folder.startsWith(folderPath + '/'));

      const message = notesInFolder.length > 0
        ? `Delete folder "${folderPath}" and ${notesInFolder.length} note(s) inside?`
        : `Delete empty folder "${folderPath}"?`;

      if (confirm(message)) {
        await storage.deleteFolder(folderPath);
        state.notes = await storage.getAllNotes();
        renderNotesList();
      }
    };
  });

  // Note click handlers
  container.querySelectorAll('.note-item').forEach((el) => {
    el.onclick = () => navigate(`#/view/${encodeURIComponent(el.dataset.path)}`);
  });
}

function renderNotesInFolder(notes) {
  const icons = { text: '&#128196;', image: '&#128248;', video: '&#127909;', audio: '&#127925;' };
  return notes
    .map(
      (note) => `
    <div class="note-item" data-path="${note.path}">
      <span class="note-icon">${icons[note.type]}</span>
      <span class="note-name">${note.name}</span>
    </div>
  `
    )
    .join('');
}

// ============================================
// View Note
// ============================================
async function renderViewNote(container, path) {
  const note = state.notes.find((n) => n.path === path);
  if (!note) {
    container.innerHTML = '<p>Note not found</p><button onclick="navigate(\'#/\')">Back</button>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading...</div>';

  let title = note.name;
  let content = '';
  let meta = {};

  try {
    const data = await storage.readNote(note);

    if (note.type === 'text') {
      const parsed = parseFrontmatter(data.text);
      meta = parsed.meta;
      content = marked.parse(parsed.content);
      title = meta.title || note.name;
    } else {
      meta = data.meta || {};
      title = meta.title || note.name;
      const url = data.url;

      if (note.type === 'image') {
        content = `<img src="${url}" alt="${title}">`;
      } else if (note.type === 'video') {
        content = `<video src="${url}" controls></video>`;
      } else if (note.type === 'audio') {
        content = `<audio src="${url}" controls></audio>`;
      }
    }
  } catch (e) {
    container.innerHTML = `<p>Error loading note: ${e.message}</p><button onclick="navigate('#/')">Back</button>`;
    return;
  }

  const tags = meta.tags?.length ? `<div class="tags">${meta.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>` : '';
  const description = meta.description ? `<p class="description">${meta.description}</p>` : '';

  container.innerHTML = `
    <div class="view-note">
      <header>
        <button id="backBtn">&larr; Back</button>
        <div class="actions">
          <button id="editBtn">Edit</button>
          <button id="deleteBtn" class="danger">Delete</button>
        </div>
      </header>
      <h1>${title}</h1>
      ${tags}
      ${description}
      <div class="content">${content}</div>
    </div>
  `;

  document.getElementById('backBtn').onclick = () => navigate('#/');
  document.getElementById('editBtn').onclick = () => navigate(`#/edit/${encodeURIComponent(path)}`);
  document.getElementById('deleteBtn').onclick = async () => {
    if (confirm('Delete this note?')) {
      await storage.deleteNote(note);
      navigate('#/');
    }
  };
}

// ============================================
// Helper: Get existing folders
// ============================================
function getExistingFolders() {
  const folders = new Set();
  state.notes.forEach((note) => {
    if (note.folder) {
      // Add folder and all parent folders
      const parts = note.folder.split('/');
      let path = '';
      parts.forEach((part) => {
        path = path ? `${path}/${part}` : part;
        folders.add(path);
      });
    }
  });
  return Array.from(folders).sort();
}

// ============================================
// Add Note (Content-First UX)
// ============================================
async function renderAddNote(container, type) {
  if (type === 'text') {
    renderAddTextNote(container);
  } else if (type === 'image') {
    renderAddImageNote(container);
  } else if (type === 'video') {
    renderAddVideoNote(container);
  } else if (type === 'audio') {
    renderAddAudioNote(container);
  }
}

// ============================================
// Text Note: Distraction-free editor
// ============================================
function renderAddTextNote(container) {
  const folders = getExistingFolders();
  const folderOptions = folders.map((f) => `<option value="${f}">${f}</option>`).join('');

  container.innerHTML = `
    <div class="fullpage-editor">
      <textarea id="textContent" placeholder="Start writing..." autofocus></textarea>
      <div class="save-bar">
        <button id="cancelBtn" class="text-btn">Cancel</button>
        <div class="save-options">
          <select id="folderSelect">
            <option value="">No folder</option>
            ${folderOptions}
            <option value="__new__">+ New folder</option>
          </select>
          <button id="moreBtn" class="text-btn">More</button>
          <button id="saveBtn">Save</button>
        </div>
      </div>
      <div id="metaPanel" class="meta-panel hidden">
        <label>Title<input type="text" id="titleInput" placeholder="Auto-generated from first line"></label>
        <label>Tags<input type="text" id="tagsInput" placeholder="comma, separated"></label>
        <label>Description<textarea id="descInput" rows="2" placeholder="Optional description"></textarea></label>
      </div>
      <div id="newFolderModal" class="modal hidden">
        <div class="modal-content">
          <h3>New Folder</h3>
          <input type="text" id="newFolderInput" placeholder="Folder name (e.g. Work/Projects)">
          <div class="modal-actions">
            <button id="cancelFolderBtn" class="text-btn">Cancel</button>
            <button id="createFolderBtn">Create</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const textContent = document.getElementById('textContent');
  const folderSelect = document.getElementById('folderSelect');
  const metaPanel = document.getElementById('metaPanel');
  const newFolderModal = document.getElementById('newFolderModal');
  const newFolderInput = document.getElementById('newFolderInput');

  // Auto-focus
  textContent.focus();

  // Cancel
  document.getElementById('cancelBtn').onclick = () => navigate('#/');

  // Toggle metadata panel
  document.getElementById('moreBtn').onclick = () => {
    metaPanel.classList.toggle('hidden');
  };

  // New folder modal
  folderSelect.onchange = () => {
    if (folderSelect.value === '__new__') {
      newFolderModal.classList.remove('hidden');
      newFolderInput.focus();
    }
  };

  document.getElementById('cancelFolderBtn').onclick = () => {
    newFolderModal.classList.add('hidden');
    folderSelect.value = '';
  };

  document.getElementById('createFolderBtn').onclick = () => {
    const newFolder = newFolderInput.value.trim();
    if (newFolder) {
      const option = document.createElement('option');
      option.value = newFolder;
      option.textContent = newFolder;
      folderSelect.insertBefore(option, folderSelect.querySelector('option[value="__new__"]'));
      folderSelect.value = newFolder;
    }
    newFolderModal.classList.add('hidden');
  };

  // Save
  document.getElementById('saveBtn').onclick = async () => {
    const content = textContent.value.trim();
    if (!content) return alert('Please write something first');

    const folderPath = folderSelect.value === '__new__' ? '' : folderSelect.value;
    const titleInput = document.getElementById('titleInput').value.trim();
    const tags = document.getElementById('tagsInput').value.split(',').map((t) => t.trim()).filter(Boolean);
    const description = document.getElementById('descInput').value.trim();

    // Auto-generate title from first line if not provided
    const firstLine = content.split('\n')[0].replace(/^#*\s*/, '').trim();
    const title = titleInput || firstLine.slice(0, 50) || 'Untitled';

    const now = new Date().toISOString();
    const meta = { title, tags, description, createdAt: now };
    const filename = sanitizeFilename(title) + '.md';

    await storage.saveTextNote(folderPath, filename, content, meta);

    navigate('#/');
  };
}

// ============================================
// Image Note: Capture first
// ============================================
function renderAddImageNote(container) {
  const folders = getExistingFolders();
  const folderOptions = folders.map((f) => `<option value="${f}">${f}</option>`).join('');

  container.innerHTML = `
    <div class="capture-view">
      <div id="captureArea" class="capture-area">
        <div class="capture-prompt">
          <button id="takePhotoBtn">Take Photo</button>
          <span>or</span>
          <label class="file-label">
            Choose File
            <input type="file" id="fileInput" accept="image/*" hidden>
          </label>
        </div>
        <video id="cameraPreview" class="hidden" autoplay playsinline></video>
        <canvas id="photoCanvas" class="hidden"></canvas>
      </div>
      <div id="previewArea" class="preview-area hidden">
        <img id="imagePreview" src="">
        <div class="save-bar">
          <button id="retakeBtn" class="text-btn">Retake</button>
          <div class="save-options">
            <select id="folderSelect">
              <option value="">No folder</option>
              ${folderOptions}
              <option value="__new__">+ New folder</option>
            </select>
            <button id="moreBtn" class="text-btn">More</button>
            <button id="saveBtn">Save</button>
          </div>
        </div>
        <div id="metaPanel" class="meta-panel hidden">
          <label>Title<input type="text" id="titleInput" placeholder="Auto-generated from timestamp"></label>
          <label>Tags<input type="text" id="tagsInput" placeholder="comma, separated"></label>
          <label>Description<textarea id="descInput" rows="2" placeholder="Optional caption"></textarea></label>
        </div>
      </div>
      <div id="newFolderModal" class="modal hidden">
        <div class="modal-content">
          <h3>New Folder</h3>
          <input type="text" id="newFolderInput" placeholder="Folder name">
          <div class="modal-actions">
            <button id="cancelFolderBtn" class="text-btn">Cancel</button>
            <button id="createFolderBtn">Create</button>
          </div>
        </div>
      </div>
      <button id="cancelBtn" class="cancel-floating">✕</button>
    </div>
  `;

  let imageBlob = null;
  let mediaStream = null;

  const captureArea = document.getElementById('captureArea');
  const previewArea = document.getElementById('previewArea');
  const cameraPreview = document.getElementById('cameraPreview');
  const photoCanvas = document.getElementById('photoCanvas');
  const imagePreview = document.getElementById('imagePreview');
  const fileInput = document.getElementById('fileInput');
  const folderSelect = document.getElementById('folderSelect');

  // Cancel
  document.getElementById('cancelBtn').onclick = () => {
    if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    navigate('#/');
  };

  // Take photo with camera
  document.getElementById('takePhotoBtn').onclick = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      cameraPreview.srcObject = mediaStream;
      cameraPreview.classList.remove('hidden');
      document.querySelector('.capture-prompt').innerHTML = '<button id="captureBtn">Capture</button>';

      document.getElementById('captureBtn').onclick = () => {
        photoCanvas.width = cameraPreview.videoWidth;
        photoCanvas.height = cameraPreview.videoHeight;
        photoCanvas.getContext('2d').drawImage(cameraPreview, 0, 0);
        photoCanvas.toBlob((blob) => {
          imageBlob = blob;
          imagePreview.src = URL.createObjectURL(blob);
          captureArea.classList.add('hidden');
          previewArea.classList.remove('hidden');
          mediaStream.getTracks().forEach((t) => t.stop());
        }, 'image/jpeg', 0.9);
      };
    } catch (e) {
      alert('Could not access camera');
    }
  };

  // Choose file
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (file) {
      imageBlob = file;
      imagePreview.src = URL.createObjectURL(file);
      captureArea.classList.add('hidden');
      previewArea.classList.remove('hidden');
    }
  };

  // Retake
  document.getElementById('retakeBtn').onclick = () => {
    previewArea.classList.add('hidden');
    captureArea.classList.remove('hidden');
    cameraPreview.classList.add('hidden');
    document.querySelector('.capture-prompt').innerHTML = `
      <button id="takePhotoBtn">Take Photo</button>
      <span>or</span>
      <label class="file-label">Choose File<input type="file" id="fileInput" accept="image/*" hidden></label>
    `;
    // Re-bind events
    document.getElementById('takePhotoBtn').onclick = document.getElementById('takePhotoBtn').onclick;
    document.getElementById('fileInput').onchange = fileInput.onchange;
  };

  // Toggle metadata
  document.getElementById('moreBtn').onclick = () => {
    document.getElementById('metaPanel').classList.toggle('hidden');
  };

  // New folder modal
  setupFolderModal(folderSelect);

  // Save
  document.getElementById('saveBtn').onclick = async () => {
    if (!imageBlob) return;

    const folderPath = folderSelect.value === '__new__' ? '' : folderSelect.value;
    const titleInput = document.getElementById('titleInput').value.trim();
    const tags = document.getElementById('tagsInput').value.split(',').map((t) => t.trim()).filter(Boolean);
    const description = document.getElementById('descInput').value.trim();

    const title = titleInput || `Photo ${new Date().toLocaleString()}`;
    const now = new Date().toISOString();
    const ext = imageBlob.name ? '.' + imageBlob.name.split('.').pop() : '.jpg';
    const filename = sanitizeFilename(title) + ext;
    const meta = { title, tags, description, createdAt: now, updatedAt: now };

    await storage.saveBinaryNote(folderPath, filename, imageBlob, meta);

    navigate('#/');
  };
}

// ============================================
// Video Note: Record first
// ============================================
function renderAddVideoNote(container) {
  const folders = getExistingFolders();
  const folderOptions = folders.map((f) => `<option value="${f}">${f}</option>`).join('');

  container.innerHTML = `
    <div class="capture-view">
      <div id="captureArea" class="capture-area">
        <div class="capture-prompt">
          <button id="recordVideoBtn">Record Video</button>
          <span>or</span>
          <label class="file-label">
            Choose File
            <input type="file" id="fileInput" accept="video/*" hidden>
          </label>
        </div>
        <video id="cameraPreview" class="hidden" autoplay playsinline muted></video>
        <div id="recordingControls" class="recording-controls hidden">
          <span id="recordingTime">0:00</span>
          <button id="stopRecordBtn">Stop</button>
        </div>
      </div>
      <div id="previewArea" class="preview-area hidden">
        <video id="videoPreview" controls></video>
        <div class="save-bar">
          <button id="retakeBtn" class="text-btn">Retake</button>
          <div class="save-options">
            <select id="folderSelect">
              <option value="">No folder</option>
              ${folderOptions}
              <option value="__new__">+ New folder</option>
            </select>
            <button id="moreBtn" class="text-btn">More</button>
            <button id="saveBtn">Save</button>
          </div>
        </div>
        <div id="metaPanel" class="meta-panel hidden">
          <label>Title<input type="text" id="titleInput" placeholder="Auto-generated from timestamp"></label>
          <label>Tags<input type="text" id="tagsInput" placeholder="comma, separated"></label>
          <label>Description<textarea id="descInput" rows="2" placeholder="Optional description"></textarea></label>
        </div>
      </div>
      <div id="newFolderModal" class="modal hidden">
        <div class="modal-content">
          <h3>New Folder</h3>
          <input type="text" id="newFolderInput" placeholder="Folder name">
          <div class="modal-actions">
            <button id="cancelFolderBtn" class="text-btn">Cancel</button>
            <button id="createFolderBtn">Create</button>
          </div>
        </div>
      </div>
      <button id="cancelBtn" class="cancel-floating">✕</button>
    </div>
  `;

  let videoBlob = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordingTimer = null;
  let recordingSeconds = 0;

  const captureArea = document.getElementById('captureArea');
  const previewArea = document.getElementById('previewArea');
  const cameraPreview = document.getElementById('cameraPreview');
  const videoPreview = document.getElementById('videoPreview');
  const fileInput = document.getElementById('fileInput');
  const folderSelect = document.getElementById('folderSelect');
  const recordingControls = document.getElementById('recordingControls');

  // Cancel
  document.getElementById('cancelBtn').onclick = () => {
    if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    if (recordingTimer) clearInterval(recordingTimer);
    navigate('#/');
  };

  // Record video
  document.getElementById('recordVideoBtn').onclick = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraPreview.srcObject = mediaStream;
      cameraPreview.classList.remove('hidden');
      document.querySelector('.capture-prompt').classList.add('hidden');
      recordingControls.classList.remove('hidden');

      const chunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        videoBlob = new Blob(chunks, { type: 'video/webm' });
        videoPreview.src = URL.createObjectURL(videoBlob);
        captureArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        mediaStream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimer);
      };

      mediaRecorder.start();
      recordingSeconds = 0;
      recordingTimer = setInterval(() => {
        recordingSeconds++;
        const mins = Math.floor(recordingSeconds / 60);
        const secs = recordingSeconds % 60;
        document.getElementById('recordingTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }, 1000);

      document.getElementById('stopRecordBtn').onclick = () => mediaRecorder.stop();
    } catch (e) {
      alert('Could not access camera/microphone');
    }
  };

  // Choose file
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (file) {
      videoBlob = file;
      videoPreview.src = URL.createObjectURL(file);
      captureArea.classList.add('hidden');
      previewArea.classList.remove('hidden');
    }
  };

  // Retake
  document.getElementById('retakeBtn').onclick = () => {
    location.reload(); // Simplest way to reset
  };

  // Toggle metadata
  document.getElementById('moreBtn').onclick = () => {
    document.getElementById('metaPanel').classList.toggle('hidden');
  };

  // New folder modal
  setupFolderModal(folderSelect);

  // Save
  document.getElementById('saveBtn').onclick = async () => {
    if (!videoBlob) return;

    const folderPath = folderSelect.value === '__new__' ? '' : folderSelect.value;
    const titleInput = document.getElementById('titleInput').value.trim();
    const tags = document.getElementById('tagsInput').value.split(',').map((t) => t.trim()).filter(Boolean);
    const description = document.getElementById('descInput').value.trim();

    const title = titleInput || `Video ${new Date().toLocaleString()}`;
    const now = new Date().toISOString();
    const ext = videoBlob.name ? '.' + videoBlob.name.split('.').pop() : '.webm';
    const filename = sanitizeFilename(title) + ext;
    const meta = { title, tags, description, createdAt: now, updatedAt: now };

    await storage.saveBinaryNote(folderPath, filename, videoBlob, meta);

    navigate('#/');
  };
}

// ============================================
// Audio Note: Record first
// ============================================
function renderAddAudioNote(container) {
  const folders = getExistingFolders();
  const folderOptions = folders.map((f) => `<option value="${f}">${f}</option>`).join('');

  container.innerHTML = `
    <div class="capture-view audio-capture">
      <div id="captureArea" class="capture-area">
        <div class="capture-prompt">
          <button id="recordAudioBtn" class="record-btn">Record</button>
          <span>or</span>
          <label class="file-label">
            Choose File
            <input type="file" id="fileInput" accept="audio/*" hidden>
          </label>
        </div>
        <div id="recordingUI" class="recording-ui hidden">
          <div class="recording-indicator"></div>
          <span id="recordingTime">0:00</span>
          <button id="stopRecordBtn">Stop</button>
        </div>
      </div>
      <div id="previewArea" class="preview-area hidden">
        <audio id="audioPreview" controls></audio>
        <div class="save-bar">
          <button id="retakeBtn" class="text-btn">Re-record</button>
          <div class="save-options">
            <select id="folderSelect">
              <option value="">No folder</option>
              ${folderOptions}
              <option value="__new__">+ New folder</option>
            </select>
            <button id="moreBtn" class="text-btn">More</button>
            <button id="saveBtn">Save</button>
          </div>
        </div>
        <div id="metaPanel" class="meta-panel hidden">
          <label>Title<input type="text" id="titleInput" placeholder="Auto-generated from timestamp"></label>
          <label>Tags<input type="text" id="tagsInput" placeholder="comma, separated"></label>
          <label>Description<textarea id="descInput" rows="2" placeholder="Optional description"></textarea></label>
        </div>
      </div>
      <div id="newFolderModal" class="modal hidden">
        <div class="modal-content">
          <h3>New Folder</h3>
          <input type="text" id="newFolderInput" placeholder="Folder name">
          <div class="modal-actions">
            <button id="cancelFolderBtn" class="text-btn">Cancel</button>
            <button id="createFolderBtn">Create</button>
          </div>
        </div>
      </div>
      <button id="cancelBtn" class="cancel-floating">✕</button>
    </div>
  `;

  let audioBlob = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordingTimer = null;
  let recordingSeconds = 0;

  const captureArea = document.getElementById('captureArea');
  const previewArea = document.getElementById('previewArea');
  const audioPreview = document.getElementById('audioPreview');
  const fileInput = document.getElementById('fileInput');
  const folderSelect = document.getElementById('folderSelect');
  const recordingUI = document.getElementById('recordingUI');

  // Cancel
  document.getElementById('cancelBtn').onclick = () => {
    if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    if (recordingTimer) clearInterval(recordingTimer);
    navigate('#/');
  };

  // Record audio
  document.getElementById('recordAudioBtn').onclick = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      document.querySelector('.capture-prompt').classList.add('hidden');
      recordingUI.classList.remove('hidden');

      const chunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(chunks, { type: 'audio/webm' });
        audioPreview.src = URL.createObjectURL(audioBlob);
        captureArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        mediaStream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimer);
      };

      mediaRecorder.start();
      recordingSeconds = 0;
      recordingTimer = setInterval(() => {
        recordingSeconds++;
        const mins = Math.floor(recordingSeconds / 60);
        const secs = recordingSeconds % 60;
        document.getElementById('recordingTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }, 1000);

      document.getElementById('stopRecordBtn').onclick = () => mediaRecorder.stop();
    } catch (e) {
      alert('Could not access microphone');
    }
  };

  // Choose file
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (file) {
      audioBlob = file;
      audioPreview.src = URL.createObjectURL(file);
      captureArea.classList.add('hidden');
      previewArea.classList.remove('hidden');
    }
  };

  // Retake
  document.getElementById('retakeBtn').onclick = () => {
    location.reload();
  };

  // Toggle metadata
  document.getElementById('moreBtn').onclick = () => {
    document.getElementById('metaPanel').classList.toggle('hidden');
  };

  // New folder modal
  setupFolderModal(folderSelect);

  // Save
  document.getElementById('saveBtn').onclick = async () => {
    if (!audioBlob) return;

    const folderPath = folderSelect.value === '__new__' ? '' : folderSelect.value;
    const titleInput = document.getElementById('titleInput').value.trim();
    const tags = document.getElementById('tagsInput').value.split(',').map((t) => t.trim()).filter(Boolean);
    const description = document.getElementById('descInput').value.trim();

    const title = titleInput || `Voice memo ${new Date().toLocaleString()}`;
    const now = new Date().toISOString();
    const ext = audioBlob.name ? '.' + audioBlob.name.split('.').pop() : '.webm';
    const filename = sanitizeFilename(title) + ext;
    const meta = { title, tags, description, createdAt: now, updatedAt: now };

    await storage.saveBinaryNote(folderPath, filename, audioBlob, meta);

    navigate('#/');
  };
}

// ============================================
// Helper: Setup folder modal
// ============================================
function setupFolderModal(folderSelect) {
  const newFolderModal = document.getElementById('newFolderModal');
  const newFolderInput = document.getElementById('newFolderInput');

  folderSelect.onchange = () => {
    if (folderSelect.value === '__new__') {
      newFolderModal.classList.remove('hidden');
      newFolderInput.focus();
    }
  };

  document.getElementById('cancelFolderBtn').onclick = () => {
    newFolderModal.classList.add('hidden');
    folderSelect.value = '';
  };

  document.getElementById('createFolderBtn').onclick = () => {
    const newFolder = newFolderInput.value.trim();
    if (newFolder) {
      const option = document.createElement('option');
      option.value = newFolder;
      option.textContent = newFolder;
      folderSelect.insertBefore(option, folderSelect.querySelector('option[value="__new__"]'));
      folderSelect.value = newFolder;
    }
    newFolderModal.classList.add('hidden');
  };
}

// ============================================
// Edit Note
// ============================================
async function renderEditNote(container, path) {
  const note = state.notes.find((n) => n.path === path);
  if (!note) {
    container.innerHTML = '<p>Note not found</p>';
    return;
  }

  let meta = {};
  let content = '';
  let binaryUrl = '';

  try {
    const data = await storage.readNote(note);
    if (note.type === 'text') {
      const parsed = parseFrontmatter(data.text);
      meta = parsed.meta;
      content = parsed.content;
    } else {
      meta = data.meta || {};
      binaryUrl = data.url;
    }
  } catch (e) {
    container.innerHTML = `<p>Error loading note: ${e.message}</p>`;
    return;
  }

  const isText = note.type === 'text';

  container.innerHTML = `
    <div class="edit-note">
      <header>
        <button id="cancelBtn">&larr; Cancel</button>
        <button id="saveBtn">Save</button>
      </header>
      <h2>Edit Note</h2>
      <form id="noteForm">
        <label>Title<input type="text" name="title" value="${meta.title || note.name}" required></label>
        <label>Tags<input type="text" name="tags" value="${(meta.tags || []).join(', ')}"></label>
        <label>Description<textarea name="description" rows="2">${meta.description || ''}</textarea></label>
        ${isText ? `<label>Content<textarea name="content" rows="12">${content}</textarea></label>` : ''}
        ${!isText ? `
          <label>Replace file (optional)<input type="file" name="file" accept="${note.type}/*"></label>
          <div id="preview"></div>
        ` : ''}
      </form>
    </div>
  `;

  const form = document.getElementById('noteForm');
  let newFile = null;

  document.getElementById('cancelBtn').onclick = () => navigate(`#/view/${encodeURIComponent(path)}`);

  // File preview for binary
  if (!isText) {
    const fileInput = form.querySelector('input[name="file"]');
    const preview = document.getElementById('preview');

    // Show current
    if (note.type === 'image') preview.innerHTML = `<img src="${binaryUrl}">`;
    else if (note.type === 'video') preview.innerHTML = `<video src="${binaryUrl}" controls></video>`;
    else if (note.type === 'audio') preview.innerHTML = `<audio src="${binaryUrl}" controls></audio>`;

    fileInput.onchange = () => {
      newFile = fileInput.files[0];
      if (!newFile) return;
      const newUrl = URL.createObjectURL(newFile);
      if (note.type === 'image') preview.innerHTML = `<img src="${newUrl}">`;
      else if (note.type === 'video') preview.innerHTML = `<video src="${newUrl}" controls></video>`;
      else if (note.type === 'audio') preview.innerHTML = `<audio src="${newUrl}" controls></audio>`;
    };
  }

  // Save
  document.getElementById('saveBtn').onclick = async () => {
    const data = new FormData(form);
    const title = data.get('title').trim();
    if (!title) return alert('Title is required');

    const tags = data.get('tags').split(',').map((t) => t.trim()).filter(Boolean);
    const description = data.get('description').trim();
    const now = new Date().toISOString();

    if (isText) {
      const newContent = data.get('content') || '';
      const newMeta = { title, tags, description, createdAt: meta.createdAt || now };
      await storage.saveTextNote(note.folder, note.name, newContent, newMeta);
    } else {
      const newMeta = { ...meta, title, tags, description, updatedAt: now };

      if (newFile) {
        // Replace file: delete old, save new
        await storage.deleteNote(note);
        const ext = '.' + newFile.name.split('.').pop();
        const newFilename = sanitizeFilename(title) + ext;
        await storage.saveBinaryNote(note.folder, newFilename, newFile, newMeta);
      } else {
        // Just update metadata
        await storage.updateMeta(note, newMeta);
      }
    }

    navigate('#/');
  };
}

// ============================================
// Utilities
// ============================================
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function base64ToBlob(base64) {
  const res = await fetch(base64);
  return res.blob();
}

async function exportNotes() {
  try {
    const data = await storage.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

async function importNotes(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      throw new Error('Invalid export file format');
    }

    await storage.importAll(data);
    alert(`Imported ${data.length} note(s) successfully!`);
    router();
  } catch (e) {
    alert('Import failed: ' + e.message);
  }
}

// ============================================
// Init
// ============================================
router();

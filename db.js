// IndexedDB wrapper for files and folders
import { generateUUID } from './utils.js';

const DB_NAME = 'fileNoteApp';
const DB_VERSION = 1;

let db = null;

export async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Files store
            if (!database.objectStoreNames.contains('files')) {
                const fileStore = database.createObjectStore('files', { keyPath: 'id' });
                fileStore.createIndex('folderId', 'folderId', { unique: false });
                fileStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
            }

            // Folders store
            if (!database.objectStoreNames.contains('folders')) {
                const folderStore = database.createObjectStore('folders', { keyPath: 'id' });
                folderStore.createIndex('parentId', 'parentId', { unique: false });
            }
        };
    });
}

// Helper to get store
function getStore(storeName, mode = 'readonly') {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

// Generic get by ID
async function getById(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Generic get all
async function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Generic save (add or update)
async function save(storeName, data) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.put(data);
        request.onsuccess = () => resolve(data);
        request.onerror = () => reject(request.error);
    });
}

// Generic delete
async function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

// File operations
export async function getFile(id) {
    const file = await getById('files', id);
    if (file) {
        // Update lastAccessed
        file.lastAccessed = Date.now();
        await save('files', file);
    }
    return file;
}

export async function saveFile(fileData) {
    const now = Date.now();
    const file = {
        id: fileData.id || generateUUID(),
        name: fileData.name || 'Untitled',
        type: fileData.type || 'text',
        content: fileData.content || '',
        folderId: fileData.folderId !== undefined ? fileData.folderId : null,
        dateCreated: fileData.dateCreated || now,
        dateModified: now,
        lastAccessed: now,
        description: fileData.description || '',
        location: fileData.location || '',
        tags: fileData.tags || []
    };
    return save('files', file);
}

export async function deleteFile(id) {
    return remove('files', id);
}

export async function getAllFilesInFolder(folderId) {
    // IndexedDB doesn't index null values, so we filter manually
    const allFiles = await getAll('files');
    return allFiles.filter(f => f.folderId === folderId);
}

export async function updateMetadata(fileId, metadata) {
    const file = await getById('files', fileId);
    if (!file) throw new Error('File not found');

    const updated = {
        ...file,
        ...metadata,
        dateModified: Date.now()
    };
    return save('files', updated);
}

export async function getRecentFiles(limit = 10) {
    const files = await getAll('files');
    return files
        .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
        .slice(0, limit);
}

// Folder operations
export async function getFolder(id) {
    return getById('folders', id);
}

export async function saveFolder(folderData) {
    const now = Date.now();
    const folder = {
        id: folderData.id || generateUUID(),
        name: folderData.name || 'New Folder',
        parentId: folderData.parentId !== undefined ? folderData.parentId : null,
        dateCreated: folderData.dateCreated || now,
        dateModified: now
    };
    return save('folders', folder);
}

export async function deleteFolder(id) {
    // Also delete all files and subfolders
    const files = await getAllFilesInFolder(id);
    for (const file of files) {
        await deleteFile(file.id);
    }

    const subfolders = await getSubfolders(id);
    for (const subfolder of subfolders) {
        await deleteFolder(subfolder.id);
    }

    return remove('folders', id);
}

export async function getSubfolders(parentId) {
    // IndexedDB doesn't index null values, so we filter manually
    const allFolders = await getAll('folders');
    return allFolders.filter(f => f.parentId === parentId);
}

export async function getAllFolders() {
    return getAll('folders');
}

export async function getRootFolders() {
    const allFolders = await getAll('folders');
    return allFolders.filter(f => f.parentId === null);
}

// Build folder path (for breadcrumbs)
export async function getFolderPath(folderId) {
    const path = [];
    let currentId = folderId;

    while (currentId) {
        const folder = await getFolder(currentId);
        if (folder) {
            path.unshift(folder);
            currentId = folder.parentId;
        } else {
            break;
        }
    }

    return path;
}

// Expose DB for console testing
window.DB = {
    initDB, getFile, saveFile, deleteFile, getAllFilesInFolder, updateMetadata,
    getRecentFiles, getFolder, saveFolder, deleteFolder, getSubfolders,
    getAllFolders, getRootFolders, getFolderPath
};

// IndexedDB wrapper for files and folders
import { generateUUID } from './utils.js';

const DB_NAME = 'fileNoteApp';
const DB_VERSION = 2;  // Incremented for change tracking stores

let db = null;

export async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            db = request.result;
            // Backfill change log for existing files/folders
            await backfillChangeLog();
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

            // Change log store (new in v2)
            if (!database.objectStoreNames.contains('changeLog')) {
                const changeStore = database.createObjectStore('changeLog', { keyPath: 'id' });
                changeStore.createIndex('timestamp', 'timestamp', { unique: false });
                changeStore.createIndex('synced', 'synced', { unique: false });
                changeStore.createIndex('entityId', 'entityId', { unique: false });
            }

            // Meta store for deviceId and sync timestamps (new in v2)
            if (!database.objectStoreNames.contains('meta')) {
                database.createObjectStore('meta', { keyPath: 'key' });
            }
        };
    });
}

// Backfill change log entries for files/folders that existed before change tracking
async function backfillChangeLog() {
    const deviceId = await getDeviceId();
    const allChanges = await getAll('changeLog');
    const loggedEntityIds = new Set(allChanges.map(c => c.entityId));

    // Check all files
    const allFiles = await getAll('files');
    for (const file of allFiles) {
        if (!loggedEntityIds.has(file.id)) {
            const change = {
                id: generateUUID(),
                entityType: 'file',
                entityId: file.id,
                operation: 'create',
                timestamp: file.dateCreated || Date.now(),
                synced: false,
                deviceId
            };
            await save('changeLog', change);
        }
    }

    // Check all folders
    const allFolders = await getAll('folders');
    for (const folder of allFolders) {
        if (!loggedEntityIds.has(folder.id)) {
            const change = {
                id: generateUUID(),
                entityType: 'folder',
                entityId: folder.id,
                operation: 'create',
                timestamp: folder.dateCreated || Date.now(),
                synced: false,
                deviceId
            };
            await save('changeLog', change);
        }
    }
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

// ============== SYNC: Device ID and Meta ==============

export async function getDeviceId() {
    let meta = await getById('meta', 'deviceId');
    if (!meta) {
        meta = { key: 'deviceId', value: generateUUID() };
        await save('meta', meta);
    }
    return meta.value;
}

export async function getLastSyncTimestamp() {
    const meta = await getById('meta', 'lastSyncTimestamp');
    return meta ? meta.value : 0;
}

export async function setLastSyncTimestamp(timestamp) {
    return save('meta', { key: 'lastSyncTimestamp', value: timestamp });
}

// ============== SYNC: Change Logging ==============

async function logChange(entityType, entityId, operation) {
    const deviceId = await getDeviceId();
    const change = {
        id: generateUUID(),
        entityType,      // 'file' or 'folder'
        entityId,
        operation,       // 'create', 'update', 'delete'
        timestamp: Date.now(),
        synced: false,
        deviceId
    };
    return save('changeLog', change);
}

export async function getUnsynced() {
    const all = await getAll('changeLog');
    return all.filter(c => !c.synced);
}

export async function markSynced(changeIds) {
    for (const id of changeIds) {
        const change = await getById('changeLog', id);
        if (change) {
            change.synced = true;
            await save('changeLog', change);
        }
    }
}

export async function getChangesSince(timestamp) {
    const all = await getAll('changeLog');
    return all.filter(c => c.timestamp > timestamp).sort((a, b) => a.timestamp - b.timestamp);
}

// Get all changes for an entity (for conflict detection)
export async function getChangesForEntity(entityId) {
    const all = await getAll('changeLog');
    return all.filter(c => c.entityId === entityId).sort((a, b) => a.timestamp - b.timestamp);
}

// ============== File operations ==============

export async function getFile(id) {
    const file = await getById('files', id);
    if (file) {
        // Update lastAccessed
        file.lastAccessed = Date.now();
        await save('files', file);
    }
    return file;
}

// Get file without updating lastAccessed (for sync)
export async function getFileRaw(id) {
    return getById('files', id);
}

export async function saveFile(fileData, skipChangeLog = false) {
    const now = Date.now();
    const isNew = !fileData.id || !(await getById('files', fileData.id));

    const file = {
        id: fileData.id || generateUUID(),
        name: fileData.name || 'Untitled',
        type: fileData.type || 'text',
        content: fileData.content || '',
        folderId: fileData.folderId !== undefined ? fileData.folderId : null,
        dateCreated: fileData.dateCreated || now,
        dateModified: fileData.dateModified || now,
        lastAccessed: fileData.lastAccessed || now,
        description: fileData.description || '',
        location: fileData.location || '',
        tags: fileData.tags || []
    };

    const saved = await save('files', file);

    if (!skipChangeLog) {
        await logChange('file', file.id, isNew ? 'create' : 'update');
    }

    return saved;
}

export async function deleteFile(id, skipChangeLog = false) {
    const result = await remove('files', id);

    if (!skipChangeLog) {
        await logChange('file', id, 'delete');
    }

    return result;
}

export async function getAllFilesInFolder(folderId) {
    // IndexedDB doesn't index null values, so we filter manually
    const allFiles = await getAll('files');
    return allFiles.filter(f => f.folderId === folderId);
}

export async function getAllFiles() {
    return getAll('files');
}

export async function updateMetadata(fileId, metadata, skipChangeLog = false) {
    const file = await getById('files', fileId);
    if (!file) throw new Error('File not found');

    const updated = {
        ...file,
        ...metadata,
        dateModified: Date.now()
    };
    const saved = await save('files', updated);

    if (!skipChangeLog) {
        await logChange('file', fileId, 'update');
    }

    return saved;
}

export async function getRecentFiles(limit = 10) {
    const files = await getAll('files');
    return files
        .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
        .slice(0, limit);
}

// ============== Folder operations ==============

export async function getFolder(id) {
    return getById('folders', id);
}

export async function saveFolder(folderData, skipChangeLog = false) {
    const now = Date.now();
    const isNew = !folderData.id || !(await getById('folders', folderData.id));

    const folder = {
        id: folderData.id || generateUUID(),
        name: folderData.name || 'New Folder',
        parentId: folderData.parentId !== undefined ? folderData.parentId : null,
        dateCreated: folderData.dateCreated || now,
        dateModified: folderData.dateModified || now
    };

    const saved = await save('folders', folder);

    if (!skipChangeLog) {
        await logChange('folder', folder.id, isNew ? 'create' : 'update');
    }

    return saved;
}

export async function deleteFolder(id, skipChangeLog = false) {
    // Also delete all files and subfolders
    const files = await getAllFilesInFolder(id);
    for (const file of files) {
        await deleteFile(file.id, skipChangeLog);
    }

    const subfolders = await getSubfolders(id);
    for (const subfolder of subfolders) {
        await deleteFolder(subfolder.id, skipChangeLog);
    }

    const result = await remove('folders', id);

    if (!skipChangeLog) {
        await logChange('folder', id, 'delete');
    }

    return result;
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

// ============== Sync: Apply Remote Changes ==============

export async function applyRemoteFile(fileData) {
    // Apply file from remote peer (skip change log to avoid re-syncing)
    return saveFile(fileData, true);
}

export async function applyRemoteFolder(folderData) {
    // Apply folder from remote peer (skip change log)
    return saveFolder(folderData, true);
}

export async function applyRemoteDelete(entityType, entityId) {
    // Apply delete from remote peer (skip change log)
    if (entityType === 'file') {
        return deleteFile(entityId, true);
    } else {
        return deleteFolder(entityId, true);
    }
}

// Expose DB for console testing
window.DB = {
    initDB, getFile, saveFile, deleteFile, getAllFilesInFolder, updateMetadata,
    getRecentFiles, getFolder, saveFolder, deleteFolder, getSubfolders,
    getAllFolders, getRootFolders, getFolderPath, getAllFiles,
    // Sync exports
    getDeviceId, getLastSyncTimestamp, setLastSyncTimestamp,
    getUnsynced, markSynced, getChangesSince, getChangesForEntity,
    applyRemoteFile, applyRemoteFolder, applyRemoteDelete
};

// File System Access API integration with bidirectional sync
import { saveFile, saveFolder, getFolder, getFolderPath } from './db.js';
import { generateUUID, getFileType } from './utils.js';

// In-memory mapping of folder IDs to directory handles
// Map<folderId, FileSystemDirectoryHandle>
const folderHandles = new Map();

// Root directory handle (the folder user selected)
let rootDirHandle = null;
let rootFolderId = null;

// Check if File System Access API is available
export function isFileSystemAccessSupported() {
    return 'showDirectoryPicker' in window;
}

// Get the linked folder ID (if any)
export function getLinkedFolderId() {
    return rootFolderId;
}

// Check if a folder is linked to filesystem
export function isFolderLinked(folderId) {
    return folderHandles.has(folderId);
}

// Open directory picker with readwrite permission
export async function openDirectoryPicker() {
    if (!isFileSystemAccessSupported()) {
        alert('File System Access API is not supported in this browser. Use Chrome or Edge on desktop.');
        return null;
    }

    try {
        const dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'  // Request write permission
        });
        return dirHandle;
    } catch (err) {
        if (err.name === 'AbortError') {
            return null;
        }
        console.error('Error opening directory:', err);
        throw err;
    }
}

// Verify we still have permission to write
async function verifyPermission(handle) {
    const options = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

// Get file extension based on type
function getFileExtension(fileType, fileName) {
    // If filename already has extension, use it
    if (fileName.includes('.')) {
        return '';
    }
    // Otherwise add default extension
    const extensions = {
        'text': '.txt',
        'image': '.png',
        'video': '.webm',
        'audio': '.webm',
        'svg': '.svg'
    };
    return extensions[fileType] || '.txt';
}

// Convert data URL to Blob
function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Write a file to the filesystem
export async function writeFileToFS(fileData) {
    const folderId = fileData.folderId;
    const dirHandle = folderHandles.get(folderId);

    if (!dirHandle) {
        console.log('No directory handle for folder:', folderId);
        return false;
    }

    if (!(await verifyPermission(dirHandle))) {
        console.error('Permission denied for directory');
        return false;
    }

    try {
        // Ensure filename has extension
        let fileName = fileData.name;
        if (!fileName.includes('.')) {
            fileName += getFileExtension(fileData.type, fileName);
        }

        // Get or create file handle
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();

        // Write content based on type
        if (fileData.type === 'text' || fileData.type === 'svg') {
            await writable.write(fileData.content);
        } else {
            // Convert data URL to blob for binary files
            const blob = dataURLtoBlob(fileData.content);
            await writable.write(blob);
        }

        await writable.close();
        console.log('Written to filesystem:', fileName);

        // Also write metadata JSON
        await writeMetadataJSON(fileData, folderId);

        return true;
    } catch (err) {
        console.error('Error writing file to filesystem:', err);
        return false;
    }
}

// Create a folder in the filesystem
export async function createFolderInFS(folderName, parentFolderId) {
    const parentHandle = folderHandles.get(parentFolderId);

    if (!parentHandle) {
        console.log('No directory handle for parent folder:', parentFolderId);
        return null;
    }

    if (!(await verifyPermission(parentHandle))) {
        console.error('Permission denied for directory');
        return null;
    }

    try {
        const newDirHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });
        console.log('Created folder in filesystem:', folderName);
        return newDirHandle;
    } catch (err) {
        console.error('Error creating folder in filesystem:', err);
        return null;
    }
}

// Delete a file from filesystem (and its metadata JSON)
export async function deleteFileFromFS(fileName, folderId) {
    const dirHandle = folderHandles.get(folderId);

    if (!dirHandle) {
        return false;
    }

    if (!(await verifyPermission(dirHandle))) {
        return false;
    }

    try {
        await dirHandle.removeEntry(fileName);
    } catch (err) {
        // NotFoundError is fine - file doesn't exist on disk
        if (err.name !== 'NotFoundError') {
            console.error('Error deleting file from filesystem:', err);
            return false;
        }
    }

    // Also delete the metadata JSON file
    await deleteMetadataJSON(fileName, folderId);

    return true;
}

// Read file content as data URL (for media files)
async function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Read file content as text
async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

// Get JSON metadata filename for a file
function getMetadataFileName(fileName) {
    return `${fileName}.json`;
}

// Write metadata JSON file alongside the actual file
export async function writeMetadataJSON(fileData, folderId) {
    const dirHandle = folderHandles.get(folderId);

    if (!dirHandle) {
        return false;
    }

    if (!(await verifyPermission(dirHandle))) {
        return false;
    }

    try {
        const metaFileName = getMetadataFileName(fileData.name);
        const fileHandle = await dirHandle.getFileHandle(metaFileName, { create: true });
        const writable = await fileHandle.createWritable();

        const metadata = {
            name: fileData.name,
            type: fileData.type,
            description: fileData.description || '',
            location: fileData.location || '',
            tags: fileData.tags || [],
            dateCreated: fileData.dateCreated,
            dateModified: fileData.dateModified,
            lastAccessed: fileData.lastAccessed
        };

        await writable.write(JSON.stringify(metadata, null, 2));
        await writable.close();
        console.log('Written metadata JSON:', metaFileName);
        return true;
    } catch (err) {
        console.error('Error writing metadata JSON:', err);
        return false;
    }
}

// Read metadata JSON file if it exists
async function readMetadataJSON(dirHandle, fileName) {
    try {
        const metaFileName = getMetadataFileName(fileName);
        const fileHandle = await dirHandle.getFileHandle(metaFileName);
        const file = await fileHandle.getFile();
        const content = await readFileAsText(file);
        return JSON.parse(content);
    } catch (err) {
        // File doesn't exist or couldn't be parsed - that's fine
        return null;
    }
}

// Delete metadata JSON file
export async function deleteMetadataJSON(fileName, folderId) {
    const dirHandle = folderHandles.get(folderId);

    if (!dirHandle) {
        return false;
    }

    if (!(await verifyPermission(dirHandle))) {
        return false;
    }

    try {
        const metaFileName = getMetadataFileName(fileName);
        await dirHandle.removeEntry(metaFileName);
        console.log('Deleted metadata JSON:', metaFileName);
        return true;
    } catch (err) {
        // NotFoundError is fine - file doesn't exist
        if (err.name === 'NotFoundError') {
            return true;
        }
        console.error('Error deleting metadata JSON:', err);
        return false;
    }
}

// Import a single file from the filesystem into IndexedDB
async function importFile(fileHandle, folderId, dirHandle) {
    try {
        const file = await fileHandle.getFile();
        const fileName = file.name;

        // Skip JSON metadata files - they're handled separately
        if (fileName.endsWith('.json')) {
            // Check if this is a metadata file (has a corresponding non-json file)
            const baseName = fileName.slice(0, -5); // Remove .json
            try {
                await dirHandle.getFileHandle(baseName);
                // Corresponding file exists, this is a metadata file - skip it
                return null;
            } catch {
                // No corresponding file, this is a regular JSON file - import it
            }
        }

        const fileType = getFileType(file.type || fileName);

        let content;
        if (fileType === 'text' || fileType === 'svg') {
            content = await readFileAsText(file);
        } else {
            content = await readFileAsDataURL(file);
        }

        // Check for existing metadata JSON file
        const existingMetadata = await readMetadataJSON(dirHandle, fileName);

        const now = Date.now();
        const fileData = {
            id: generateUUID(),
            name: fileName,
            type: fileType,
            content: content,
            folderId: folderId,
            description: existingMetadata?.description || '',
            location: existingMetadata?.location || '',
            tags: existingMetadata?.tags || [],
            dateCreated: existingMetadata?.dateCreated || file.lastModified || now,
            dateModified: existingMetadata?.dateModified || file.lastModified || now,
            lastAccessed: now
        };

        const saved = await saveFile(fileData);

        // Create metadata JSON if it didn't exist
        if (!existingMetadata && dirHandle) {
            await writeMetadataJSON(saved, folderId);
        }

        return saved;
    } catch (err) {
        console.error(`Error importing file ${fileHandle.name}:`, err);
        return null;
    }
}

// Recursively import a folder and its contents into IndexedDB
// Also stores handle mappings for write-back
export async function syncFolderToIndexedDB(dirHandle, parentFolderId = null, options = {}) {
    const { onProgress, skipHidden = true, isRoot = true } = options;
    const results = { folders: 0, files: 0, errors: [], rootFolderId: null };

    // Create folder in IndexedDB
    const folder = await saveFolder({
        id: generateUUID(),
        name: dirHandle.name,
        parentId: parentFolderId
    });
    results.folders++;

    // Store the handle mapping
    folderHandles.set(folder.id, dirHandle);

    // If this is the root folder being imported, store it
    if (isRoot) {
        rootDirHandle = dirHandle;
        rootFolderId = folder.id;
        results.rootFolderId = folder.id;
    }

    if (onProgress) {
        onProgress({ type: 'folder', name: dirHandle.name });
    }

    // Iterate through directory entries
    for await (const entry of dirHandle.values()) {
        if (skipHidden && entry.name.startsWith('.')) {
            continue;
        }

        try {
            if (entry.kind === 'file') {
                const imported = await importFile(entry, folder.id, dirHandle);
                if (imported) {
                    results.files++;
                    if (onProgress) {
                        onProgress({ type: 'file', name: entry.name });
                    }
                }
            } else if (entry.kind === 'directory') {
                const subResults = await syncFolderToIndexedDB(entry, folder.id, {
                    ...options,
                    isRoot: false
                });
                results.folders += subResults.folders;
                results.files += subResults.files;
                results.errors.push(...subResults.errors);
            }
        } catch (err) {
            console.error(`Error processing ${entry.name}:`, err);
            results.errors.push({ name: entry.name, error: err.message });
        }
    }

    return results;
}

// Register a new folder created in the app with the filesystem
export async function registerNewFolder(folderId, folderName, parentFolderId) {
    if (!isFolderLinked(parentFolderId)) {
        return false;
    }

    const dirHandle = await createFolderInFS(folderName, parentFolderId);
    if (dirHandle) {
        folderHandles.set(folderId, dirHandle);
        return true;
    }
    return false;
}

// Expose for console testing
window.FS = {
    isFileSystemAccessSupported,
    openDirectoryPicker,
    syncFolderToIndexedDB,
    writeFileToFS,
    writeMetadataJSON,
    deleteMetadataJSON,
    createFolderInFS,
    deleteFileFromFS,
    isFolderLinked,
    getLinkedFolderId,
    folderHandles
};

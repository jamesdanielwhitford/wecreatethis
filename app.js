// Main app initialization
import { initDB } from './db.js';
import { initFolderTree, setNavigateHandler, createNewFolder, getCurrentFolderId, navigateTo } from './components/folderTree.js';
import { renderAssets } from './components/assetView.js';
import { openEditor } from './components/noteEditor.js';
import { isFileSystemAccessSupported, openDirectoryPicker, syncFolderToIndexedDB } from './fileSystem.js';
import { initSyncUI } from './components/syncUI.js';

async function init() {
    // Initialize database
    await initDB();

    // Set up folder navigation handler
    setNavigateHandler(async (folderId) => {
        await renderAssets(folderId);
    });

    // Initialize folder tree (also triggers initial asset render via navigate handler)
    await initFolderTree();

    // Set up button handlers
    document.getElementById('newFolderBtn').onclick = createNewFolder;
    document.getElementById('newFileBtn').onclick = () => {
        openEditor(null, getCurrentFolderId());
    };

    // Open Folder button - File System Access API
    const openFolderBtn = document.getElementById('openFolderBtn');
    if (isFileSystemAccessSupported()) {
        openFolderBtn.onclick = async () => {
            const dirHandle = await openDirectoryPicker();
            if (dirHandle) {
                openFolderBtn.disabled = true;
                openFolderBtn.textContent = 'Importing...';

                try {
                    const results = await syncFolderToIndexedDB(dirHandle, getCurrentFolderId());
                    alert(`Imported ${results.folders} folder(s) and ${results.files} file(s)`);
                    // Refresh the view
                    await navigateTo(getCurrentFolderId());
                } catch (err) {
                    console.error('Import error:', err);
                    alert('Error importing folder: ' + err.message);
                } finally {
                    openFolderBtn.disabled = false;
                    openFolderBtn.textContent = 'Open Folder';
                }
            }
        };
    } else {
        // Hide button if not supported
        openFolderBtn.style.display = 'none';
    }

    // Initialize sync UI
    initSyncUI();
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

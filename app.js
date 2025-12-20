// Main app initialization
import { initDB } from './db.js';
import { initFolderTree, setNavigateHandler, createNewFolder, getCurrentFolderId } from './components/folderTree.js';
import { renderAssets } from './components/assetView.js';
import { openEditor } from './components/noteEditor.js';

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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Folder tree component
import { getRootFolders, getSubfolders, getFolderPath, saveFolder, deleteFolder } from '../db.js';
import { registerNewFolder, isFolderLinked } from '../fileSystem.js';

let currentFolderId = null;
let onNavigate = null;

export function setNavigateHandler(handler) {
    onNavigate = handler;
}

export function getCurrentFolderId() {
    return currentFolderId;
}

export async function renderBreadcrumbs(folderId) {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '';

    // Root link
    const rootSpan = document.createElement('span');
    rootSpan.textContent = 'Root';
    rootSpan.onclick = () => navigateTo(null);
    container.appendChild(rootSpan);

    if (folderId) {
        const path = await getFolderPath(folderId);
        for (const folder of path) {
            const separator = document.createTextNode(' > ');
            container.appendChild(separator);

            const span = document.createElement('span');
            span.textContent = folder.name;
            span.onclick = () => navigateTo(folder.id);
            container.appendChild(span);
        }
    }
}

export async function renderFolderTree(parentId = null) {
    currentFolderId = parentId;
    const container = document.getElementById('folderTree');
    container.innerHTML = '';

    const folders = parentId === null
        ? await getRootFolders()
        : await getSubfolders(parentId);

    if (folders.length === 0) {
        container.innerHTML = '<div style="color: #888; font-style: italic;">No folders</div>';
        return;
    }

    for (const folder of folders) {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = folder.name;
        nameSpan.style.cursor = 'pointer';
        nameSpan.onclick = () => navigateTo(folder.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.style.cssText = 'background:red;color:white;border:none;cursor:pointer;padding:0 4px;margin-left:5px;';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                await deleteFolder(folder.id);
                await renderFolderTree(currentFolderId);
            }
        };

        div.appendChild(nameSpan);
        div.appendChild(deleteBtn);
        container.appendChild(div);
    }
}

export async function navigateTo(folderId) {
    currentFolderId = folderId;
    await renderBreadcrumbs(folderId);
    await renderFolderTree(folderId);

    if (onNavigate) {
        onNavigate(folderId);
    }
}

export async function createNewFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;

    const folder = await saveFolder({
        name: name.trim(),
        parentId: currentFolderId
    });

    // Create in filesystem if parent is linked
    if (isFolderLinked(currentFolderId)) {
        await registerNewFolder(folder.id, folder.name, currentFolderId);
    }

    await renderFolderTree(currentFolderId);
}

export async function initFolderTree() {
    await navigateTo(null);
}

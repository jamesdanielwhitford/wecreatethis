// Asset view component - displays files in current folder
import { getAllFilesInFolder, deleteFile } from '../db.js';
import { formatDate, truncateText } from '../utils.js';
import { openEditor } from './noteEditor.js';
import { openMetadataEditor } from './metadataEditor.js';

export async function renderAssets(folderId) {
    const container = document.getElementById('assetView');
    container.innerHTML = '';

    const files = await getAllFilesInFolder(folderId);

    if (files.length === 0) {
        container.innerHTML = '<div style="color: #888; font-style: italic;">No files in this folder</div>';
        return;
    }

    for (const file of files) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.onclick = () => openEditor(file.id, folderId);

        const preview = document.createElement('div');
        preview.className = 'asset-preview';
        preview.appendChild(createPreview(file));

        const name = document.createElement('div');
        name.className = 'asset-name';
        name.textContent = file.name;

        const date = document.createElement('div');
        date.className = 'asset-date';
        date.style.fontSize = '0.75em';
        date.style.color = '#888';
        date.textContent = formatDate(file.dateModified);

        const metaBtn = document.createElement('button');
        metaBtn.textContent = 'i';
        metaBtn.title = 'Edit metadata';
        metaBtn.style.cssText = 'position:absolute;top:2px;right:28px;background:#666;color:white;border:none;cursor:pointer;padding:2px 8px;font-style:italic;font-weight:bold;border-radius:50%;';
        metaBtn.onclick = async (e) => {
            e.stopPropagation();
            await openMetadataEditor(file.id, folderId);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.style.cssText = 'position:absolute;top:2px;right:2px;background:red;color:white;border:none;cursor:pointer;padding:2px 6px;';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${file.name}"?`)) {
                await deleteFile(file.id);
                await renderAssets(folderId);
            }
        };

        item.style.position = 'relative';
        item.appendChild(preview);
        item.appendChild(name);
        item.appendChild(date);
        item.appendChild(metaBtn);
        item.appendChild(deleteBtn);
        container.appendChild(item);
    }
}

function createPreview(file) {
    const type = file.type || 'text';

    switch (type) {
        case 'image':
            if (file.content) {
                const img = document.createElement('img');
                img.src = file.content; // Assuming base64 or blob URL
                return img;
            }
            break;

        case 'video':
            if (file.content) {
                const video = document.createElement('video');
                video.src = file.content;
                video.muted = true;
                return video;
            }
            break;

        case 'audio':
            const audioDiv = document.createElement('div');
            audioDiv.textContent = '🎵 Audio';
            audioDiv.style.fontSize = '2em';
            audioDiv.style.textAlign = 'center';
            return audioDiv;

        case 'svg':
            if (file.content) {
                const svgContainer = document.createElement('div');
                svgContainer.innerHTML = file.content;
                const svg = svgContainer.querySelector('svg');
                if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.maxHeight = '80px';
                    svg.style.background = 'white';
                    svg.removeAttribute('id'); // Prevent duplicate IDs
                }
                return svgContainer;
            }
            break;

        case 'text':
        default:
            const textDiv = document.createElement('div');
            textDiv.textContent = truncateText(file.content, 80);
            textDiv.style.fontSize = '0.8em';
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.style.overflow = 'hidden';
            return textDiv;
    }

    // Fallback
    const fallback = document.createElement('div');
    fallback.textContent = `[${type}]`;
    return fallback;
}

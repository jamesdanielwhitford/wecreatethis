// Note editor component - create/edit files
import { getFile, saveFile } from '../db.js';
import { renderAssets } from './assetView.js';

let currentFile = null;
let currentFolderId = null;
let uploadedContent = '';
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let capturedLocation = null;

export async function openEditor(fileId, folderId) {
    currentFolderId = folderId;
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');

    if (fileId) {
        // Edit existing file
        currentFile = await getFile(fileId);
        capturedLocation = currentFile.location || null;
        renderEditorForType(modalBody, currentFile.type, currentFile);
    } else {
        // New file - show type selector and capture location
        currentFile = null;
        capturedLocation = null;
        captureCurrentLocation();
        renderTypeSelector(modalBody);
    }

    modal.classList.remove('hidden');
}

function captureCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            // Try to get place name
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                );
                const data = await response.json();
                const shortName = data.address?.city || data.address?.town ||
                                  data.address?.village || data.address?.county ||
                                  data.display_name?.split(',')[0] || '';
                capturedLocation = JSON.stringify({ lat: latitude, lng: longitude, name: shortName });
            } catch (e) {
                capturedLocation = JSON.stringify({ lat: latitude, lng: longitude });
            }
        },
        () => {
            // Location capture failed silently
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function closeEditor() {
    // Stop any active media streams
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    mediaRecorder = null;
    recordedChunks = [];
    uploadedContent = '';
    capturedLocation = null;

    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    currentFile = null;
}

function renderTypeSelector(container) {
    container.innerHTML = `
        <h3>Create New File</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0;">
            <button data-type="text">📝 Text</button>
            <button data-type="image">🖼️ Image</button>
            <button data-type="video">🎬 Video</button>
            <button data-type="audio">🎵 Audio</button>
            <button data-type="svg">✏️ SVG Drawing</button>
        </div>
        <button onclick="this.closest('.modal').classList.add('hidden')">Cancel</button>
    `;

    container.querySelectorAll('[data-type]').forEach(btn => {
        btn.onclick = () => {
            renderEditorForType(container, btn.dataset.type, null);
        };
    });
}

function renderEditorForType(container, type, file) {
    const name = file?.name || '';
    const content = file?.content || '';

    switch (type) {
        case 'text':
            renderTextEditor(container, name, content);
            break;
        case 'image':
            renderImageEditor(container, name, content);
            break;
        case 'video':
            renderVideoEditor(container, name, content);
            break;
        case 'audio':
            renderAudioEditor(container, name, content);
            break;
        case 'svg':
            renderSvgEditor(container, name, content);
            break;
        default:
            renderTextEditor(container, name, content);
    }
}

function renderTextEditor(container, name, content) {
    container.innerHTML = `
        <h3>${currentFile ? 'Edit' : 'New'} Text Note</h3>
        <input type="text" id="fileName" placeholder="File name" value="${escapeHtml(name)}">
        <textarea id="fileContent" placeholder="Enter your text...">${escapeHtml(content)}</textarea>
        <div>
            <button id="saveBtn">Save</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    `;

    container.querySelector('#saveBtn').onclick = () => saveTextFile();
    container.querySelector('#cancelBtn').onclick = closeEditor;
}

function renderImageEditor(container, name, content) {
    container.innerHTML = `
        <h3>${currentFile ? 'Edit' : 'New'} Image</h3>
        <input type="text" id="fileName" placeholder="File name" value="${escapeHtml(name)}">
        <div style="margin: 10px 0;">
            <button id="captureBtn">📷 Take Photo</button>
            <input type="file" id="fileInput" accept="image/*" style="margin-left: 10px;">
        </div>
        <div id="cameraContainer" style="display: none; margin: 10px 0;">
            <video id="cameraPreview" autoplay playsinline style="max-width: 300px;"></video>
            <br>
            <button id="snapBtn">Capture</button>
            <button id="stopCameraBtn">Cancel</button>
        </div>
        <div id="imagePreview" style="margin: 10px 0;">
            ${content ? `<img src="${content}" style="max-width: 300px; max-height: 300px;">` : ''}
        </div>
        <div>
            <button id="saveBtn">Save</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    `;

    container.querySelector('#fileInput').onchange = handleImageUpload;
    container.querySelector('#captureBtn').onclick = startCamera;
    container.querySelector('#snapBtn').onclick = capturePhoto;
    container.querySelector('#stopCameraBtn').onclick = stopCamera;
    container.querySelector('#saveBtn').onclick = () => saveMediaFile('image');
    container.querySelector('#cancelBtn').onclick = closeEditor;
}

function renderVideoEditor(container, name, content) {
    container.innerHTML = `
        <h3>${currentFile ? 'Edit' : 'New'} Video</h3>
        <input type="text" id="fileName" placeholder="File name" value="${escapeHtml(name)}">
        <div style="margin: 10px 0;">
            <button id="recordVideoBtn">🎬 Record Video</button>
            <input type="file" id="fileInput" accept="video/*" style="margin-left: 10px;">
        </div>
        <div id="videoRecordContainer" style="display: none; margin: 10px 0;">
            <video id="videoRecordPreview" autoplay playsinline muted style="max-width: 300px;"></video>
            <br>
            <button id="startRecordBtn">⏺ Start</button>
            <button id="stopRecordBtn" disabled>⏹ Stop</button>
            <button id="cancelRecordBtn">Cancel</button>
        </div>
        <div id="videoPreview" style="margin: 10px 0;">
            ${content ? `<video src="${content}" controls style="max-width: 300px;"></video>` : ''}
        </div>
        <div>
            <button id="saveBtn">Save</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    `;

    container.querySelector('#fileInput').onchange = handleVideoUpload;
    container.querySelector('#recordVideoBtn').onclick = startVideoRecorder;
    container.querySelector('#startRecordBtn').onclick = startVideoRecording;
    container.querySelector('#stopRecordBtn').onclick = stopVideoRecording;
    container.querySelector('#cancelRecordBtn').onclick = stopVideoRecorder;
    container.querySelector('#saveBtn').onclick = () => saveMediaFile('video');
    container.querySelector('#cancelBtn').onclick = closeEditor;
}

function renderAudioEditor(container, name, content) {
    container.innerHTML = `
        <h3>${currentFile ? 'Edit' : 'New'} Audio</h3>
        <input type="text" id="fileName" placeholder="File name" value="${escapeHtml(name)}">
        <div style="margin: 10px 0;">
            <button id="recordAudioBtn">🎤 Record Audio</button>
            <input type="file" id="fileInput" accept="audio/*" style="margin-left: 10px;">
        </div>
        <div id="audioRecordContainer" style="display: none; margin: 10px 0;">
            <div id="audioRecordStatus">Ready to record...</div>
            <button id="startAudioBtn">⏺ Start</button>
            <button id="stopAudioBtn" disabled>⏹ Stop</button>
            <button id="cancelAudioBtn">Cancel</button>
        </div>
        <div id="audioPreview" style="margin: 10px 0;">
            ${content ? `<audio src="${content}" controls></audio>` : ''}
        </div>
        <div>
            <button id="saveBtn">Save</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    `;

    container.querySelector('#fileInput').onchange = handleAudioUpload;
    container.querySelector('#recordAudioBtn').onclick = startAudioRecorder;
    container.querySelector('#startAudioBtn').onclick = startAudioRecording;
    container.querySelector('#stopAudioBtn').onclick = stopAudioRecording;
    container.querySelector('#cancelAudioBtn').onclick = stopAudioRecorder;
    container.querySelector('#saveBtn').onclick = () => saveMediaFile('audio');
    container.querySelector('#cancelBtn').onclick = closeEditor;
}

function renderSvgEditor(container, name, content) {
    container.innerHTML = `
        <h3>${currentFile ? 'Edit' : 'New'} SVG Drawing</h3>
        <input type="text" id="fileName" placeholder="File name" value="${escapeHtml(name)}">
        <div style="margin: 10px 0;">
            <label>Stroke: <input type="color" id="strokeColor" value="#000000"></label>
            <label>Width: <input type="number" id="strokeWidth" value="2" min="1" max="20" style="width: 50px;"></label>
            <button id="clearCanvas">Clear</button>
        </div>
        <svg id="svgCanvas" width="400" height="300" style="background: white;"></svg>
        <div>
            <button id="saveBtn">Save</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    `;

    initSvgCanvas(content);
    container.querySelector('#clearCanvas').onclick = clearSvgCanvas;
    container.querySelector('#saveBtn').onclick = saveSvgFile;
    container.querySelector('#cancelBtn').onclick = closeEditor;
}

// SVG Drawing
let isDrawing = false;
let currentPath = null;
let pathData = '';

function initSvgCanvas(existingContent) {
    // Query within modal to avoid conflicts with preview SVGs
    const modal = document.getElementById('modalBody');
    const svg = modal.querySelector('#svgCanvas');

    // Load existing content
    if (existingContent) {
        const temp = document.createElement('div');
        temp.innerHTML = existingContent;
        const existingSvg = temp.querySelector('svg');
        if (existingSvg) {
            svg.innerHTML = existingSvg.innerHTML;
        }
    }

    svg.onmousedown = startDrawing;
    svg.onmousemove = draw;
    svg.onmouseup = stopDrawing;
    svg.onmouseleave = stopDrawing;

    // Touch support
    svg.ontouchstart = (e) => { e.preventDefault(); startDrawing(e.touches[0]); };
    svg.ontouchmove = (e) => { e.preventDefault(); draw(e.touches[0]); };
    svg.ontouchend = stopDrawing;
}

function getSvgCanvas() {
    const modal = document.getElementById('modalBody');
    return modal.querySelector('#svgCanvas');
}

function startDrawing(e) {
    isDrawing = true;
    const svg = getSvgCanvas();
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const strokeColor = document.getElementById('strokeColor').value;
    const strokeWidth = document.getElementById('strokeWidth').value;

    currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    currentPath.setAttribute('stroke', strokeColor);
    currentPath.setAttribute('stroke-width', strokeWidth);
    currentPath.setAttribute('fill', 'none');
    currentPath.setAttribute('stroke-linecap', 'round');
    currentPath.setAttribute('stroke-linejoin', 'round');

    pathData = `M ${x} ${y}`;
    currentPath.setAttribute('d', pathData);
    svg.appendChild(currentPath);
}

function draw(e) {
    if (!isDrawing || !currentPath) return;

    const svg = getSvgCanvas();
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pathData += ` L ${x} ${y}`;
    currentPath.setAttribute('d', pathData);
}

function stopDrawing() {
    isDrawing = false;
    currentPath = null;
    pathData = '';
}

function clearSvgCanvas() {
    const svg = getSvgCanvas();
    svg.innerHTML = '';
}

// Camera/Video/Audio capture

// Photo capture
async function startCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        const video = document.getElementById('cameraPreview');
        video.srcObject = mediaStream;
        document.getElementById('cameraContainer').style.display = 'block';
    } catch (err) {
        alert('Could not access camera: ' + err.message);
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    uploadedContent = canvas.toDataURL('image/jpeg', 0.9);
    document.getElementById('imagePreview').innerHTML =
        `<img src="${uploadedContent}" style="max-width: 300px; max-height: 300px;">`;

    stopCamera();

    const nameInput = document.getElementById('fileName');
    if (!nameInput.value) {
        nameInput.value = `photo_${Date.now()}.jpg`;
    }
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    document.getElementById('cameraContainer').style.display = 'none';
}

// Video recording
async function startVideoRecorder() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: true
        });
        const video = document.getElementById('videoRecordPreview');
        video.srcObject = mediaStream;
        document.getElementById('videoRecordContainer').style.display = 'block';
    } catch (err) {
        alert('Could not access camera/microphone: ' + err.message);
    }
}

function startVideoRecording() {
    recordedChunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };

    try {
        mediaRecorder = new MediaRecorder(mediaStream, options);
    } catch (e) {
        // Fallback for browsers that don't support vp9
        mediaRecorder = new MediaRecorder(mediaStream);
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => {
            uploadedContent = reader.result;
            document.getElementById('videoPreview').innerHTML =
                `<video src="${uploadedContent}" controls style="max-width: 300px;"></video>`;
        };
        reader.readAsDataURL(blob);

        const nameInput = document.getElementById('fileName');
        if (!nameInput.value) {
            nameInput.value = `video_${Date.now()}.webm`;
        }
    };

    mediaRecorder.start();
    document.getElementById('startRecordBtn').disabled = true;
    document.getElementById('stopRecordBtn').disabled = false;
}

function stopVideoRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    stopVideoRecorder();
}

function stopVideoRecorder() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    document.getElementById('videoRecordContainer').style.display = 'none';
    document.getElementById('startRecordBtn').disabled = false;
    document.getElementById('stopRecordBtn').disabled = true;
}

// Audio recording
async function startAudioRecorder() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('audioRecordContainer').style.display = 'block';
        document.getElementById('audioRecordStatus').textContent = 'Ready to record...';
    } catch (err) {
        alert('Could not access microphone: ' + err.message);
    }
}

function startAudioRecording() {
    recordedChunks = [];
    const options = { mimeType: 'audio/webm;codecs=opus' };

    try {
        mediaRecorder = new MediaRecorder(mediaStream, options);
    } catch (e) {
        mediaRecorder = new MediaRecorder(mediaStream);
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
            uploadedContent = reader.result;
            document.getElementById('audioPreview').innerHTML =
                `<audio src="${uploadedContent}" controls></audio>`;
        };
        reader.readAsDataURL(blob);

        const nameInput = document.getElementById('fileName');
        if (!nameInput.value) {
            nameInput.value = `audio_${Date.now()}.webm`;
        }
    };

    mediaRecorder.start();
    document.getElementById('audioRecordStatus').textContent = '🔴 Recording...';
    document.getElementById('startAudioBtn').disabled = true;
    document.getElementById('stopAudioBtn').disabled = false;
}

function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    stopAudioRecorder();
}

function stopAudioRecorder() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    document.getElementById('audioRecordContainer').style.display = 'none';
    document.getElementById('startAudioBtn').disabled = false;
    document.getElementById('stopAudioBtn').disabled = true;
}

// File upload handlers
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedContent = event.target.result;
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${uploadedContent}" style="max-width: 300px; max-height: 300px;">`;

        // Auto-fill filename if empty
        const nameInput = document.getElementById('fileName');
        if (!nameInput.value) {
            nameInput.value = file.name;
        }
    };
    reader.readAsDataURL(file);
}

function handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedContent = event.target.result;
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = `<video src="${uploadedContent}" controls style="max-width: 300px;"></video>`;

        const nameInput = document.getElementById('fileName');
        if (!nameInput.value) {
            nameInput.value = file.name;
        }
    };
    reader.readAsDataURL(file);
}

function handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedContent = event.target.result;
        const preview = document.getElementById('audioPreview');
        preview.innerHTML = `<audio src="${uploadedContent}" controls></audio>`;

        const nameInput = document.getElementById('fileName');
        if (!nameInput.value) {
            nameInput.value = file.name;
        }
    };
    reader.readAsDataURL(file);
}

// Save handlers
async function saveTextFile() {
    const name = document.getElementById('fileName').value.trim() || 'Untitled.txt';
    const content = document.getElementById('fileContent').value;

    await saveFile({
        id: currentFile?.id,
        name,
        type: 'text',
        content,
        folderId: currentFolderId,
        dateCreated: currentFile?.dateCreated,
        location: capturedLocation || currentFile?.location || ''
    });

    closeEditor();
    await renderAssets(currentFolderId);
}

async function saveMediaFile(type) {
    const name = document.getElementById('fileName').value.trim() || `Untitled.${type}`;
    const content = uploadedContent || currentFile?.content || '';

    await saveFile({
        id: currentFile?.id,
        name,
        type,
        content,
        folderId: currentFolderId,
        dateCreated: currentFile?.dateCreated,
        location: capturedLocation || currentFile?.location || ''
    });

    uploadedContent = '';
    closeEditor();
    await renderAssets(currentFolderId);
}

async function saveSvgFile() {
    const name = document.getElementById('fileName').value.trim() || 'Drawing.svg';
    const svg = getSvgCanvas();
    // Clone and remove the ID to avoid duplicate ID issues in preview
    const clone = svg.cloneNode(true);
    clone.removeAttribute('id');
    // Ensure white background is preserved
    clone.setAttribute('style', 'background: white;');
    const content = clone.outerHTML;

    await saveFile({
        id: currentFile?.id,
        name,
        type: 'svg',
        content,
        folderId: currentFolderId,
        dateCreated: currentFile?.dateCreated,
        location: capturedLocation || currentFile?.location || ''
    });

    closeEditor();
    await renderAssets(currentFolderId);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;');
}

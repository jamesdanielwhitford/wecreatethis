// Sync UI component: button, modal, QR display/scanning

import { PeerConnection } from '../sync/webrtc.js';
import { SyncManager } from '../sync/sync.js';
import { encodeForQR, decodeFromQR, generateQRCode, startQRScanner, isQRScannerSupported } from '../sync/signaling.js';

let syncManager = null;
let peer = null;
let isInitiator = false;
let cleanupScanner = null;

export function initSyncUI() {
    // Add sync button to header
    const header = document.querySelector('header');
    if (!header) {
        console.error('Header not found for sync button');
        return;
    }

    const syncBtn = document.createElement('button');
    syncBtn.id = 'syncBtn';
    syncBtn.textContent = 'Sync';
    syncBtn.style.marginLeft = '10px';
    header.appendChild(syncBtn);

    syncBtn.onclick = openSyncModal;

    // Create sync modal
    const modal = document.createElement('div');
    modal.id = 'syncModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div id="syncModalBody"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeSyncModal();
        }
    };
}

function openSyncModal() {
    const modal = document.getElementById('syncModal');
    const body = document.getElementById('syncModalBody');

    body.innerHTML = `
        <h3 style="margin-top: 0;">Sync Devices</h3>
        <p>Pair with another device to sync files:</p>

        <div style="display: flex; gap: 10px; margin: 20px 0;">
            <button id="showQRBtn" style="flex: 1;">Show QR Code</button>
            <button id="scanQRBtn" style="flex: 1;">Scan QR Code</button>
        </div>

        <div id="syncStatus" style="color: #666; margin: 10px 0;"></div>

        <div id="qrContainer" style="display: none; text-align: center; margin: 20px 0;">
            <canvas id="qrCanvas" style="max-width: 100%;"></canvas>
            <p id="qrInstruction" style="margin-top: 10px; color: #666;"></p>
        </div>

        <div id="scanContainer" style="display: none; text-align: center; margin: 20px 0;">
            <video id="scanVideo" autoplay playsinline
                   style="max-width: 100%; border-radius: 8px; background: #000;"></video>
            <p style="margin-top: 10px; color: #666;">Point camera at QR code</p>
        </div>

        <div id="syncProgress" style="display: none; margin: 20px 0;">
            <div id="progressText" style="margin-bottom: 10px;"></div>
            <progress id="progressBar" value="0" max="100" style="width: 100%;"></progress>
        </div>

        <div style="margin-top: 20px; text-align: right;">
            <button id="closeSyncBtn">Close</button>
        </div>
    `;

    body.querySelector('#showQRBtn').onclick = startAsInitiator;
    body.querySelector('#scanQRBtn').onclick = startAsReceiver;
    body.querySelector('#closeSyncBtn').onclick = closeSyncModal;

    // Check scanner support
    if (!isQRScannerSupported()) {
        const scanBtn = body.querySelector('#scanQRBtn');
        scanBtn.disabled = true;
        scanBtn.title = 'QR scanning not supported in this browser';
    }

    modal.classList.remove('hidden');
}

async function startAsInitiator() {
    isInitiator = true;
    updateUI('Creating connection...');

    try {
        peer = new PeerConnection();
        await peer.createConnection(true);

        peer.onDataChannelOpen = () => {
            startSyncProcess();
        };

        const offer = await peer.createOffer();
        const qrData = encodeForQR(offer);

        // Check if QR data is too large
        if (qrData.length > 3000) {
            console.warn('QR data is large:', qrData.length, 'bytes');
        }

        // Generate QR code
        const canvas = document.getElementById('qrCanvas');
        await generateQRCode(qrData, canvas);

        document.getElementById('qrContainer').style.display = 'block';
        document.getElementById('qrInstruction').innerHTML = `
            Have the other device scan this QR code.<br>
            <button id="scanAnswerBtn" style="margin-top: 10px;">Then scan their QR code</button>
        `;

        document.getElementById('scanAnswerBtn').onclick = scanAnswer;

    } catch (e) {
        console.error('Failed to create offer:', e);
        updateUI('Error: ' + e.message);
    }
}

async function startAsReceiver() {
    isInitiator = false;
    updateUI('Starting camera...');

    try {
        document.getElementById('scanContainer').style.display = 'block';

        const video = document.getElementById('scanVideo');
        cleanupScanner = await startQRScanner(video, async (qrData) => {
            await handleScannedOffer(qrData);
        });

        updateUI('Scanning for QR code...');

    } catch (e) {
        console.error('Failed to start scanner:', e);
        updateUI('Error: ' + e.message);
    }
}

async function handleScannedOffer(qrData) {
    // Stop scanning
    if (cleanupScanner) {
        cleanupScanner();
        cleanupScanner = null;
    }
    document.getElementById('scanContainer').style.display = 'none';

    updateUI('Processing offer...');

    try {
        const offer = decodeFromQR(qrData);
        console.log('Scanned SDP type:', offer.type);

        // Verify this is actually an offer
        if (offer.type !== 'offer') {
            throw new Error(`Expected offer but got ${offer.type}. Make sure you're scanning the correct QR code.`);
        }

        peer = new PeerConnection();
        await peer.createConnection(false);

        peer.onDataChannelOpen = () => {
            startSyncProcess();
        };

        const answer = await peer.acceptOffer(offer);
        const answerQR = encodeForQR(answer);

        // Show answer QR
        const canvas = document.getElementById('qrCanvas');
        await generateQRCode(answerQR, canvas);

        document.getElementById('qrContainer').style.display = 'block';
        document.getElementById('qrInstruction').textContent =
            'Have the other device scan this answer QR';

    } catch (e) {
        console.error('Failed to process offer:', e);
        updateUI('Error: Invalid QR code');
    }
}

async function scanAnswer() {
    document.getElementById('qrContainer').style.display = 'none';
    document.getElementById('scanContainer').style.display = 'block';

    updateUI('Scanning for answer...');

    try {
        const video = document.getElementById('scanVideo');
        cleanupScanner = await startQRScanner(video, async (qrData) => {
            await handleScannedAnswer(qrData);
        });

    } catch (e) {
        console.error('Failed to start scanner:', e);
        updateUI('Error: ' + e.message);
    }
}

async function handleScannedAnswer(qrData) {
    // Stop scanning
    if (cleanupScanner) {
        cleanupScanner();
        cleanupScanner = null;
    }
    document.getElementById('scanContainer').style.display = 'none';

    updateUI('Processing answer...');

    try {
        const answer = decodeFromQR(qrData);
        console.log('Scanned SDP type:', answer.type);

        // Verify this is actually an answer
        if (answer.type !== 'answer') {
            throw new Error(`Expected answer but got ${answer.type}. Make sure you're scanning the other device's response QR.`);
        }

        await peer.acceptAnswer(answer);

        updateUI('Connecting...');
        // DataChannel open will trigger startSyncProcess

    } catch (e) {
        console.error('Failed to process answer:', e);
        updateUI('Error: Invalid answer QR code');
    }
}

function startSyncProcess() {
    document.getElementById('qrContainer').style.display = 'none';
    document.getElementById('scanContainer').style.display = 'none';
    document.getElementById('syncProgress').style.display = 'block';

    updateUI('Starting sync...');

    syncManager = new SyncManager();

    syncManager.onStatusChange = (status) => {
        updateUI(status);
    };

    syncManager.onProgress = (msg) => {
        document.getElementById('progressText').textContent = msg;
    };

    syncManager.onComplete = () => {
        document.getElementById('progressText').textContent = 'Sync complete!';
        document.getElementById('progressBar').value = 100;

        // Refresh UI after short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    syncManager.onError = (error) => {
        updateUI('Error: ' + error.message);
    };

    syncManager.startSync(peer);
}

function updateUI(message) {
    const status = document.getElementById('syncStatus');
    if (status) {
        status.textContent = message;
    }
}

function closeSyncModal() {
    // Cleanup
    if (cleanupScanner) {
        cleanupScanner();
        cleanupScanner = null;
    }

    if (syncManager) {
        syncManager.abort();
        syncManager = null;
    }

    if (peer) {
        peer.close();
        peer = null;
    }

    document.getElementById('syncModal').classList.add('hidden');
}

// Export for testing
export { closeSyncModal };

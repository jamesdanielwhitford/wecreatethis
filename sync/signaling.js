// SDP compression and QR code encoding for WebRTC signaling

// Compress SDP by removing unnecessary lines for DataChannel-only use
function compressSDP(sdpContent) {
    const lines = sdpContent.split('\r\n');
    const essential = lines.filter(line => {
        // Remove audio/video codec-specific lines (not needed for DataChannel)
        if (line.startsWith('a=extmap')) return false;
        if (line.startsWith('a=rtcp-fb')) return false;
        if (line.startsWith('a=fmtp')) return false;
        if (line.startsWith('a=rtpmap')) return false;
        if (line.startsWith('a=ssrc')) return false;
        return true;
    });
    return essential.join('\r\n');
}

// Encode SDP for QR code (compress + optional gzip + base64)
export function encodeForQR(sdp) {
    // Extract type and sdp content separately
    let type, sdpContent;
    if (typeof sdp === 'string') {
        type = 'offer';
        sdpContent = sdp;
    } else {
        type = sdp.type;
        sdpContent = sdp.sdp;
    }

    // Compress only the SDP content, not the JSON structure
    const compressedSdp = compressSDP(sdpContent);
    const payload = JSON.stringify({ type, sdp: compressedSdp });

    // Try gzip compression if pako is available
    if (window.pako) {
        try {
            const uint8 = new TextEncoder().encode(payload);
            const gzipped = window.pako.deflate(uint8);
            // Mark as gzipped with 'G:' prefix
            return 'G:' + btoa(String.fromCharCode.apply(null, gzipped));
        } catch (e) {
            console.warn('Gzip compression failed, using plain base64');
        }
    }

    // Fallback to plain base64
    return 'P:' + btoa(payload);
}

// Decode QR data back to SDP
export function decodeFromQR(qrData) {
    try {
        const prefix = qrData.substring(0, 2);
        const data = qrData.substring(2);

        if (prefix === 'G:' && window.pako) {
            // Gzipped data
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const decompressed = window.pako.inflate(bytes, { to: 'string' });
            return parseSDP(decompressed);
        } else if (prefix === 'P:') {
            // Plain base64
            const decoded = atob(data);
            return parseSDP(decoded);
        } else {
            // Legacy format (no prefix) - try plain base64
            const decoded = atob(qrData);
            return parseSDP(decoded);
        }
    } catch (e) {
        console.error('Failed to decode QR data:', e);
        throw new Error('Invalid QR code data');
    }
}

// Parse SDP string into RTCSessionDescription format
function parseSDP(sdpString) {
    // If it's already an object (JSON), return it
    if (sdpString.startsWith('{')) {
        return JSON.parse(sdpString);
    }
    // Otherwise assume it's raw SDP with type prefix
    // Format: "offer:sdp..." or "answer:sdp..."
    const colonIndex = sdpString.indexOf(':');
    if (colonIndex > 0 && colonIndex < 10) {
        return {
            type: sdpString.substring(0, colonIndex),
            sdp: sdpString.substring(colonIndex + 1)
        };
    }
    // Fallback: assume it's an offer
    return { type: 'offer', sdp: sdpString };
}

// Generate QR code to a canvas element
export async function generateQRCode(data, canvas, options = {}) {
    const defaultOptions = {
        errorCorrectionLevel: 'L',  // Low correction = more data capacity
        width: 280,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    };

    const opts = { ...defaultOptions, ...options };

    // QRCode library should be loaded globally from CDN
    if (!window.QRCode) {
        throw new Error('QRCode library not loaded. Add qrcode script to HTML.');
    }

    await window.QRCode.toCanvas(canvas, data, opts);
    return canvas;
}

// Start QR code scanning using camera
export async function startQRScanner(videoElement, onScan) {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    });
    videoElement.srcObject = stream;
    await videoElement.play();

    let scanning = true;

    // Use native BarcodeDetector if available (Chrome 83+)
    if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        const scan = async () => {
            if (!scanning) return;

            try {
                const barcodes = await detector.detect(videoElement);
                if (barcodes.length > 0) {
                    const qrData = barcodes[0].rawValue;
                    onScan(qrData);
                    return; // Stop after first successful scan
                }
            } catch (e) {
                // Continue scanning
            }
            requestAnimationFrame(scan);
        };

        requestAnimationFrame(scan);
    } else {
        // Fallback: use jsQR library if loaded
        const jsQRLib = window.jsQR || (typeof jsQR !== 'undefined' ? jsQR : null);
        if (jsQRLib) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const scan = () => {
                if (!scanning) return;

                if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQRLib(imageData.data, canvas.width, canvas.height);

                    if (code) {
                        onScan(code.data);
                        return;
                    }
                }
                requestAnimationFrame(scan);
            };

            requestAnimationFrame(scan);
        } else {
            throw new Error('No QR scanner available. jsQR library not loaded.');
        }
    }

    // Return cleanup function
    return () => {
        scanning = false;
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    };
}

// Check if QR scanning is supported
export function isQRScannerSupported() {
    return 'BarcodeDetector' in window || 'jsQR' in window || typeof jsQR !== 'undefined';
}

// Get estimated QR capacity for given error correction level
export function getQRCapacity(errorCorrectionLevel = 'L') {
    // Approximate capacity in bytes for QR code version 40
    const capacities = {
        L: 2953,  // Low
        M: 2331,  // Medium
        Q: 1663,  // Quartile
        H: 1273   // High
    };
    return capacities[errorCorrectionLevel] || capacities.L;
}

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

// Encode SDP for QR code (compress + base64)
function encodeForQR(sdp) {
  let type, sdpContent;
  if (typeof sdp === 'string') {
    type = 'offer';
    sdpContent = sdp;
  } else {
    type = sdp.type;
    sdpContent = sdp.sdp;
  }

  // Compress only the SDP content
  const compressedSdp = compressSDP(sdpContent);
  const payload = JSON.stringify({ type, sdp: compressedSdp });

  // Use plain base64 encoding
  return btoa(unescape(encodeURIComponent(payload)));
}

// Decode QR data back to SDP
function decodeFromQR(qrData) {
  try {
    const decoded = decodeURIComponent(escape(atob(qrData)));
    return JSON.parse(decoded);
  } catch (e) {
    console.error('Failed to decode QR data:', e);
    throw new Error('Invalid QR code data');
  }
}

// Generate QR code to a canvas element
async function generateQRCode(data, canvas, options = {}) {
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
    throw new Error('QRCode library not loaded');
  }

  await window.QRCode.toCanvas(canvas, data, opts);
  return canvas;
}

// Start QR code scanning using camera
async function startQRScanner(videoElement, onScan) {
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
    const jsQRLib = window.jsQR;
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
function isQRScannerSupported() {
  return 'BarcodeDetector' in window || 'jsQR' in window;
}

// Export for global use
window.SyncSignaling = {
  encodeForQR,
  decodeFromQR,
  generateQRCode,
  startQRScanner,
  isQRScannerSupported
};

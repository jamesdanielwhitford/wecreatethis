// SDP encoding/decoding for WebRTC signaling

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

// Encode SDP for text transfer (compress + base64)
function encode(sdp) {
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

// Decode text back to SDP
function decode(data) {
  try {
    const decoded = decodeURIComponent(escape(atob(data)));
    return JSON.parse(decoded);
  } catch (e) {
    console.error('Failed to decode data:', e);
    throw new Error('Invalid sync code');
  }
}

// Export for global use (keep old names for compatibility)
window.SyncSignaling = {
  encode,
  decode,
  encodeForQR: encode,  // Alias for compatibility
  decodeFromQR: decode  // Alias for compatibility
};

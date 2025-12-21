// Message types and serialization for WebRTC sync protocol

export const MessageType = {
    // Handshake
    HELLO: 'HELLO',
    HELLO_ACK: 'HELLO_ACK',

    // Sync negotiation
    SYNC_REQUEST: 'SYNC_REQUEST',
    CHANGE_LIST: 'CHANGE_LIST',

    // File transfer
    FILE_REQUEST: 'FILE_REQUEST',
    FILE_HEADER: 'FILE_HEADER',
    FILE_CHUNK: 'FILE_CHUNK',
    FILE_COMPLETE: 'FILE_COMPLETE',
    FILE_ACK: 'FILE_ACK',

    // Folder sync
    FOLDER_DATA: 'FOLDER_DATA',

    // Control
    SYNC_COMPLETE: 'SYNC_COMPLETE',
    ERROR: 'ERROR',
    PING: 'PING',
    PONG: 'PONG'
};

export function createMessage(type, payload) {
    return JSON.stringify({
        type,
        payload,
        timestamp: Date.now()
    });
}

export function parseMessage(data) {
    // Handle both string (JSON) and ArrayBuffer (binary chunk)
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse message:', e);
            return null;
        }
    }
    // Binary data is a file chunk - return with type indicator
    return {
        type: MessageType.FILE_CHUNK,
        payload: data,
        isBinary: true
    };
}

// Validate message has required fields for its type
export function validateMessage(msg) {
    if (!msg || !msg.type) return false;

    switch (msg.type) {
        case MessageType.HELLO:
            return msg.payload?.deviceId && typeof msg.payload?.lastSyncTimestamp === 'number';

        case MessageType.CHANGE_LIST:
            return Array.isArray(msg.payload?.changes);

        case MessageType.FILE_REQUEST:
            return !!msg.payload?.fileId;

        case MessageType.FILE_HEADER:
            return msg.payload?.id && typeof msg.payload?.totalChunks === 'number';

        case MessageType.FILE_COMPLETE:
            return !!msg.payload?.fileId;

        case MessageType.FOLDER_DATA:
            return msg.payload?.id && msg.payload?.name;

        default:
            return true;
    }
}

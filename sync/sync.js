// Sync orchestration and conflict resolution

import { MessageType, createMessage, parseMessage } from './protocol.js';
import { chunkBlob, ChunkAssembler } from './chunker.js';
import * as db from '../db.js';

export class SyncManager {
    constructor() {
        this.peer = null;
        this.syncInProgress = false;
        this.pendingTransfers = new Map();  // fileId -> { header, assembler }
        this.pendingRequests = [];          // Files we need to request
        this.onStatusChange = null;
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.remoteDeviceId = null;
        this.sentChangeList = false;
        this.receivedChangeList = false;
    }

    async startSync(peerConnection) {
        this.peer = peerConnection;
        this.peer.onMessage = (data) => this.handleMessage(data);
        this.syncInProgress = true;
        this.sentChangeList = false;
        this.receivedChangeList = false;

        // Send hello
        const deviceId = await db.getDeviceId();
        const lastSync = await db.getLastSyncTimestamp();

        this.updateStatus('Connecting...');
        this.send(MessageType.HELLO, {
            deviceId,
            lastSyncTimestamp: lastSync,
            protocolVersion: 1
        });
    }

    async handleMessage(data) {
        const msg = parseMessage(data);
        if (!msg) {
            console.error('Failed to parse message');
            return;
        }

        // Handle binary chunk data
        if (msg.isBinary) {
            await this.handleFileChunk(msg.payload);
            return;
        }

        switch (msg.type) {
            case MessageType.HELLO:
                await this.handleHello(msg.payload);
                break;

            case MessageType.HELLO_ACK:
                await this.handleHelloAck(msg.payload);
                break;

            case MessageType.CHANGE_LIST:
                await this.handleChangeList(msg.payload);
                break;

            case MessageType.FILE_REQUEST:
                await this.handleFileRequest(msg.payload);
                break;

            case MessageType.FILE_HEADER:
                await this.handleFileHeader(msg.payload);
                break;

            case MessageType.FILE_COMPLETE:
                await this.handleFileComplete(msg.payload);
                break;

            case MessageType.FOLDER_DATA:
                await this.handleFolderData(msg.payload);
                break;

            case MessageType.SYNC_COMPLETE:
                await this.handleSyncComplete();
                break;

            case MessageType.ERROR:
                this.handleError(msg.payload);
                break;

            case MessageType.PING:
                this.send(MessageType.PONG, {});
                break;
        }
    }

    async handleHello(payload) {
        this.remoteDeviceId = payload.deviceId;
        this.updateStatus('Connected to peer');

        // Acknowledge
        const deviceId = await db.getDeviceId();
        this.send(MessageType.HELLO_ACK, { deviceId });

        // Send our changes
        await this.sendChangeList(payload.lastSyncTimestamp);
    }

    async handleHelloAck(payload) {
        this.remoteDeviceId = payload.deviceId;
        // We already sent HELLO, now we know peer is ready
        // sendChangeList was already called from the remote's HELLO
    }

    async sendChangeList(sinceTimestamp) {
        if (this.sentChangeList) return;
        this.sentChangeList = true;

        this.updateStatus('Preparing changes...');

        // Get all changes since peer's last sync
        const changes = await db.getChangesSince(sinceTimestamp);
        const deviceId = await db.getDeviceId();

        // Build change list with metadata
        const changeList = [];
        for (const change of changes) {
            // Skip changes from the remote device (they already have them)
            if (change.deviceId === this.remoteDeviceId) continue;

            if (change.operation === 'delete') {
                changeList.push({
                    entityType: change.entityType,
                    entityId: change.entityId,
                    operation: 'delete',
                    timestamp: change.timestamp
                });
            } else if (change.entityType === 'folder') {
                const folder = await db.getFolder(change.entityId);
                if (folder) {
                    changeList.push({
                        entityType: 'folder',
                        entityId: change.entityId,
                        operation: change.operation,
                        timestamp: change.timestamp,
                        metadata: {
                            name: folder.name,
                            parentId: folder.parentId,
                            dateCreated: folder.dateCreated,
                            dateModified: folder.dateModified
                        }
                    });
                }
            } else {
                const file = await db.getFileRaw(change.entityId);
                if (file) {
                    changeList.push({
                        entityType: 'file',
                        entityId: change.entityId,
                        operation: change.operation,
                        timestamp: change.timestamp,
                        metadata: {
                            name: file.name,
                            type: file.type,
                            folderId: file.folderId,
                            dateCreated: file.dateCreated,
                            dateModified: file.dateModified,
                            size: file.content ? file.content.length : 0
                        }
                    });
                }
            }
        }

        this.updateProgress(`Sending ${changeList.length} changes`);
        this.send(MessageType.CHANGE_LIST, { changes: changeList });
    }

    async handleChangeList(payload) {
        this.receivedChangeList = true;
        const { changes } = payload;
        this.updateStatus('Processing changes...');

        // Get our local changes for conflict detection
        const localChanges = await db.getUnsynced();
        const localChangeMap = new Map();
        for (const c of localChanges) {
            localChangeMap.set(c.entityId, c);
        }

        let applied = 0;
        let conflicts = 0;

        for (const remoteChange of changes) {
            const localChange = localChangeMap.get(remoteChange.entityId);

            if (localChange) {
                // Conflict: both sides modified the same entity
                if (remoteChange.timestamp > localChange.timestamp) {
                    // Remote wins (last-write-wins)
                    await this.applyRemoteChange(remoteChange);
                    applied++;
                } else {
                    // Local wins, skip remote change
                    conflicts++;
                }
            } else {
                // No conflict, apply remote change
                await this.applyRemoteChange(remoteChange);
                applied++;
            }
        }

        this.updateProgress(`Applied ${applied} changes, ${conflicts} conflicts (local wins)`);

        // Start requesting files serially
        this.requestNextFile();
    }

    async applyRemoteChange(change) {
        if (change.operation === 'delete') {
            await db.applyRemoteDelete(change.entityType, change.entityId);
        } else if (change.entityType === 'folder') {
            // Apply folder directly (folders don't need content transfer)
            await db.applyRemoteFolder({
                id: change.entityId,
                name: change.metadata.name,
                parentId: change.metadata.parentId,
                dateCreated: change.metadata.dateCreated,
                dateModified: change.metadata.dateModified
            });
        } else {
            // File: queue for request (will be processed serially)
            this.pendingRequests.push(change.entityId);
        }
    }

    // Request next file in queue (serial to avoid chunk mixing)
    requestNextFile() {
        if (this.pendingRequests.length > 0 && this.pendingTransfers.size === 0) {
            const fileId = this.pendingRequests[0]; // Don't remove yet, remove on complete
            this.send(MessageType.FILE_REQUEST, { fileId });
        } else if (this.pendingRequests.length === 0 && this.pendingTransfers.size === 0) {
            this.checkSyncComplete();
        }
    }

    async handleFileRequest(payload) {
        const file = await db.getFileRaw(payload.fileId);
        if (!file) {
            this.send(MessageType.ERROR, {
                code: 'FILE_NOT_FOUND',
                message: `File not found: ${payload.fileId}`
            });
            return;
        }

        this.updateProgress(`Sending: ${file.name}`);

        // Chunk the file content
        const chunked = await chunkBlob(file.content, file.id);

        // Send header
        this.send(MessageType.FILE_HEADER, {
            id: file.id,
            name: file.name,
            type: file.type,
            folderId: file.folderId,
            totalSize: chunked.totalSize,
            totalChunks: chunked.totalChunks,
            checksum: chunked.checksum,
            metadata: {
                description: file.description,
                location: file.location,
                tags: file.tags,
                dateCreated: file.dateCreated,
                dateModified: file.dateModified,
                lastAccessed: file.lastAccessed
            }
        });

        // Send chunks with small delay to avoid buffer overflow
        for (let i = 0; i < chunked.chunks.length; i++) {
            this.peer.sendBinary(chunked.chunks[i]);
            // Small delay every 10 chunks
            if (i % 10 === 9) {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        // Send completion
        this.send(MessageType.FILE_COMPLETE, {
            fileId: file.id,
            checksum: chunked.checksum
        });
    }

    async handleFileHeader(payload) {
        this.updateProgress(`Receiving: ${payload.name}`);

        // Prepare to receive chunks
        this.pendingTransfers.set(payload.id, {
            header: payload,
            assembler: new ChunkAssembler(payload.totalChunks, payload.totalSize)
        });
    }

    async handleFileChunk(data) {
        // Find which transfer this chunk belongs to
        for (const [fileId, transfer] of this.pendingTransfers) {
            const complete = transfer.assembler.addChunk(data);

            // Update progress
            const progress = transfer.assembler.getProgress();
            this.updateProgress(`Receiving ${transfer.header.name}: ${Math.round(progress * 100)}%`);

            if (complete) {
                // All chunks received, finalize will happen on FILE_COMPLETE
                break;
            }
        }
    }

    async handleFileComplete(payload) {
        const transfer = this.pendingTransfers.get(payload.fileId);
        if (!transfer) {
            console.warn('Received FILE_COMPLETE for unknown file:', payload.fileId);
            return;
        }

        const { header, assembler } = transfer;

        if (!assembler.isComplete()) {
            console.warn('FILE_COMPLETE received but chunks missing');
            return;
        }

        // Assemble content based on type
        let content;
        if (header.type === 'text' || header.type === 'svg') {
            content = await assembler.assembleAsText();
        } else {
            content = await assembler.assembleAsDataURL();
        }

        // Save to IndexedDB
        await db.applyRemoteFile({
            id: header.id,
            name: header.name,
            type: header.type,
            content,
            folderId: header.folderId,
            description: header.metadata.description,
            location: header.metadata.location,
            tags: header.metadata.tags,
            dateCreated: header.metadata.dateCreated,
            dateModified: header.metadata.dateModified,
            lastAccessed: Date.now()
        });

        this.pendingTransfers.delete(payload.fileId);

        // Remove from pending requests
        const idx = this.pendingRequests.indexOf(payload.fileId);
        if (idx >= 0) this.pendingRequests.splice(idx, 1);

        this.updateProgress(`Received: ${header.name}`);

        // Request next file (or complete if none left)
        this.requestNextFile();
    }

    async handleFolderData(payload) {
        await db.applyRemoteFolder({
            id: payload.id,
            name: payload.name,
            parentId: payload.parentId,
            dateCreated: payload.dateCreated,
            dateModified: payload.dateModified
        });
    }

    checkSyncComplete() {
        // Sync is complete when:
        // 1. We've sent our change list
        // 2. We've received their change list
        // 3. No pending file transfers
        if (this.sentChangeList &&
            this.receivedChangeList &&
            this.pendingRequests.length === 0 &&
            this.pendingTransfers.size === 0) {

            this.send(MessageType.SYNC_COMPLETE, {});
            this.finishSync();
        }
    }

    async handleSyncComplete() {
        this.finishSync();
    }

    async finishSync() {
        if (!this.syncInProgress) return;
        this.syncInProgress = false;

        // Mark all local changes as synced
        const unsynced = await db.getUnsynced();
        await db.markSynced(unsynced.map(c => c.id));

        // Update last sync timestamp
        await db.setLastSyncTimestamp(Date.now());

        this.updateStatus('Sync complete!');

        if (this.onComplete) {
            this.onComplete();
        }
    }

    handleError(payload) {
        console.error('Sync error from peer:', payload);
        this.updateStatus(`Error: ${payload.message}`);
        if (this.onError) {
            this.onError(payload);
        }
    }

    send(type, payload) {
        const msg = createMessage(type, payload);
        return this.peer.send(msg);
    }

    updateStatus(status) {
        console.log('Sync:', status);
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

    updateProgress(message) {
        console.log('Sync progress:', message);
        if (this.onProgress) {
            this.onProgress(message);
        }
    }

    abort() {
        this.syncInProgress = false;
        this.pendingTransfers.clear();
        this.pendingRequests = [];
        if (this.peer) {
            this.peer.close();
            this.peer = null;
        }
    }
}

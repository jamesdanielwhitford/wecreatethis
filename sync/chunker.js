// Blob chunking and reassembly for large file transfers

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export async function chunkBlob(content, fileId) {
    let blob;

    if (typeof content === 'string') {
        if (content.startsWith('data:')) {
            // Convert data URL to Blob
            const response = await fetch(content);
            blob = await response.blob();
        } else {
            // Plain text content
            blob = new Blob([content], { type: 'text/plain' });
        }
    } else if (content instanceof Blob) {
        blob = content;
    } else {
        throw new Error('Unsupported content type');
    }

    const totalSize = blob.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const chunks = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const slice = blob.slice(start, end);
        const arrayBuffer = await slice.arrayBuffer();

        // Create chunk with 8-byte header: [4 bytes index][4 bytes total]
        const header = new ArrayBuffer(8);
        const view = new DataView(header);
        view.setUint32(0, i, true);           // Chunk index (little-endian)
        view.setUint32(4, totalChunks, true); // Total chunks

        // Combine header and data
        const chunk = new Uint8Array(8 + arrayBuffer.byteLength);
        chunk.set(new Uint8Array(header), 0);
        chunk.set(new Uint8Array(arrayBuffer), 8);

        chunks.push(chunk.buffer);
    }

    const checksum = await calculateChecksum(blob);

    return {
        fileId,
        totalSize,
        totalChunks,
        chunks,
        checksum
    };
}

export class ChunkAssembler {
    constructor(totalChunks, totalSize) {
        this.chunks = new Array(totalChunks);
        this.received = 0;
        this.totalChunks = totalChunks;
        this.totalSize = totalSize;
    }

    addChunk(data) {
        // data is an ArrayBuffer with 8-byte header
        const view = new DataView(data);
        const index = view.getUint32(0, true);
        const total = view.getUint32(4, true);
        const content = data.slice(8);

        if (index >= this.totalChunks) {
            console.warn(`Invalid chunk index ${index} for total ${this.totalChunks}`);
            return false;
        }

        if (!this.chunks[index]) {
            this.chunks[index] = content;
            this.received++;
        }

        return this.received === this.totalChunks;
    }

    getProgress() {
        return this.received / this.totalChunks;
    }

    isComplete() {
        return this.received === this.totalChunks;
    }

    async assemble(mimeType = 'application/octet-stream') {
        if (!this.isComplete()) {
            throw new Error(`Missing chunks: ${this.received}/${this.totalChunks}`);
        }
        return new Blob(this.chunks, { type: mimeType });
    }

    async assembleAsDataURL() {
        const blob = await this.assemble();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async assembleAsText() {
        const blob = await this.assemble('text/plain');
        return blob.text();
    }
}

async function calculateChecksum(blob) {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyChecksum(blob, expectedChecksum) {
    const actualChecksum = await calculateChecksum(blob);
    return actualChecksum === expectedChecksum;
}

// Utility functions

export function generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
}

export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getFileType(nameOrMime) {
    const name = nameOrMime.toLowerCase();

    // Check MIME type first
    if (name.startsWith('image/')) return 'image';
    if (name.startsWith('video/')) return 'video';
    if (name.startsWith('audio/')) return 'audio';
    if (name === 'image/svg+xml') return 'svg';
    if (name.startsWith('text/')) return 'text';

    // Check extension
    const ext = name.split('.').pop();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
    const textExts = ['txt', 'md', 'json', 'js', 'css', 'html'];

    if (ext === 'svg') return 'svg';
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (textExts.includes(ext)) return 'text';

    return 'text'; // default
}

export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

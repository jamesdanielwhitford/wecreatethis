// IndexedDB wrapper for storing chess games

const DB_NAME = 'chessle-db';
const DB_VERSION = 1;
const STORE_NAME = 'games';

let db;

// Initialize database
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

// Save a new game
async function saveGame(game) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        const request = objectStore.add(game);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all games
async function getAllGames() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = () => {
            // Sort by updatedAt descending (most recent first)
            const games = request.result.sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            resolve(games);
        };
        request.onerror = () => reject(request.error);
    });
}

// Get a single game by ID
async function getGame(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update an existing game
async function updateGame(game) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put(game);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete a game
async function deleteGame(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Clear all games
async function clearAllGames() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// IndexedDB wrapper for storing chess games

const DB_NAME = 'chessle-db';
const DB_VERSION = 6;
const STORE_NAME = 'games';

let db;

// Generate 8-character hex UUID
function generateUUID() {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

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
            const oldVersion = event.oldVersion;
            const transaction = event.target.transaction;

            if (oldVersion < 1) {
                // Fresh install — create store with UUID keyPath (no autoIncrement)
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            } else if (oldVersion < 2) {
                // Migration from v1 (autoIncrement integer IDs) to v2 (UUID string IDs)
                // Delete old store and recreate — existing games will be lost
                // (This is acceptable during development before any real users)
                db.deleteObjectStore(STORE_NAME);
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            if (oldVersion < 3) {
                // Migration from v2 to v3: Transform game data structure
                // - Add playerName, opponentName fields
                // - Add sharedMoveCount (copy from turnCount)
                // - Add lastSharedBoardState (set to null initially)
                const objectStore = transaction.objectStore(STORE_NAME);
                const getAllRequest = objectStore.getAll();

                getAllRequest.onsuccess = () => {
                    const games = getAllRequest.result;

                    games.forEach(game => {
                        // Determine player and opponent names from old aliases
                        if (game.playerColor === 'white') {
                            game.playerName = game.playerWhiteAlias || 'You';
                            game.opponentName = game.playerBlackAlias || 'Opponent';
                        } else {
                            game.playerName = game.playerBlackAlias || 'You';
                            game.opponentName = game.playerWhiteAlias || 'Opponent';
                        }

                        // Add new fields
                        game.sharedMoveCount = game.turnCount || 0;
                        game.lastSharedBoardState = null;

                        // Keep old fields for now (backwards compatibility during transition)
                        // Will be removed in later step

                        // Update the game in the store
                        objectStore.put(game);
                    });
                };
            }

            if (oldVersion < 4) {
                // Migration from v3 to v4: Add opponentHasResponded field
                // For existing games, assume opponent has responded (safer default)
                const objectStore = transaction.objectStore(STORE_NAME);
                const getAllRequest = objectStore.getAll();

                getAllRequest.onsuccess = () => {
                    const games = getAllRequest.result;

                    games.forEach(game => {
                        // Add opponentHasResponded field
                        // Set to true for existing games (conservative - prevents re-sharing names)
                        // Set to false only if sharedMoveCount is 0 (hasn't shared yet)
                        if (game.opponentHasResponded === undefined) {
                            game.opponentHasResponded = game.sharedMoveCount > 0;
                        }

                        // Update the game in the store
                        objectStore.put(game);
                    });
                };
            }

            if (oldVersion < 5) {
                // Migration from v4 to v5: Add lastOpponentHighlights field
                const objectStore = transaction.objectStore(STORE_NAME);
                const getAllRequest = objectStore.getAll();

                getAllRequest.onsuccess = () => {
                    const games = getAllRequest.result;

                    games.forEach(game => {
                        // Add lastOpponentHighlights field (empty array by default)
                        if (game.lastOpponentHighlights === undefined) {
                            game.lastOpponentHighlights = [];
                        }

                        // Update the game in the store
                        objectStore.put(game);
                    });
                };
            }

            if (oldVersion < 6) {
                // Migration from v5 to v6: Add lastPlayerHighlights field
                const objectStore = transaction.objectStore(STORE_NAME);
                const getAllRequest = objectStore.getAll();

                getAllRequest.onsuccess = () => {
                    const games = getAllRequest.result;

                    games.forEach(game => {
                        // Add lastPlayerHighlights field (null by default)
                        if (game.lastPlayerHighlights === undefined) {
                            game.lastPlayerHighlights = null;
                        }

                        // Update the game in the store
                        objectStore.put(game);
                    });
                };
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

// Get a single game by ID (UUID string)
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

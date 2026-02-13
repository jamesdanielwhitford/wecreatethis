// tile-cache.js — Lazy tile caching via IndexedDB + MapLibre custom protocol

const TileCache = {
  db: null,
  DB_NAME: 'perfectday-tiles',
  DB_VERSION: 2,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('resources')) {
          db.createObjectStore('resources', { keyPath: 'key' });
        }
      };
    });
  },

  async ready() {
    if (!this.db) await this.init();
    return this.db;
  },

  async getTile(key) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readonly');
      const request = tx.objectStore('tiles').get(key);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTile(key, data) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readwrite');
      const request = tx.objectStore('tiles').put({
        key: key,
        data: data,
        cachedAt: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getStats() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readonly');
      const store = tx.objectStore('tiles');
      const countReq = store.count();
      let totalSize = 0;

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.data) {
            totalSize += cursor.value.data.byteLength || 0;
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        resolve({ count: countReq.result, sizeBytes: totalSize });
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearAll() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readwrite');
      const request = tx.objectStore('tiles').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Cache non-tile resources (style JSON, sprites, glyphs) in IndexedDB too
  async getResource(key) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resources', 'readonly');
      const request = tx.objectStore('resources').get(key);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveResource(key, data) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resources', 'readwrite');
      const request = tx.objectStore('resources').put({
        key: key,
        data: data,
        cachedAt: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Register custom protocol with MapLibre to intercept tile requests
  registerProtocol() {
    maplibregl.addProtocol('cached', async (params, abortController) => {
      const url = params.url.replace('cached://', 'https://');

      // Extract z/x/y from tile URL
      const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(pbf|mvt)/);
      if (!match) {
        // Non-tile request (style, sprite, glyphs) — try network, fall back to cache
        try {
          const response = await fetch(url, { signal: abortController.signal });
          const data = await response.arrayBuffer();
          // Cache for offline use
          this.saveResource(url, data).catch(() => {});
          return { data };
        } catch (e) {
          // Offline — try cached version
          const cached = await this.getResource(url);
          if (cached) return { data: cached };
          throw e;
        }
      }

      const tileKey = `${match[1]}/${match[2]}/${match[3]}`;

      // Try cache first
      try {
        const cached = await this.getTile(tileKey);
        if (cached) {
          return { data: cached };
        }
      } catch (e) {
        // Cache read failed, fall through to network
      }

      // Fetch from network
      try {
        const response = await fetch(url, { signal: abortController.signal });
        const data = await response.arrayBuffer();

        // Cache the tile (don't await — fire and forget)
        this.saveTile(tileKey, data).catch(() => {});

        return { data };
      } catch (e) {
        // Offline and tile not cached — return empty tile instead of crashing
        return { data: new ArrayBuffer(0) };
      }
    });
  }
};

// Bird Bingo IndexedDB Module
const DB_NAME = 'bird-bingo-db';
const DB_VERSION = 1;

function generateSyncId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const BingoDB = {
  db: null,

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Sightings - every logged sighting. Life list is derived from this.
        if (!db.objectStoreNames.contains('sightings')) {
          const sightingsStore = db.createObjectStore('sightings', { keyPath: 'id', autoIncrement: true });
          sightingsStore.createIndex('speciesCode', 'speciesCode');
          sightingsStore.createIndex('date', 'date');
          sightingsStore.createIndex('syncId', 'syncId', { unique: true });
        }

        // Bingo cards - both daily and practice cards live here
        if (!db.objectStoreNames.contains('bingo_cards')) {
          const cardsStore = db.createObjectStore('bingo_cards', { keyPath: 'id', autoIncrement: true });
          cardsStore.createIndex('createdAt', 'createdAt');
          cardsStore.createIndex('mode', 'mode'); // 'daily' | 'practice'
          cardsStore.createIndex('dateKey', 'dateKey'); // YYYY-MM-DD, only set for daily cards
        }
      };
    });
  },

  async ready() {
    if (!this.db) await this.init();
    return this.db;
  },

  // ---------- Sightings ----------

  async addSighting(data) {
    const db = await this.ready();
    const sighting = {
      syncId: data.syncId || generateSyncId(),
      speciesCode: data.speciesCode,
      comName: data.comName,
      sciName: data.sciName || '',
      date: data.date,
      lat: typeof data.lat === 'number' ? data.lat : null,
      lng: typeof data.lng === 'number' ? data.lng : null,
      notes: data.notes || '',
      createdAt: data.createdAt || new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sightings'], 'readwrite');
      const store = tx.objectStore('sightings');
      const req = store.add(sighting);
      req.onsuccess = () => resolve({ ...sighting, id: req.result });
      req.onerror = () => reject(req.error);
    });
  },

  async deleteSighting(id) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sightings'], 'readwrite');
      const store = tx.objectStore('sightings');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getAllSightings() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sightings'], 'readonly');
      const store = tx.objectStore('sightings');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getSightingsForSpecies(speciesCode) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sightings'], 'readonly');
      const store = tx.objectStore('sightings');
      const index = store.index('speciesCode');
      const req = index.getAll(speciesCode);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // Was this species already on the life list BEFORE this sighting id was added?
  // Used to decide whether a newly logged sighting is a "lifer".
  async isFirstSightingOfSpecies(speciesCode, excludeId) {
    const existing = await this.getSightingsForSpecies(speciesCode);
    const others = existing.filter(s => s.id !== excludeId);
    return others.length === 0;
  },

  async deleteAllSightingsForSpecies(speciesCode) {
    const all = await this.getSightingsForSpecies(speciesCode);
    for (const s of all) {
      await this.deleteSighting(s.id);
    }
  },

  // ---------- Life list (derived view over sightings) ----------

  async getLifeList() {
    const sightings = await this.getAllSightings();
    const map = new Map();
    sightings.forEach(s => {
      if (!map.has(s.speciesCode)) {
        map.set(s.speciesCode, {
          speciesCode: s.speciesCode,
          comName: s.comName,
          sciName: s.sciName,
          count: 0,
          firstDate: s.date
        });
      }
      const entry = map.get(s.speciesCode);
      entry.count++;
      if (s.date < entry.firstDate) entry.firstDate = s.date;
    });
    return Array.from(map.values()).sort((a, b) => a.comName.localeCompare(b.comName));
  },

  async isOnLifeList(speciesCode) {
    const sightings = await this.getSightingsForSpecies(speciesCode);
    return sightings.length > 0;
  },

  async getLifeListSpeciesCodes() {
    const list = await this.getLifeList();
    return new Set(list.map(b => b.speciesCode));
  },

  // ---------- Bingo cards ----------

  async createBingoCard(data) {
    const db = await this.ready();
    const card = {
      mode: data.mode, // 'daily' | 'practice'
      dateKey: data.dateKey || null,
      size: data.size || 3,
      hardMode: !!data.hardMode,
      lat: data.lat,
      lng: data.lng,
      regionName: data.regionName || null,
      birds: data.birds || [], // [{speciesCode, comName, sciName, metric}]
      createdAt: data.createdAt || new Date().toISOString(),
      completedAt: null,
      completedInSeconds: null
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readwrite');
      const store = tx.objectStore('bingo_cards');
      const req = store.add(card);
      req.onsuccess = () => resolve({ ...card, id: req.result });
      req.onerror = () => reject(req.error);
    });
  },

  async getBingoCard(id) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readonly');
      const store = tx.objectStore('bingo_cards');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async updateBingoCard(card) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readwrite');
      const store = tx.objectStore('bingo_cards');
      const req = store.put(card);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async deleteBingoCard(id) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readwrite');
      const store = tx.objectStore('bingo_cards');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getAllPracticeCards() {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readonly');
      const store = tx.objectStore('bingo_cards');
      const index = store.index('mode');
      const req = index.getAll('practice');
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      req.onerror = () => reject(req.error);
    });
  },

  async getDailyCardForDate(dateKey) {
    const db = await this.ready();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['bingo_cards'], 'readonly');
      const store = tx.objectStore('bingo_cards');
      const index = store.index('dateKey');
      const req = index.getAll(dateKey);
      req.onsuccess = () => {
        const results = (req.result || []).filter(c => c.mode === 'daily');
        resolve(results.length > 0 ? results[results.length - 1] : null);
      };
      req.onerror = () => reject(req.error);
    });
  }
};

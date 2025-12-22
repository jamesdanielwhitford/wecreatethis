// Birdle IndexedDB Module
// Centralized bird caching system

const DB_NAME = 'birdle-db';
const DB_VERSION = 1;

const BirdDB = {
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

        // Birds store - cached bird data
        if (!db.objectStoreNames.contains('birds')) {
          const birdsStore = db.createObjectStore('birds', { keyPath: 'speciesCode' });
          birdsStore.createIndex('lastViewed', 'lastViewed');
          birdsStore.createIndex('hasSightings', 'hasSightings');
          birdsStore.createIndex('continent', 'continent');
        }

        // Sightings store - individual sighting records
        if (!db.objectStoreNames.contains('sightings')) {
          const sightingsStore = db.createObjectStore('sightings', { keyPath: 'id', autoIncrement: true });
          sightingsStore.createIndex('speciesCode', 'speciesCode');
          sightingsStore.createIndex('date', 'date');
          sightingsStore.createIndex('regionCode', 'regionCode');
        }

        // Cache metadata store - tracks which birds belong to which cache
        if (!db.objectStoreNames.contains('cache_meta')) {
          db.createObjectStore('cache_meta', { keyPath: 'key' });
        }
      };
    });
  },

  async ready() {
    if (!this.db) await this.init();
    return this.db;
  },

  // ===== BIRD OPERATIONS =====

  async getBird(speciesCode) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('birds', 'readonly');
      const request = tx.objectStore('birds').get(speciesCode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getBirds(speciesCodes) {
    await this.ready();
    const results = [];
    for (const code of speciesCodes) {
      const bird = await this.getBird(code);
      if (bird) results.push(bird);
    }
    return results;
  },

  async cacheBird(birdData, source = 'search') {
    await this.ready();
    const existing = await this.getBird(birdData.speciesCode);

    const bird = {
      speciesCode: birdData.speciesCode,
      comName: birdData.comName,
      sciName: birdData.sciName || existing?.sciName || '',
      familyName: birdData.familyName || existing?.familyName || null,
      continent: birdData.continent || existing?.continent || null,
      regions: [...new Set([...(existing?.regions || []), ...(birdData.regions || [])])],
      lastViewed: source === 'search' ? new Date() : (existing?.lastViewed || new Date()),
      viewCount: (existing?.viewCount || 0) + (source === 'search' ? 1 : 0),
      hasSightings: birdData.hasSightings || existing?.hasSightings || false,
      cachedAt: existing?.cachedAt || new Date(),
      source: source
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('birds', 'readwrite');
      const request = tx.objectStore('birds').put(bird);
      request.onsuccess = () => resolve(bird);
      request.onerror = () => reject(request.error);
    });
  },

  async cacheBirdsFromGame(birds, gameId, regionCode) {
    await this.ready();
    const codes = [];

    for (const bird of birds) {
      await this.cacheBird({
        speciesCode: bird.speciesCode,
        comName: bird.comName,
        sciName: bird.sciName,
        regions: [regionCode]
      }, 'game');
      codes.push(bird.speciesCode);
    }

    // Store cache metadata
    await this.setCacheMeta(`game_${gameId}_birds`, codes);
    return codes;
  },

  async updateBirdViewed(speciesCode) {
    await this.ready();
    const bird = await this.getBird(speciesCode);
    if (bird) {
      bird.lastViewed = new Date();
      bird.viewCount = (bird.viewCount || 0) + 1;
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('birds', 'readwrite');
        const request = tx.objectStore('birds').put(bird);
        request.onsuccess = () => resolve(bird);
        request.onerror = () => reject(request.error);
      });
    }
    return null;
  },

  async getRecentlyViewedBirds(limit = 100) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('birds', 'readonly');
      const store = tx.objectStore('birds');
      const index = store.index('lastViewed');
      const request = index.openCursor(null, 'prev');

      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getAllBirds() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('birds', 'readonly');
      const request = tx.objectStore('birds').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBird(speciesCode) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('birds', 'readwrite');
      const request = tx.objectStore('birds').delete(speciesCode);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ===== SIGHTING OPERATIONS =====

  async addSighting(sightingData) {
    await this.ready();

    const sighting = {
      speciesCode: sightingData.speciesCode,
      comName: sightingData.comName,
      sciName: sightingData.sciName || '',
      date: sightingData.date,
      time: sightingData.time || null,
      regionCode: sightingData.regionCode,
      regionName: sightingData.regionName,
      lat: sightingData.lat || null,
      lng: sightingData.lng || null,
      notes: sightingData.notes || '',
      createdAt: new Date()
    };

    // Add sighting
    const id = await new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readwrite');
      const request = tx.objectStore('sightings').add(sighting);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Update bird cache to mark as having sightings
    const bird = await this.getBird(sightingData.speciesCode);
    const continent = this.getContinent(sightingData.regionCode);

    if (bird) {
      bird.hasSightings = true;
      bird.continent = bird.continent || continent;
      if (!bird.regions) bird.regions = [];
      if (!bird.regions.includes(sightingData.regionCode)) {
        bird.regions.push(sightingData.regionCode);
      }
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('birds', 'readwrite');
        const request = tx.objectStore('birds').put(bird);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      // Cache bird if not already cached
      await this.cacheBird({
        speciesCode: sightingData.speciesCode,
        comName: sightingData.comName,
        sciName: sightingData.sciName || '',
        hasSightings: true,
        continent: continent,
        regions: [sightingData.regionCode]
      }, 'sighting');
    }

    return id;
  },

  async getSightingsForBird(speciesCode) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const index = tx.objectStore('sightings').index('speciesCode');
      const request = index.getAll(speciesCode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllSightings() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const request = tx.objectStore('sightings').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getSightingsByRegion(regionCode) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const index = tx.objectStore('sightings').index('regionCode');
      const request = index.getAll(regionCode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getSightingsInDateRange(startDate, endDate) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const request = tx.objectStore('sightings').getAll();
      request.onsuccess = () => {
        const all = request.result;
        const filtered = all.filter(s => s.date >= startDate && s.date <= endDate);
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getFirstSighting(speciesCode) {
    const sightings = await this.getSightingsForBird(speciesCode);
    if (sightings.length === 0) return null;
    sightings.sort((a, b) => a.date.localeCompare(b.date));
    return sightings[0];
  },

  async getSightingCount(speciesCode) {
    const sightings = await this.getSightingsForBird(speciesCode);
    return sightings.length;
  },

  // ===== CACHE METADATA =====

  async setCacheMeta(key, speciesCodes) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readwrite');
      const request = tx.objectStore('cache_meta').put({
        key,
        speciesCodes,
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getCacheMeta(key) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readonly');
      const request = tx.objectStore('cache_meta').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getActiveGameBirdCodes() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readonly');
      const request = tx.objectStore('cache_meta').getAll();
      request.onsuccess = () => {
        const allCodes = new Set();
        for (const meta of request.result) {
          if (meta.key.startsWith('game_')) {
            meta.speciesCodes.forEach(c => allCodes.add(c));
          }
        }
        resolve([...allCodes]);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteGameCache(gameId) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readwrite');
      const request = tx.objectStore('cache_meta').delete(`game_${gameId}_birds`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ===== CONTINENT MAPPING =====

  getContinent(regionCode) {
    const countryCode = regionCode.split('-')[0];

    const continentMap = {
      // North America
      'US': 'North America', 'CA': 'North America', 'MX': 'North America',
      'GT': 'North America', 'BZ': 'North America', 'HN': 'North America',
      'SV': 'North America', 'NI': 'North America', 'CR': 'North America',
      'PA': 'North America',
      // Caribbean
      'JM': 'North America', 'CU': 'North America', 'DO': 'North America',
      'HT': 'North America', 'PR': 'North America', 'BS': 'North America',
      'BB': 'North America', 'TT': 'North America',

      // South America
      'CO': 'South America', 'VE': 'South America', 'EC': 'South America',
      'PE': 'South America', 'BR': 'South America', 'BO': 'South America',
      'PY': 'South America', 'CL': 'South America', 'AR': 'South America',
      'UY': 'South America', 'GY': 'South America', 'SR': 'South America',
      'GF': 'South America',

      // Europe
      'GB': 'Europe', 'IE': 'Europe', 'FR': 'Europe', 'DE': 'Europe',
      'ES': 'Europe', 'PT': 'Europe', 'IT': 'Europe', 'NL': 'Europe',
      'BE': 'Europe', 'CH': 'Europe', 'AT': 'Europe', 'PL': 'Europe',
      'CZ': 'Europe', 'SK': 'Europe', 'HU': 'Europe', 'RO': 'Europe',
      'BG': 'Europe', 'GR': 'Europe', 'HR': 'Europe', 'SI': 'Europe',
      'RS': 'Europe', 'UA': 'Europe', 'BY': 'Europe', 'RU': 'Europe',
      'NO': 'Europe', 'SE': 'Europe', 'FI': 'Europe', 'DK': 'Europe',
      'IS': 'Europe', 'LT': 'Europe', 'LV': 'Europe', 'EE': 'Europe',

      // Africa
      'ZA': 'Africa', 'EG': 'Africa', 'MA': 'Africa', 'KE': 'Africa',
      'TZ': 'Africa', 'NG': 'Africa', 'GH': 'Africa', 'ET': 'Africa',
      'UG': 'Africa', 'ZW': 'Africa', 'BW': 'Africa', 'NA': 'Africa',
      'SN': 'Africa', 'CM': 'Africa', 'CI': 'Africa',

      // Asia
      'CN': 'Asia', 'JP': 'Asia', 'KR': 'Asia', 'IN': 'Asia',
      'TH': 'Asia', 'VN': 'Asia', 'PH': 'Asia', 'ID': 'Asia',
      'MY': 'Asia', 'SG': 'Asia', 'TW': 'Asia', 'HK': 'Asia',
      'PK': 'Asia', 'BD': 'Asia', 'LK': 'Asia', 'NP': 'Asia',
      'MM': 'Asia', 'KH': 'Asia', 'LA': 'Asia',

      // Oceania
      'AU': 'Oceania', 'NZ': 'Oceania', 'PG': 'Oceania', 'FJ': 'Oceania'
    };

    return continentMap[countryCode] || 'Other';
  },

  async getBirdsByContinent() {
    await this.ready();
    const allBirds = await this.getAllBirds();
    const birdsWithSightings = allBirds.filter(b => b.hasSightings);

    const grouped = {};
    for (const bird of birdsWithSightings) {
      const continent = bird.continent || 'Other';
      if (!grouped[continent]) grouped[continent] = [];
      grouped[continent].push(bird);
    }

    return grouped;
  },

  // ===== CACHE PRUNING =====

  async pruneCacheToLimit(limit = 100) {
    await this.ready();

    const allBirds = await this.getAllBirds();
    const activeMeta = await this.getActiveGameBirdCodes();

    // Sort by lastViewed (oldest first)
    allBirds.sort((a, b) => new Date(a.lastViewed) - new Date(b.lastViewed));

    const toDelete = [];
    let kept = 0;

    for (const bird of allBirds) {
      // Never delete birds with sightings
      if (bird.hasSightings) continue;

      // Never delete birds in active games
      if (activeMeta.includes(bird.speciesCode)) continue;

      if (kept >= limit) {
        toDelete.push(bird.speciesCode);
      } else {
        kept++;
      }
    }

    // Delete excess birds
    for (const code of toDelete) {
      await this.deleteBird(code);
    }

    return toDelete.length;
  }
};

// Export for global use
window.BirdDB = BirdDB;

// Birdle IndexedDB Module
// Centralized bird caching system

const DB_NAME = 'birdle-db';
const DB_VERSION = 3;

// Generate UUID for sync
function generateSyncId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
        const oldVersion = event.oldVersion;

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
          sightingsStore.createIndex('syncId', 'syncId', { unique: true });
        } else if (oldVersion < 2) {
          // Upgrade: add syncId index to existing sightings store
          const sightingsStore = event.target.transaction.objectStore('sightings');
          if (!sightingsStore.indexNames.contains('syncId')) {
            sightingsStore.createIndex('syncId', 'syncId', { unique: true });
          }
        }

        // Cache metadata store - tracks which birds belong to which cache
        if (!db.objectStoreNames.contains('cache_meta')) {
          db.createObjectStore('cache_meta', { keyPath: 'key' });
        }

        // Bingo games store - multiple bingo game instances
        if (!db.objectStoreNames.contains('bingo_games')) {
          const bingoStore = db.createObjectStore('bingo_games', { keyPath: 'id', autoIncrement: true });
          bingoStore.createIndex('createdAt', 'createdAt');
          bingoStore.createIndex('completedAt', 'completedAt');
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
      lat: birdData.lat ?? existing?.lat ?? null,  // Store coordinates if available
      lng: birdData.lng ?? existing?.lng ?? null,
      locName: birdData.locName || existing?.locName || null,
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
      syncId: sightingData.syncId || generateSyncId(),
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
      createdAt: sightingData.createdAt || new Date().toISOString()
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

  async deleteSighting(sightingId) {
    await this.ready();

    // Get sighting first to update bird cache
    const sighting = await this.getSighting(sightingId);

    // Delete the sighting
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readwrite');
      const request = tx.objectStore('sightings').delete(sightingId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Check if bird still has other sightings
    if (sighting) {
      const remaining = await this.getSightingsForBird(sighting.speciesCode);
      if (remaining.length === 0) {
        // Update bird cache to mark as not having sightings
        const bird = await this.getBird(sighting.speciesCode);
        if (bird) {
          bird.hasSightings = false;
          await new Promise((resolve, reject) => {
            const tx = this.db.transaction('birds', 'readwrite');
            const request = tx.objectStore('birds').put(bird);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      }
    }

    return true;
  },

  async getSighting(sightingId) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const request = tx.objectStore('sightings').get(sightingId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async hasSightings(speciesCode) {
    const count = await this.getSightingCount(speciesCode);
    return count > 0;
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

    // Sort by lastViewed (oldest first)
    allBirds.sort((a, b) => new Date(a.lastViewed) - new Date(b.lastViewed));

    const toDelete = [];
    let kept = 0;

    for (const bird of allBirds) {
      // Never delete birds with sightings
      if (bird.hasSightings) continue;

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
  },

  // ===== SYNC OPERATIONS =====

  async getSightingBySyncId(syncId) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sightings', 'readonly');
      const index = tx.objectStore('sightings').index('syncId');
      const request = index.get(syncId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async importSighting(sightingData) {
    // Import a sighting from sync (preserves syncId and createdAt)
    await this.ready();

    // Check if already exists
    const existing = await this.getSightingBySyncId(sightingData.syncId);
    if (existing) {
      return { imported: false, reason: 'exists' };
    }

    // Add the sighting
    await this.addSighting(sightingData);
    return { imported: true };
  },

  async getAllSightingsForSync() {
    // Get all sightings with full data for sync export
    const sightings = await this.getAllSightings();
    return sightings.map(s => ({
      syncId: s.syncId,
      speciesCode: s.speciesCode,
      comName: s.comName,
      sciName: s.sciName,
      date: s.date,
      time: s.time,
      regionCode: s.regionCode,
      regionName: s.regionName,
      lat: s.lat,
      lng: s.lng,
      notes: s.notes,
      createdAt: s.createdAt
    }));
  },

  // ===== COUNTRY CACHING =====

  async cacheCountryBirds(countryCode, onProgress = null) {
    await this.ready();

    // Get all species codes for the country
    const speciesCodes = await EBird.getSpeciesList(countryCode);
    if (!speciesCodes || speciesCodes.length === 0) {
      console.warn('No species found for country:', countryCode);
      return { cached: 0, total: 0 };
    }

    if (onProgress) onProgress({ phase: 'fetching', total: speciesCodes.length });

    // Fetch taxonomy data for all species
    const taxonomy = await EBird.getTaxonomy(speciesCodes);
    if (!taxonomy || taxonomy.length === 0) {
      console.warn('No taxonomy data returned for country:', countryCode);
      return { cached: 0, total: speciesCodes.length };
    }

    if (onProgress) onProgress({ phase: 'caching', total: taxonomy.length, cached: 0 });

    // Cache each bird
    let cached = 0;
    for (const bird of taxonomy) {
      await this.cacheBird({
        speciesCode: bird.speciesCode,
        comName: bird.comName,
        sciName: bird.sciName,
        familyName: bird.familyComName || null,
        regions: [countryCode]
      }, 'country');

      cached++;
      if (onProgress && cached % 50 === 0) {
        onProgress({ phase: 'caching', total: taxonomy.length, cached });
      }
    }

    // Store cache metadata
    await this.setCacheMeta(`country_${countryCode}_birds`, speciesCodes);

    if (onProgress) onProgress({ phase: 'done', total: taxonomy.length, cached });

    return { cached, total: speciesCodes.length };
  },

  async getCountryCacheMeta(countryCode) {
    return this.getCacheMeta(`country_${countryCode}_birds`);
  },

  async hasCountryCache(countryCode) {
    const meta = await this.getCountryCacheMeta(countryCode);
    return meta && meta.speciesCodes && meta.speciesCodes.length > 0;
  },

  // ===== CACHE MANAGEMENT =====

  // Get list of all cached countries with metadata
  async getCachedCountries() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readonly');
      const request = tx.objectStore('cache_meta').getAll();
      request.onsuccess = () => {
        const countries = [];
        for (const meta of request.result) {
          if (meta.key.startsWith('country_') && meta.key.endsWith('_birds')) {
            const countryCode = meta.key.replace('country_', '').replace('_birds', '');
            countries.push({
              countryCode,
              birdCount: meta.speciesCodes?.length || 0,
              cachedAt: meta.updatedAt
            });
          }
        }
        resolve(countries);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Remove a country from cache (preserves birds with sightings or in games)
  async removeCountryFromCache(countryCode) {
    await this.ready();

    const meta = await this.getCacheMeta(`country_${countryCode}_birds`);
    if (!meta || !meta.speciesCodes) {
      return { removed: 0, preserved: 0 };
    }

    let removed = 0;
    let preserved = 0;

    // Get birds protected by other country caches
    const otherCountries = await this.getCachedCountries();
    const otherCacheProtectedCodes = new Set();

    for (const country of otherCountries) {
      if (country.countryCode !== countryCode) {
        const otherMeta = await this.getCacheMeta(`country_${country.countryCode}_birds`);
        if (otherMeta?.speciesCodes) {
          otherMeta.speciesCodes.forEach(sc => otherCacheProtectedCodes.add(sc));
        }
      }
    }

    // Process each bird
    for (const speciesCode of meta.speciesCodes) {
      const bird = await this.getBird(speciesCode);
      if (!bird) continue;

      const isProtected =
        bird.hasSightings ||
        otherCacheProtectedCodes.has(speciesCode);

      if (isProtected) {
        preserved++;
        continue;
      }

      await this.deleteBird(speciesCode);
      removed++;
    }

    // Remove cache metadata
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction('cache_meta', 'readwrite');
      const request = tx.objectStore('cache_meta').delete(`country_${countryCode}_birds`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`Removed cache ${countryCode}: ${removed} deleted, ${preserved} preserved`);
    return { removed, preserved };
  },

  // Get all cached birds for a country
  async getCachedBirdsForCountry(countryCode) {
    const meta = await this.getCacheMeta(`country_${countryCode}_birds`);
    if (!meta || !meta.speciesCodes) return [];
    return this.getBirds(meta.speciesCodes);
  },

  // Get cached birds for a region (state filters from parent country cache)
  async getCachedBirdsForRegion(regionCode) {
    const countryCode = regionCode.split('-')[0];
    const allBirds = await this.getCachedBirdsForCountry(countryCode);

    // If searching a state, filter to birds that include that region
    if (regionCode !== countryCode) {
      return allBirds.filter(bird =>
        bird.regions && (
          bird.regions.includes(regionCode) ||
          bird.regions.includes(countryCode)
        )
      );
    }

    return allBirds;
  },

  async migrateSightingsForSync() {
    // Add syncId to any existing sightings that don't have one
    await this.ready();
    const allSightings = await this.getAllSightings();
    let migrated = 0;

    for (const sighting of allSightings) {
      if (!sighting.syncId) {
        sighting.syncId = generateSyncId();
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction('sightings', 'readwrite');
          const request = tx.objectStore('sightings').put(sighting);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        migrated++;
      }
    }

    return migrated;
  },

  // ===== BINGO GAMES =====

  async createBingoGame(gameData) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const game = {
        title: gameData.title || new Date().toLocaleDateString(),
        regionCode: gameData.regionCode,
        regionName: gameData.regionName,
        birds: gameData.birds || [], // Array of {speciesCode, comName, sciName, rarity}
        foundBirds: gameData.foundBirds || [], // Array of speciesCodes
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedInSeconds: null
      };

      const tx = this.db.transaction('bingo_games', 'readwrite');
      const request = tx.objectStore('bingo_games').add(game);
      request.onsuccess = () => {
        game.id = request.result;
        resolve(game);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getBingoGame(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bingo_games', 'readonly');
      const request = tx.objectStore('bingo_games').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllBingoGames() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bingo_games', 'readonly');
      const request = tx.objectStore('bingo_games').getAll();
      request.onsuccess = () => {
        // Sort by most recent first
        const games = request.result.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        resolve(games);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async updateBingoGame(game) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bingo_games', 'readwrite');
      const request = tx.objectStore('bingo_games').put(game);
      request.onsuccess = () => resolve(game);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBingoGame(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bingo_games', 'readwrite');
      const request = tx.objectStore('bingo_games').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// Export for global use
window.BirdDB = BirdDB;

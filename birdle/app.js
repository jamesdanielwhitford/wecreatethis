// Birdle - Bird Bingo App

const App = {
  birds: [],
  seenBirds: JSON.parse(localStorage.getItem('seenBirds') || '[]'),
  recentBirds: JSON.parse(localStorage.getItem('recentBirds') || '[]'),
  currentSort: 'nearest',
  userLocation: null,
  map: null,
  mapMarker: null,
  mapCircle: null,
  pickedLocation: null,
  pickedRadius: null,
  currentBird: null,
  searchQuery: '',
  gameSearchQuery: '',

  async init() {
    // Initialize IndexedDB
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.init();
      // Run one-time cleanup migration
      await this.cleanupRemovedFeatures();
    }

    const page = this.detectPage();
    if (page === 'search') this.initSearch();
    if (page === 'bird') this.initBirdDetail();
    if (page === 'bingo') this.initBingo();
  },

  // One-time migration to clean up removed features (Region Games, Lifer Challenge)
  async cleanupRemovedFeatures() {
    // Check if migration already ran
    if (localStorage.getItem('removed_features_migration') === 'true') {
      return;
    }

    try {
      // 1. Remove Region Games from localStorage
      localStorage.removeItem('games');
      localStorage.removeItem('collapsedSections');

      // 2. Remove Lifer Challenge from localStorage
      localStorage.removeItem('liferChallenge');

      // 3. Remove game bird caches from IndexedDB
      const db = await BirdDB.init();
      const tx = db.transaction('cache_meta', 'readwrite');
      const store = tx.objectStore('cache_meta');

      // Get all cache_meta keys
      const allKeys = await store.getAllKeys();

      // Delete all game_* entries
      for (const key of allKeys) {
        if (key.startsWith('game_')) {
          await store.delete(key);
        }
      }

      await tx.complete;

      console.log('Removed features data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up removed features data:', error);
    } finally {
      // 4. Mark migration complete (even if there was an error, don't retry)
      localStorage.setItem('removed_features_migration', 'true');
      // Also set old flag for backwards compatibility
      localStorage.setItem('games_removed_migration', 'true');
    }
  },

  detectPage() {
    const path = window.location.pathname;
    const fullUrl = window.location.pathname + window.location.search;
    // Support both with and without .html extension
    // Order matters - check more specific paths first
    if (path.includes('search')) return 'search';
    if (path.includes('bingo')) return 'bingo';
    if (path.includes('life')) return 'life';
    // Check for 'bird.html', 'bird?', or '/bird' to avoid matching 'birdle'
    if (path.match(/\/bird(\.html)?$/) || fullUrl.includes('bird?')) return 'bird';
    return 'home';
  },

  // ===== SEARCH PAGE =====
  async initSearch() {
    this.bindSearchEvents();
    this.updateSearchLocationButton();
    await this.loadSearchCountries();
    this.restoreLastSearch();
  },

  async loadSearchCountries() {
    const countryFilter = document.getElementById('country-filter');
    if (!countryFilter) return;

    try {
      const countries = await EBird.getCountries();
      countries.forEach(c => {
        countryFilter.innerHTML += `<option value="${c.code}">${c.name}</option>`;
      });
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  },

  // Update location button text based on cache state
  updateSearchLocationButton() {
    const btn = document.getElementById('use-location-btn');
    if (btn && typeof LocationService !== 'undefined') {
      btn.textContent = LocationService.getButtonText();
    }
  },

  async restoreLastSearch() {
    const countryFilter = document.getElementById('country-filter');
    const stateFilter = document.getElementById('state-filter');
    const birdSearch = document.getElementById('bird-search');
    const locationInfo = document.getElementById('location-info');

    // Priority 1: Check for lastSearch (user's previous search session)
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (lastSearch) {
      // Restore search query if saved
      if (lastSearch.query && birdSearch) {
        birdSearch.value = lastSearch.query;
        this.searchQuery = lastSearch.query.toLowerCase();
      }

      if (lastSearch.type === 'region') {
        // Restore country selection
        if (lastSearch.countryCode && countryFilter) {
          countryFilter.value = lastSearch.countryCode;

          // Load and restore state selection if applicable
          if (stateFilter) {
            const states = await EBird.getStates(lastSearch.countryCode);
            if (states.length > 0) {
              stateFilter.innerHTML = '<option value="">State/Province...</option>';
              states.forEach(s => {
                stateFilter.innerHTML += `<option value="${s.code}">${s.name}</option>`;
              });
              stateFilter.disabled = false;
              if (lastSearch.stateCode) {
                stateFilter.value = lastSearch.stateCode;
              }
            }
          }
        } else if (countryFilter && lastSearch.code) {
          // Legacy format - just set country from code
          const countryCode = lastSearch.code.split('-')[0];
          countryFilter.value = countryCode;
        }

        // Set userLocation from cached location for "Nearest" sorting
        if (typeof LocationService !== 'undefined') {
          const cached = LocationService.getCached();
          if (cached && cached.lat && cached.lng) {
            this.userLocation = { lat: cached.lat, lng: cached.lng };
          }
        }

        this.showLoading(true);
        const regionCode = lastSearch.code || lastSearch.stateCode || lastSearch.countryCode;
        const countryCode = (lastSearch.code || lastSearch.countryCode || '').split('-')[0];
        const isCached = await BirdDB.hasCountryCache(countryCode);

        // Try to fetch recent observations first (has location data)
        try {
          const birds = await EBird.getRecentObservations(regionCode, true);
          if (birds && birds.length > 0) {
            this.birds = this.deduplicateBirds(birds);
            this.showLoading(false);
            this.renderBirdList();
            this.updateCachePrompt(countryCode);
            return;
          }
        } catch (e) {
          console.log('Network fetch failed, trying cache...');
        }

        // Fallback to cache if available
        if (isCached) {
          const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
          this.birds = birds;
        } else {
          this.birds = [];
        }

        this.showLoading(false);
        this.renderBirdList();
        this.updateCachePrompt(countryCode);
        return;
      } else if (lastSearch.type === 'location') {
        this.userLocation = { lat: lastSearch.lat, lng: lastSearch.lng };

        if (locationInfo) {
          locationInfo.textContent = `📍 ${lastSearch.lat.toFixed(4)}, ${lastSearch.lng.toFixed(4)} (50km radius)`;
          locationInfo.style.display = 'block';
        }

        this.showLoading(true);
        const birds = await EBird.getNearbyObservations(lastSearch.lat, lastSearch.lng);
        this.birds = this.deduplicateBirds(birds);
        this.showLoading(false);
        this.renderBirdList();
        return;
      }
    }

    // Priority 2: Fall back to cached location (first time on search page)
    if (typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached) {
        const displayName = LocationService.getRegionDisplayName(cached);

        if (locationInfo) {
          locationInfo.textContent = `📍 ${displayName}`;
          locationInfo.style.display = 'block';
        }

        // Populate country/state dropdowns to match cached location
        if (countryFilter && cached.countryCode) {
          countryFilter.value = cached.countryCode;

          // Load states for this country
          if (stateFilter) {
            const states = await EBird.getStates(cached.countryCode);
            if (states.length > 0) {
              stateFilter.innerHTML = '<option value="">State/Province...</option>';
              states.forEach(s => {
                stateFilter.innerHTML += `<option value="${s.code}">${s.name}</option>`;
              });
              stateFilter.disabled = false;

              // Set state if available
              if (cached.stateCode) {
                stateFilter.value = cached.stateCode;
              }
            }
          }
        }

        this.showLoading(true);

        // Use GPS coords if available, otherwise use region
        if (LocationService.hasValidCoordinates(cached)) {
          this.userLocation = { lat: cached.lat, lng: cached.lng };
          EBird.getNearbyObservations(cached.lat, cached.lng).then(birds => {
            this.birds = this.deduplicateBirds(birds);
            this.showLoading(false);
            this.renderBirdList();
          });
        } else {
          // Use region-based search for manual locations
          const regionCode = LocationService.getRegionCode(cached);
          const countryIsCached = await BirdDB.hasCountryCache(cached.countryCode);

          // Try to fetch recent observations first (has location data)
          try {
            const birds = await EBird.getRecentObservations(regionCode, true);
            if (birds && birds.length > 0) {
              this.birds = this.deduplicateBirds(birds);
              this.showLoading(false);
              this.renderBirdList();
              this.updateCachePrompt(cached.countryCode);
              return;
            }
          } catch (e) {
            console.log('Network fetch failed, trying cache...');
          }

          // Fallback to cache if available
          if (countryIsCached) {
            const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
            this.birds = birds;
          } else {
            this.birds = [];
          }
          this.showLoading(false);
          this.renderBirdList();
          this.updateCachePrompt(cached.countryCode);
        }
      }
    }
  },

  bindSearchEvents() {
    const countryFilter = document.getElementById('country-filter');
    const stateFilter = document.getElementById('state-filter');
    const sortType = document.getElementById('sort-type');
    const seenFilter = document.getElementById('seen-filter');
    const birdSearch = document.getElementById('bird-search');
    const useLocationBtn = document.getElementById('use-location-btn');
    const pickLocationBtn = document.getElementById('pick-location-btn');
    const mapCancelBtn = document.getElementById('map-cancel-btn');
    const mapConfirmBtn = document.getElementById('map-confirm-btn');

    // Use My Location button
    useLocationBtn?.addEventListener('click', () => {
      this.useMyLocation();
    });

    // Country filter - load states when country selected
    countryFilter?.addEventListener('change', async (e) => {
      const countryCode = e.target.value;
      stateFilter.innerHTML = '<option value="">State/Province...</option>';
      stateFilter.disabled = true;

      if (countryCode) {
        // Load states for this country
        const states = await EBird.getStates(countryCode);
        if (states.length > 0) {
          states.forEach(s => {
            stateFilter.innerHTML += `<option value="${s.code}">${s.name}</option>`;
          });
          stateFilter.disabled = false;
        }
        // Search by country
        this.searchByRegion(countryCode);
      }
    });

    // State filter - search by state when selected
    stateFilter?.addEventListener('change', (e) => {
      const stateCode = e.target.value;
      const countryCode = countryFilter.value;
      if (stateCode) {
        this.searchByRegion(stateCode);
      } else if (countryCode) {
        this.searchByRegion(countryCode);
      }
    });

    sortType?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderBirdList();
    });

    seenFilter?.addEventListener('change', () => {
      this.renderBirdList();
    });

    // Bird search filter - also save to lastSearch
    birdSearch?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.saveSearchQuery(e.target.value);
      this.renderBirdList();
    });

    pickLocationBtn?.addEventListener('click', () => {
      this.openMapPicker();
    });

    mapCancelBtn?.addEventListener('click', () => {
      this.closeMapPicker();
    });

    mapConfirmBtn?.addEventListener('click', () => {
      this.confirmMapLocation();
    });

    // Cache country button
    const cacheBtn = document.getElementById('cache-country-btn');
    cacheBtn?.addEventListener('click', () => {
      this.cacheCurrentCountry();
    });
  },

  // Show/hide cache prompt based on whether country is cached
  async updateCachePrompt(countryCode) {
    const cachePrompt = document.getElementById('cache-prompt');
    const cachePromptText = document.getElementById('cache-prompt-text');
    const cacheBtn = document.getElementById('cache-country-btn');

    if (!cachePrompt || !countryCode) {
      if (cachePrompt) cachePrompt.style.display = 'none';
      return;
    }

    const isCached = await BirdDB.hasCountryCache(countryCode);
    if (isCached) {
      cachePrompt.style.display = 'none';
    } else {
      cachePrompt.style.display = 'block';
      cachePromptText.textContent = 'Save for offline?';
      cacheBtn.textContent = 'Cache Country';
      cacheBtn.disabled = false;
      cachePrompt.dataset.country = countryCode;
    }
  },

  // Cache the current country
  async cacheCurrentCountry() {
    const cachePrompt = document.getElementById('cache-prompt');
    const cachePromptText = document.getElementById('cache-prompt-text');
    const cacheBtn = document.getElementById('cache-country-btn');
    const countryCode = cachePrompt?.dataset.country;

    if (!countryCode) return;

    cacheBtn.disabled = true;
    cacheBtn.textContent = 'Caching...';

    try {
      await BirdDB.cacheCountryBirds(countryCode, (progress) => {
        if (progress.phase === 'fetching') {
          cachePromptText.textContent = `Fetching ${progress.total} species...`;
        } else if (progress.phase === 'caching') {
          cachePromptText.textContent = `Caching ${progress.cached}/${progress.total}...`;
        } else if (progress.phase === 'done') {
          cachePromptText.textContent = `${progress.cached} birds cached!`;
        }
      });

      // Hide prompt after success
      setTimeout(() => {
        cachePrompt.style.display = 'none';
      }, 2000);
    } catch (error) {
      console.error('Cache error:', error);
      cachePromptText.textContent = 'Error caching. Try again.';
      cacheBtn.textContent = 'Cache Country';
      cacheBtn.disabled = false;
    }
  },

  // Save search query to lastSearch without triggering a new search
  saveSearchQuery(query) {
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (lastSearch) {
      lastSearch.query = query;
      localStorage.setItem('lastSearch', JSON.stringify(lastSearch));
    }
  },

  async useMyLocation() {
    const btn = document.getElementById('use-location-btn');
    btn.disabled = true;
    btn.textContent = '📍 Detecting...';

    if (typeof LocationService === 'undefined') {
      alert('Location service not available.');
      btn.textContent = '📍 Use My Location';
      btn.disabled = false;
      return;
    }

    try {
      // Get location (force refresh to get new GPS)
      const location = await LocationService.getLocation(true);

      const { lat, lng } = location;
      this.userLocation = { lat, lng };

      // Save search location
      localStorage.setItem('lastSearch', JSON.stringify({
        type: 'location',
        lat,
        lng
      }));

      // Show location info
      const locationInfo = document.getElementById('location-info');
      if (locationInfo) {
        const displayName = LocationService.getRegionDisplayName(location);
        locationInfo.textContent = `📍 ${displayName} (50km radius)`;
        locationInfo.style.display = 'block';
      }

      this.showLoading(true);
      const birds = await EBird.getNearbyObservations(lat, lng);
      this.birds = this.deduplicateBirds(birds);
      this.showLoading(false);
      this.renderBirdList();

      // Hide cache prompt for GPS-based search
      this.updateCachePrompt(null);

      btn.textContent = LocationService.getButtonText();
      btn.disabled = false;

    } catch (error) {
      alert(error.message || 'Could not get your location. Please try using "Pick on map" instead.');
      btn.textContent = LocationService.getButtonText();
      btn.disabled = false;
    }
  },

  openMapPicker() {
    const container = document.getElementById('map-container');
    container.style.display = 'block';

    if (!this.map) {
      this.map = L.map('map').setView([40, -95], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.map.on('click', (e) => {
        this.setMapMarker(e.latlng.lat, e.latlng.lng);
      });
    }

    // Center on user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map.setView([latitude, longitude], 10);
          this.setMapMarker(latitude, longitude);
        },
        (error) => {
          console.warn('Map centering failed:', error);
          // Default to world view if location fails (silent failure is ok here)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }

    setTimeout(() => this.map.invalidateSize(), 100);
  },

  setMapMarker(lat, lng) {
    this.pickedLocation = { lat, lng };

    if (this.mapMarker) {
      this.mapMarker.setLatLng([lat, lng]);
    } else {
      this.mapMarker = L.marker([lat, lng]).addTo(this.map);
    }
  },

  closeMapPicker() {
    document.getElementById('map-container').style.display = 'none';
  },

  confirmMapLocation() {
    if (!this.pickedLocation) {
      alert('Tap the map to pick a location');
      return;
    }

    this.closeMapPicker();
    this.userLocation = this.pickedLocation;
    localStorage.setItem('lastSearch', JSON.stringify({
      type: 'location',
      lat: this.pickedLocation.lat,
      lng: this.pickedLocation.lng
    }));

    this.showLoading(true);
    EBird.getNearbyObservations(this.pickedLocation.lat, this.pickedLocation.lng).then(birds => {
      this.birds = this.deduplicateBirds(birds);
      this.showLoading(false);
      this.renderBirdList();

      // Hide cache prompt for GPS-based search
      this.updateCachePrompt(null);
    });
  },

  async searchByRegion(regionCode) {
    // Hide location info when switching to region search
    const locationInfo = document.getElementById('location-info');
    if (locationInfo) {
      locationInfo.style.display = 'none';
    }

    this.showLoading(true);

    // Save enhanced search settings for persistence
    const countryCode = regionCode.split('-')[0];
    const stateCode = regionCode.includes('-') ? regionCode : null;
    localStorage.setItem('lastSearch', JSON.stringify({
      type: 'region',
      code: regionCode,
      countryCode,
      stateCode
    }));

    // Set userLocation from cached location for "Nearest" sorting
    if (!this.userLocation && typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached && cached.lat && cached.lng) {
        this.userLocation = { lat: cached.lat, lng: cached.lng };
      }
    }

    const isCached = await BirdDB.hasCountryCache(countryCode);

    // Always try to fetch recent observations first (has location data)
    // Fall back to cache only if offline
    try {
      const birds = await EBird.getRecentObservations(regionCode, true);
      if (birds && birds.length > 0) {
        this.birds = this.deduplicateBirds(birds);
        this.showLoading(false);
        this.renderBirdList();
        this.updateCachePrompt(countryCode);
        return;
      }
    } catch (e) {
      console.log('Network fetch failed, trying cache...', e.message);
    }

    // Fallback to cache if available (offline mode)
    if (isCached) {
      const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
      this.birds = birds;
      this.showLoading(false);
      this.renderBirdList();
      this.updateCachePrompt(countryCode);
      return;
    }

    // No data available
    this.birds = [];
    this.showLoading(false);
    this.renderBirdList();
    this.updateCachePrompt(countryCode);
  },


  deduplicateBirds(birds) {
    const seen = new Map();
    birds.forEach(bird => {
      if (!seen.has(bird.speciesCode)) {
        seen.set(bird.speciesCode, bird);
      }
    });
    return Array.from(seen.values());
  },

  sortBirds(birds) {
    const sorted = [...birds];

    if (this.currentSort === 'alphabetical') {
      sorted.sort((a, b) => a.comName.localeCompare(b.comName));
    } else if (this.currentSort === 'nearest') {
      // Use userLocation, or fall back to cached location
      let refLocation = this.userLocation;
      if (!refLocation && typeof LocationService !== 'undefined') {
        const cached = LocationService.getCached();
        if (cached && cached.lat && cached.lng) {
          refLocation = { lat: cached.lat, lng: cached.lng };
        }
      }

      if (refLocation) {
        sorted.sort((a, b) => {
          // Birds without coordinates go to the end
          const hasA = a.lat != null && a.lng != null;
          const hasB = b.lat != null && b.lng != null;
          if (!hasA && !hasB) return a.comName.localeCompare(b.comName);
          if (!hasA) return 1;
          if (!hasB) return -1;

          const distA = this.distance(refLocation.lat, refLocation.lng, a.lat, a.lng);
          const distB = this.distance(refLocation.lat, refLocation.lng, b.lat, b.lng);
          return distA - distB;
        });
      }
    }

    return sorted;
  },

  distance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  async renderBirdList() {
    const list = document.getElementById('bird-list');
    if (!list) return;

    let birds;

    // If "recent" sort, show recently viewed birds
    if (this.currentSort === 'recent') {
      birds = this.recentBirds;
    } else {
      birds = this.sortBirds(this.birds);
    }

    // Get all sightings to determine seen status
    let seenCodes = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      seenCodes = [...new Set(allSightings.map(s => s.speciesCode))];
    }

    const seenFilter = document.getElementById('seen-filter');
    if (seenFilter?.checked) {
      birds = birds.filter(b => seenCodes.includes(b.speciesCode));
    }

    // Filter by search query
    if (this.searchQuery) {
      birds = birds.filter(b =>
        b.comName.toLowerCase().includes(this.searchQuery) ||
        (b.sciName && b.sciName.toLowerCase().includes(this.searchQuery))
      );
    }

    if (birds.length === 0) {
      const msg = this.searchQuery
        ? 'No birds match your search'
        : this.currentSort === 'recent'
          ? 'No recently viewed birds'
          : 'No birds found';
      list.innerHTML = `<li class="empty">${msg}</li>`;
      return;
    }

    list.innerHTML = birds.map(bird => {
      const isSeen = seenCodes.includes(bird.speciesCode);
      const showRemove = this.currentSort === 'recent';
      return `
        <li class="bird-item ${isSeen ? 'seen' : ''}" data-code="${bird.speciesCode}">
          <a href="bird?code=${bird.speciesCode}">
            <span class="bird-name">${bird.comName}</span>
            <span class="bird-location">${bird.locName || ''}</span>
            ${isSeen ? '<span class="seen-badge">✓</span>' : ''}
          </a>
          ${showRemove ? `<button class="remove-btn" data-code="${bird.speciesCode}">✕</button>` : ''}
        </li>
      `;
    }).join('');

    // Bind remove buttons
    if (this.currentSort === 'recent') {
      list.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.removeRecentBird(btn.dataset.code);
        });
      });
    }

    // Store birds for detail page (merge with recent birds)
    const allBirds = [...this.birds, ...this.recentBirds];
    const uniqueBirds = allBirds.filter((bird, index, self) =>
      index === self.findIndex(b => b.speciesCode === bird.speciesCode)
    );
    localStorage.setItem('currentBirds', JSON.stringify(uniqueBirds));
  },

  showLoading(show) {
    const loading = document.getElementById('loading');
    const list = document.getElementById('bird-list');
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (list) list.style.display = show ? 'none' : 'block';
  },

  addRecentBird(bird) {
    this.recentBirds = this.recentBirds.filter(b => b.speciesCode !== bird.speciesCode);
    this.recentBirds.unshift({
      speciesCode: bird.speciesCode,
      comName: bird.comName,
      sciName: bird.sciName,
      locName: bird.locName
    });
    localStorage.setItem('recentBirds', JSON.stringify(this.recentBirds));
  },

  removeRecentBird(speciesCode) {
    this.recentBirds = this.recentBirds.filter(b => b.speciesCode !== speciesCode);
    localStorage.setItem('recentBirds', JSON.stringify(this.recentBirds));
    this.renderBirdList();
  },

  // ===== BIRD DETAIL PAGE =====
  async initBirdDetail() {
    // Set up back button based on referrer
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      const referrer = document.referrer;
      if (referrer.includes('/life')) {
        backBtn.href = 'life';
      } else if (referrer.includes('/bingo')) {
        backBtn.href = 'bingo';
      } else if (referrer.includes('/game?')) {
        // Extract game ID from referrer and go back to that game
        const match = referrer.match(/game\?id=(\d+)/);
        if (match) {
          backBtn.href = `game?id=${match[1]}`;
        } else {
          backBtn.href = 'games';
        }
      } else {
        backBtn.href = 'search';
      }
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      document.getElementById('bird-name').textContent = 'Bird not found';
      return;
    }

    // Try to find bird from multiple sources
    let bird = null;

    // 1. Check currentBirds (from search/game)
    const birds = JSON.parse(localStorage.getItem('currentBirds') || '[]');
    bird = birds.find(b => b.speciesCode === code);


    // 3. Check IndexedDB cache
    if (!bird && typeof BirdDB !== 'undefined') {
      bird = await BirdDB.getBird(code);
    }

    if (!bird) {
      document.getElementById('bird-name').textContent = 'Bird not found';
      return;
    }

    this.currentBird = bird;
    this.addRecentBird(bird);
    this.renderBirdDetail(bird);
    this.bindDetailEvents(bird);
    await this.loadBirdSightings(bird);

    // Cache bird and update view count in IndexedDB
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.cacheBird({
        speciesCode: bird.speciesCode,
        comName: bird.comName,
        sciName: bird.sciName,
        regions: []
      }, 'search');
      await BirdDB.updateBirdViewed(bird.speciesCode);
    }
  },

  renderBirdDetail(bird) {
    document.getElementById('bird-name').textContent = bird.comName;
    document.getElementById('bird-scientific').textContent = bird.sciName || '';

    // Set up eBird species link
    const ebirdLink = document.getElementById('ebird-link');
    if (ebirdLink) {
      ebirdLink.href = `https://ebird.org/species/${bird.speciesCode}`;
    }

    // Fetch and display bird image from Wikipedia
    this.loadBirdImage(bird);
  },

  async loadBirdImage(bird) {
    const container = document.getElementById('bird-image-container');
    const img = document.getElementById('bird-image');
    console.log('loadBirdImage called for:', bird.comName);
    if (!container || !img) {
      console.log('Container or img not found');
      return;
    }

    try {
      // Try common name first, then scientific name
      console.log('Fetching image for:', bird.comName);
      let imageUrl = await this.fetchWikipediaImage(bird.comName);
      console.log('Common name result:', imageUrl);

      if (!imageUrl && bird.sciName) {
        console.log('Trying scientific name:', bird.sciName);
        imageUrl = await this.fetchWikipediaImage(bird.sciName);
        console.log('Scientific name result:', imageUrl);
      }

      if (imageUrl) {
        console.log('Setting image URL:', imageUrl);
        img.alt = bird.comName;
        img.src = imageUrl;
        // Show container immediately - image will load
        container.style.display = 'block';
        // Hide on error
        img.onerror = () => {
          console.log('Image failed to load');
          container.style.display = 'none';
        };
        // Click to open fullscreen
        img.onclick = () => {
          const lightbox = document.getElementById('image-lightbox');
          const lightboxImg = document.getElementById('lightbox-image');
          if (lightbox && lightboxImg) {
            // Use larger image for lightbox
            lightboxImg.src = imageUrl.replace('/400px-', '/800px-');
            lightboxImg.alt = bird.comName;
            lightbox.style.display = 'flex';
          }
        };
      } else {
        console.log('No image URL found');
      }

      // Close lightbox on click
      const lightbox = document.getElementById('image-lightbox');
      if (lightbox) {
        lightbox.onclick = () => {
          lightbox.style.display = 'none';
        };
      }
    } catch (error) {
      console.warn('Failed to load bird image:', error);
    }
  },

  async fetchWikipediaImage(searchTerm) {
    try {
      const title = encodeURIComponent(searchTerm.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&pithumbsize=400&format=json&origin=*&redirects=1`;

      const response = await fetch(url);
      const data = await response.json();

      const pages = data.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    } catch (error) {
      // Silently fail
    }
    return null;
  },

  async loadBirdSightings(bird) {
    const listEl = document.getElementById('sightings-list');
    if (!listEl || typeof BirdDB === 'undefined') return;

    const sightings = await BirdDB.getSightingsForBird(bird.speciesCode);

    if (sightings.length === 0) {
      listEl.innerHTML = '<p class="empty">No sightings yet</p>';
      return;
    }

    // Sort by date descending (most recent first)
    sightings.sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = sightings.map(s => `
      <div class="sighting-item" data-id="${s.id}">
        <div class="sighting-info">
          <span class="sighting-date">${new Date(s.date).toLocaleDateString()}</span>
          <span class="sighting-location">${s.regionName || s.regionCode}</span>
          ${s.notes ? `<span class="sighting-notes">${s.notes}</span>` : ''}
        </div>
        <button class="delete-sighting-btn" data-id="${s.id}">✕</button>
      </div>
    `).join('');

    // Bind delete buttons
    listEl.querySelectorAll('.delete-sighting-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this sighting?')) {
          await this.deleteSighting(parseInt(btn.dataset.id));
        }
      });
    });
  },

  async deleteSighting(sightingId) {
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.deleteSighting(sightingId);
      await this.loadBirdSightings(this.currentBird);
    }
  },

  bindDetailEvents(bird) {
    // Add sighting button
    document.getElementById('add-sighting-btn')?.addEventListener('click', () => {
      this.openSightingModal(bird);
    });

    // Sighting modal events
    document.getElementById('sighting-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('sighting-modal').style.display = 'none';
    });

    document.getElementById('sighting-save-btn')?.addEventListener('click', () => {
      this.saveSighting(bird);
    });

    // Close modal on backdrop click
    document.getElementById('sighting-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'sighting-modal') {
        document.getElementById('sighting-modal').style.display = 'none';
      }
    });
  },

  async openSightingModal(bird) {
    // Set today as default date
    document.getElementById('sighting-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sighting-notes').value = '';

    // Load countries
    const countrySelect = document.getElementById('sighting-country');
    const stateSelect = document.getElementById('sighting-state');

    countrySelect.innerHTML = '<option value="">Select Country...</option>';
    stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
    stateSelect.disabled = true;

    const countries = await EBird.getCountries();
    countries.forEach(c => {
      countrySelect.innerHTML += `<option value="${c.code}">${c.name}</option>`;
    });

    // Bind country change to load states
    countrySelect.onchange = async () => {
      if (countrySelect.value) {
        stateSelect.innerHTML = '<option value="">Loading...</option>';
        const states = await EBird.getStates(countrySelect.value);
        stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
        states.forEach(s => {
          stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
        });
        stateSelect.disabled = false;
      } else {
        stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
        stateSelect.disabled = true;
      }
    };

    // Determine which region to pre-select
    let preSelectRegion = null;

    // Check URL params for context (from=bingo)
    const urlParams = new URLSearchParams(window.location.search);
    const fromContext = urlParams.get('from');

    if (fromContext === 'bingo') {
      // Check bingo card for region
      const bingoCard = JSON.parse(localStorage.getItem('bingoCard') || 'null');
      if (bingoCard && bingoCard.regionCode) {
        if (bingoCard.regionCode.includes('-')) {
          const parts = bingoCard.regionCode.split('-');
          preSelectRegion = {
            countryCode: parts[0],
            stateCode: bingoCard.regionCode
          };
        } else {
          preSelectRegion = {
            countryCode: bingoCard.regionCode,
            stateCode: null
          };
        }
      }
    }

    // Fallback to cached location if not from game/bingo
    if (!preSelectRegion && typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached && cached.countryCode) {
        preSelectRegion = {
          countryCode: cached.countryCode,
          stateCode: cached.stateCode
        };
      }
    }

    // Apply pre-selection
    if (preSelectRegion && preSelectRegion.countryCode) {
      // Use selectedIndex for reliable visual update
      for (let i = 0; i < countrySelect.options.length; i++) {
        if (countrySelect.options[i].value === preSelectRegion.countryCode) {
          countrySelect.selectedIndex = i;
          break;
        }
      }
      // Load states
      stateSelect.innerHTML = '<option value="">Loading...</option>';
      const states = await EBird.getStates(preSelectRegion.countryCode);
      stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
      states.forEach(s => {
        stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
      });
      stateSelect.disabled = false;
      // Pre-select state if available
      if (preSelectRegion.stateCode) {
        for (let i = 0; i < stateSelect.options.length; i++) {
          if (stateSelect.options[i].value === preSelectRegion.stateCode) {
            stateSelect.selectedIndex = i;
            break;
          }
        }
      }
    }

    document.getElementById('sighting-modal').style.display = 'flex';
  },

  async saveSighting(bird) {
    const date = document.getElementById('sighting-date').value;
    const countrySelect = document.getElementById('sighting-country');
    const stateSelect = document.getElementById('sighting-state');
    const notes = document.getElementById('sighting-notes').value;

    if (!date || !countrySelect.value) {
      alert('Please select a date and country');
      return;
    }

    const regionCode = stateSelect.value || countrySelect.value;
    const regionName = stateSelect.value
      ? stateSelect.options[stateSelect.selectedIndex].text
      : countrySelect.options[countrySelect.selectedIndex].text;

    // Save sighting to IndexedDB
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.addSighting({
        speciesCode: bird.speciesCode,
        comName: bird.comName,
        sciName: bird.sciName,
        date: date,
        regionCode: regionCode,
        regionName: regionName,
        notes: notes
      });
    }

    // Close modal and refresh sightings list
    document.getElementById('sighting-modal').style.display = 'none';
    await this.loadBirdSightings(bird);
  },

  // ===== BIRD BINGO =====
  bingoCard: null,

  async initBingo() {
    this.bindBingoEvents();
    await this.loadOrCreateBingoCard();

    // Refresh bingo state when user returns (e.g., after adding a sighting)
    window.addEventListener('pageshow', async (e) => {
      if (e.persisted || performance.navigation.type === 2) {
        await this.updateBingoState();
      }
    });

    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.bingoCard) {
        await this.updateBingoState();
      }
    });
  },

  bindBingoEvents() {
    // Menu toggle
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      if (menuDropdown) menuDropdown.style.display = 'none';
    });

    // Menu options
    document.getElementById('menu-share-score')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      this.openBingoShareModal();
    });

    document.getElementById('menu-new-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      document.getElementById('new-game-modal').style.display = 'flex';
    });

    // Share modal
    document.getElementById('share-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('share-modal').style.display = 'none';
    });

    document.getElementById('do-share-btn')?.addEventListener('click', () => {
      this.shareBingoScore();
    });

    // Share button in bingo winner banner
    document.getElementById('bingo-share-btn')?.addEventListener('click', () => {
      this.openBingoShareModal();
    });

    document.getElementById('share-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'share-modal') {
        document.getElementById('share-modal').style.display = 'none';
      }
    });

    // New game modal
    document.getElementById('confirm-new-game-btn')?.addEventListener('click', () => {
      document.getElementById('new-game-modal').style.display = 'none';
      this.startNewBingoGame();
    });

    document.getElementById('cancel-new-game-btn')?.addEventListener('click', () => {
      document.getElementById('new-game-modal').style.display = 'none';
    });

    // Close modal on backdrop click
    document.getElementById('new-game-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'new-game-modal') {
        document.getElementById('new-game-modal').style.display = 'none';
      }
    });

    // Enable location button
    document.getElementById('enable-location-btn')?.addEventListener('click', () => {
      this.requestLocationForBingo();
    });

    // Retry button
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.requestLocationForBingo();
    });
  },

  async requestLocationForBingo() {
    document.getElementById('bingo-initial').style.display = 'none';
    document.getElementById('bingo-error').style.display = 'none';
    document.getElementById('bingo-loading').style.display = 'block';

    try {
      const location = await LocationService.getLocation(true);
      await this.generateBingoCard(location);
    } catch (error) {
      console.error('Location request failed:', error);
      document.getElementById('bingo-loading').style.display = 'none';
      document.getElementById('bingo-error').style.display = 'block';
    }
  },

  async loadOrCreateBingoCard() {
    const stored = localStorage.getItem('bingoCard');

    if (stored) {
      this.bingoCard = JSON.parse(stored);
      await this.renderBingoCard();
      return;
    }

    // No existing card - check for cached location
    let cachedLocation = null;
    if (typeof LocationService !== 'undefined') {
      cachedLocation = LocationService.getCached();
    }

    if (cachedLocation) {
      document.getElementById('bingo-loading').style.display = 'block';
      await this.generateBingoCard(cachedLocation);
    } else {
      document.getElementById('bingo-initial').style.display = 'block';
    }
  },

  async startNewBingoGame() {
    // Clear existing card
    localStorage.removeItem('bingoCard');
    this.bingoCard = null;

    // Get cached location
    let cachedLocation = null;
    if (typeof LocationService !== 'undefined') {
      cachedLocation = LocationService.getCached();
    }

    if (cachedLocation) {
      document.getElementById('bingo-content').style.display = 'none';
      document.getElementById('bingo-loading').style.display = 'block';
      await this.generateBingoCard(cachedLocation);
    } else {
      document.getElementById('bingo-content').style.display = 'none';
      document.getElementById('bingo-initial').style.display = 'block';
    }
  },

  async generateBingoCard(location) {
    document.getElementById('bingo-initial').style.display = 'none';
    document.getElementById('bingo-loading').style.display = 'block';
    document.getElementById('bingo-error').style.display = 'none';
    document.getElementById('bingo-content').style.display = 'none';

    try {
      let observations;

      // Get nearby birds
      if (LocationService.hasValidCoordinates(location)) {
        observations = await EBird.getNearbyObservations(location.lat, location.lng, 50);
      } else {
        const regionCode = LocationService.getRegionCode(location);
        observations = await EBird.getRecentObservations(regionCode);
      }

      if (observations.length < 24) {
        throw new Error('Not enough birds found nearby');
      }

      // Count observations per species (for sorting by commonality)
      const speciesCount = {};
      const speciesData = {};

      observations.forEach(obs => {
        if (!speciesCount[obs.speciesCode]) {
          speciesCount[obs.speciesCode] = 0;
        }
        speciesCount[obs.speciesCode]++;
        speciesData[obs.speciesCode] = {
          speciesCode: obs.speciesCode,
          comName: obs.comName,
          sciName: obs.sciName
        };
      });

      // Build array and sort by count (most common first)
      const birds = Object.keys(speciesData)
        .map(code => ({
          ...speciesData[code],
          count: speciesCount[code]
        }))
        .sort((a, b) => b.count - a.count);

      // Take top 50 most common birds as the pool, then randomly pick 24
      const birdPool = birds.slice(0, Math.min(50, birds.length));
      this.shuffleArray(birdPool);
      const cardBirds = birdPool.slice(0, 24);

      // Pick random position for free tile (0-24)
      const freePosition = Math.floor(Math.random() * 25);

      // Build 25-tile grid
      const grid = [];
      let birdIndex = 0;
      for (let i = 0; i < 25; i++) {
        if (i === freePosition) {
          grid.push({ isFree: true, comName: 'FREE' });
        } else {
          grid.push({
            isFree: false,
            speciesCode: cardBirds[birdIndex].speciesCode,
            comName: cardBirds[birdIndex].comName,
            sciName: cardBirds[birdIndex].sciName
          });
          birdIndex++;
        }
      }

      // Create bingo card object
      const card = {
        startDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        locationName: LocationService.getRegionDisplayName(location),
        regionCode: LocationService.getRegionCode(location),
        grid: grid,
        bingoAchieved: null // Will store date/time when bingo is achieved
      };

      this.bingoCard = card;
      localStorage.setItem('bingoCard', JSON.stringify(card));

      // Store birds for detail page navigation
      localStorage.setItem('currentBirds', JSON.stringify(cardBirds));

      await this.renderBingoCard();

    } catch (error) {
      console.error('Failed to generate bingo card:', error);
      document.getElementById('bingo-loading').style.display = 'none';
      document.getElementById('bingo-error').style.display = 'block';
    }
  },

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  async renderBingoCard() {
    const card = this.bingoCard;
    if (!card) return;

    document.getElementById('bingo-loading').style.display = 'none';
    document.getElementById('bingo-initial').style.display = 'none';
    document.getElementById('bingo-error').style.display = 'none';
    document.getElementById('bingo-content').style.display = 'block';

    // Set header info - show date and time since sightings are time-based
    const startDateStr = new Date(card.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    document.getElementById('bingo-date').textContent = `Started ${startDateStr}`;
    document.getElementById('bingo-location').textContent = card.locationName || '';

    // Store birds for navigation
    const cardBirds = card.grid.filter(g => !g.isFree);
    localStorage.setItem('currentBirds', JSON.stringify(cardBirds));

    // Update the grid and found state
    await this.updateBingoState();
  },

  async updateBingoState() {
    const card = this.bingoCard;
    if (!card) return;

    // Get sightings with observation date after the bingo card was created
    let sightings = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      const cardCreatedDate = card.createdAt.split('T')[0]; // Get YYYY-MM-DD
      sightings = allSightings.filter(s => {
        return s.date >= cardCreatedDate;
      });
    }
    const seenCodes = new Set(sightings.map(s => s.speciesCode));

    // Render grid
    const gridEl = document.getElementById('bingo-grid');
    gridEl.innerHTML = '';

    const foundBirds = [];

    card.grid.forEach((cell, index) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'bingo-cell';
      cellEl.dataset.index = index;

      if (cell.isFree) {
        cellEl.classList.add('free');
        cellEl.textContent = 'FREE';
      } else {
        cellEl.textContent = cell.comName;

        if (seenCodes.has(cell.speciesCode)) {
          cellEl.classList.add('found');
          foundBirds.push(cell);
        }

        // Click to navigate to bird detail
        cellEl.addEventListener('click', () => {
          window.location.href = `bird?code=${cell.speciesCode}&from=bingo`;
        });
      }

      gridEl.appendChild(cellEl);
    });

    // Update found count
    document.getElementById('found-count').textContent = foundBirds.length;

    // Render found birds list
    const foundListEl = document.getElementById('found-list');
    if (foundBirds.length === 0) {
      foundListEl.innerHTML = '<li class="empty">No birds found yet. Tap a bird to log a sighting!</li>';
    } else {
      foundListEl.innerHTML = foundBirds.map(bird =>
        `<li><a href="bird?code=${bird.speciesCode}&from=bingo" style="color: inherit; text-decoration: none;">${bird.comName}</a></li>`
      ).join('');
    }

    // Check for bingo
    const bingoResult = this.checkBingo(card.grid, seenCodes);
    const winnerEl = document.getElementById('bingo-winner');

    if (bingoResult.hasBingo) {
      // Record bingo time if not already recorded
      if (!card.bingoAchieved) {
        card.bingoAchieved = new Date().toISOString();
        localStorage.setItem('bingoCard', JSON.stringify(card));
      }

      // Show winner banner
      const bingoTimeStr = new Date(card.bingoAchieved).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      document.getElementById('bingo-time').textContent = `Achieved ${bingoTimeStr}`;
      winnerEl.style.display = 'block';

      // Highlight winning line(s)
      bingoResult.winningCells.forEach(index => {
        const cell = gridEl.children[index];
        if (cell) cell.classList.add('bingo-line');
      });
    } else {
      winnerEl.style.display = 'none';
    }
  },

  checkBingo(grid, seenCodes) {
    // Check if a cell is "marked" (free or seen)
    const isMarked = (index) => {
      const cell = grid[index];
      return cell.isFree || seenCodes.has(cell.speciesCode);
    };

    const winningCells = new Set();
    let hasBingo = false;

    // Check rows (5 rows)
    for (let row = 0; row < 5; row++) {
      const indices = [row * 5, row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4];
      if (indices.every(isMarked)) {
        hasBingo = true;
        indices.forEach(i => winningCells.add(i));
      }
    }

    // Check columns (5 columns)
    for (let col = 0; col < 5; col++) {
      const indices = [col, col + 5, col + 10, col + 15, col + 20];
      if (indices.every(isMarked)) {
        hasBingo = true;
        indices.forEach(i => winningCells.add(i));
      }
    }

    // Check diagonals
    const diagonal1 = [0, 6, 12, 18, 24]; // top-left to bottom-right
    const diagonal2 = [4, 8, 12, 16, 20]; // top-right to bottom-left

    if (diagonal1.every(isMarked)) {
      hasBingo = true;
      diagonal1.forEach(i => winningCells.add(i));
    }

    if (diagonal2.every(isMarked)) {
      hasBingo = true;
      diagonal2.forEach(i => winningCells.add(i));
    }

    return {
      hasBingo,
      winningCells: [...winningCells]
    };
  },

  async openBingoShareModal() {
    const card = this.bingoCard;
    if (!card) return;

    // Get found birds
    let sightings = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      const cardCreatedDate = card.createdAt.split('T')[0]; // Get YYYY-MM-DD
      sightings = allSightings.filter(s => {
        return s.date >= cardCreatedDate;
      });
    }
    const seenCodes = new Set(sightings.map(s => s.speciesCode));

    const foundBirds = card.grid.filter(cell => !cell.isFree && seenCodes.has(cell.speciesCode));
    const bingoResult = this.checkBingo(card.grid, seenCodes);

    // Build preview text
    let html = `<strong>Bird Bingo</strong><br>`;
    html += `${card.locationName}<br><br>`;

    if (bingoResult.hasBingo && card.bingoAchieved) {
      const bingoTimeStr = new Date(card.bingoAchieved).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      html += `<strong>BINGO!</strong> ${bingoTimeStr}<br><br>`;
    }

    html += `Found ${foundBirds.length}/24 birds:<br>`;
    if (foundBirds.length > 0) {
      foundBirds.forEach(bird => {
        html += `• ${bird.comName}<br>`;
      });
    } else {
      html += `<em>No birds found yet</em><br>`;
    }

    document.getElementById('share-preview').innerHTML = html;
    document.getElementById('share-modal').style.display = 'flex';
  },

  async shareBingoScore() {
    const card = this.bingoCard;
    if (!card) return;

    // Get found birds
    let sightings = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      const cardCreatedDate = card.createdAt.split('T')[0]; // Get YYYY-MM-DD
      sightings = allSightings.filter(s => {
        return s.date >= cardCreatedDate;
      });
    }
    const seenCodes = new Set(sightings.map(s => s.speciesCode));

    const foundBirds = card.grid.filter(cell => !cell.isFree && seenCodes.has(cell.speciesCode));
    const bingoResult = this.checkBingo(card.grid, seenCodes);

    // Build share text
    let text = `Bird Bingo\n`;
    text += `${card.locationName}\n\n`;

    if (bingoResult.hasBingo && card.bingoAchieved) {
      const bingoTimeStr = new Date(card.bingoAchieved).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      text += `BINGO! ${bingoTimeStr}\n\n`;
    }

    text += `Found ${foundBirds.length}/24 birds:\n`;
    if (foundBirds.length > 0) {
      foundBirds.forEach(bird => {
        text += `• ${bird.comName}\n`;
      });
    } else {
      text += `No birds found yet\n`;
    }

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      });
    }

    document.getElementById('share-modal').style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    App.init();
  } catch (error) {
    console.error('Error initializing app:', error);
    alert('Error loading app. Please refresh the page.\n\n' + error.message);
  }
});

// Birdle - Bird Bingo App

const App = {
  birds: [],
  seenBirds: JSON.parse(localStorage.getItem('seenBirds') || '[]'),
  recentBirds: JSON.parse(localStorage.getItem('recentBirds') || '[]'),
  currentSort: 'most-likely',
  userLocation: null,
  map: null,
  mapMarker: null,
  mapCircle: null,
  pickedLocation: null,
  pickedRadius: null,
  currentBird: null,
  searchQuery: '',
  gameSearchQuery: '',

  saveSearchScrollPosition() {
    sessionStorage.setItem('searchScrollY', window.scrollY);
  },

  async init() {
    // Initialize IndexedDB
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.init();
      // Run one-time cleanup migration
      await this.cleanupRemovedFeatures();
      // Run bingo migration
      await this.migrateLegacyBingoCard();
    }

    const page = this.detectPage();
    if (page === 'search') this.initSearch();
    if (page === 'bird') this.initBirdDetail();
    if (page === 'bingo-games') this.initBingoGames();
    if (page === 'new-bingo') this.initNewBingo();
    if (page === 'bingo') this.initBingo();
    if (page === 'map') this.initMap();
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

  // One-time migration to convert old single bingo game to new multi-game system
  async migrateLegacyBingoCard() {
    // Check if migration already ran
    if (localStorage.getItem('bingo_migrated_to_v89') === 'true') {
      return;
    }

    try {
      const oldCard = localStorage.getItem('bingoCard');

      if (oldCard) {
        const card = JSON.parse(oldCard);

        // Convert old grid format to new birds array
        // Old format had 25 cells with FREE space at ANY position (randomly placed)
        // New format has 24 birds with freePosition stored separately
        const birds = [];
        let freePosition = 12; // Default to center if not found

        if (card.grid && Array.isArray(card.grid)) {
          card.grid.forEach((cell, index) => {
            if (cell.isFree) {
              // Found the FREE space - record its position
              freePosition = index;
            } else if (cell.speciesCode) {
              birds.push({
                speciesCode: cell.speciesCode,
                comName: cell.comName,
                sciName: cell.sciName,
                rarity: cell.rarity || 'common'
              });
            }
          });
        }

        // Only migrate if we have birds
        if (birds.length > 0) {
          // Create the game with the original FREE position preserved
          const gameData = {
            title: 'Migrated Game',
            regionCode: card.regionCode || card.countryCode || 'US',
            regionName: card.regionName || card.locationName || 'Unknown',
            birds: birds,
            foundBirds: [],
            freePosition: freePosition // Preserve original FREE position
          };

          const game = await BirdDB.createBingoGame(gameData);

          // Update the created date to match the old card
          if (card.createdAt) {
            game.createdAt = card.createdAt;
          }

          // If the game was completed, set completion data
          if (card.bingoAchieved || card.completedAt) {
            game.completedAt = card.bingoAchieved || card.completedAt;
            if (card.createdAt && game.completedAt) {
              const start = new Date(card.createdAt);
              const end = new Date(game.completedAt);
              game.completedInSeconds = Math.floor((end - start) / 1000);
            }
          }

          await BirdDB.updateBingoGame(game);

          console.log('Migrated legacy bingo card to game ID:', game.id, 'with FREE at position:', freePosition);
        }

        // Remove old card from localStorage
        localStorage.removeItem('bingoCard');
      }
    } catch (error) {
      console.error('Error migrating legacy bingo card:', error);
    } finally {
      // Mark migration complete (even if there was an error, don't retry)
      localStorage.setItem('bingo_migrated_to_v89', 'true');
    }
  },

  detectPage() {
    const path = window.location.pathname;
    const fullUrl = window.location.pathname + window.location.search;
    // Support both with and without .html extension
    // Order matters - check more specific paths first
    if (path.includes('new-bingo')) return 'new-bingo';
    if (path.includes('bingo-games')) return 'bingo-games';
    if (path.includes('search')) return 'search';
    if (path.includes('bingo')) return 'bingo';
    if (path.includes('life')) return 'life';
    if (path.match(/\/map(\.html)?$/) || fullUrl.includes('map?')) return 'map';
    // Check for 'bird.html', 'bird?', or '/bird' to avoid matching 'birdle'
    if (path.match(/\/bird(\.html)?$/) || fullUrl.includes('bird?')) return 'bird';
    return 'home';
  },

  // ===== SEARCH PAGE =====
  async initSearch() {
    this.bindSearchEvents();
    this.updateSearchLocationButton();
    await this.loadSearchCountries();
    await this.restoreLastSearch();
    this.initScrollToTop();
    // Clear the scroll position after all renders are done
    setTimeout(() => {
      sessionStorage.removeItem('searchScrollY');
    }, 500);
  },

  async loadSearchCountries() {
    // Load countries into modal dropdown
    const modalCountryFilter = document.getElementById('modal-country-filter');
    if (!modalCountryFilter) return;

    try {
      const countries = await EBird.getCountries();
      const cachedCountries = await BirdDB.getCachedCountries();
      const cachedCodes = new Set(cachedCountries.map(c => c.countryCode));

      let html = '<option value="">Select country...</option>';

      // Add downloaded countries section if any exist
      if (cachedCountries.length > 0) {
        html += '<optgroup label="Downloaded">';
        countries.filter(c => cachedCodes.has(c.code)).forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
        html += '</optgroup>';
        html += '<optgroup label="All Countries">';
        countries.forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
        html += '</optgroup>';
      } else {
        countries.forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
      }

      modalCountryFilter.innerHTML = html;
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  },

  // Update location button text based on current search location
  async updateSearchLocationButton() {
    const btn = document.getElementById('current-location-btn');
    const btnText = document.getElementById('current-location-text');

    if (!btn || !btnText) return;

    // Check for active search location from lastSearch
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (lastSearch) {
      if (lastSearch.type === 'location' && lastSearch.lat && lastSearch.lng) {
        btnText.textContent = `📍 ${lastSearch.lat.toFixed(4)}, ${lastSearch.lng.toFixed(4)}`;
        return;
      } else if (lastSearch.type === 'region' && lastSearch.code) {
        // Try to get a nice display name from cached location
        const cached = LocationService?.getCached();
        if (cached && (cached.stateCode === lastSearch.code || cached.countryCode === lastSearch.code)) {
          btnText.textContent = LocationService.getRegionDisplayName(cached);
          return;
        }

        // Try to build display name from lastSearch data
        if (lastSearch.stateCode && lastSearch.countryCode) {
          // Fetch region names from API
          try {
            const countries = await EBird.getCountries();
            const country = countries.find(c => c.code === lastSearch.countryCode);
            if (country) {
              const states = await EBird.getStates(lastSearch.countryCode);
              const state = states.find(s => s.code === lastSearch.stateCode);
              if (state) {
                btnText.textContent = `${state.name}, ${country.name}`;
                return;
              }
            }
          } catch (e) {
            // Fall through to code display
          }
        } else if (lastSearch.countryCode) {
          // Just country
          try {
            const countries = await EBird.getCountries();
            const country = countries.find(c => c.code === lastSearch.countryCode);
            if (country) {
              btnText.textContent = country.name;
              return;
            }
          } catch (e) {
            // Fall through to code display
          }
        }

        // Fallback to showing the code
        btnText.textContent = lastSearch.code;
        return;
      }
    }

    // Fallback to cached location
    if (typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached) {
        btnText.textContent = LocationService.getRegionDisplayName(cached);
      } else {
        btnText.textContent = 'Select Location';
      }
    }
  },

  async openLocationModal() {
    const modal = document.getElementById('location-modal');
    const modalCountryFilter = document.getElementById('modal-country-filter');
    const modalStateFilter = document.getElementById('modal-state-filter');

    if (!modal) return;

    // Pre-populate with cached location if available
    if (typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached && cached.countryCode) {
        // Set country dropdown
        modalCountryFilter.value = cached.countryCode;

        // Load states for this country
        if (cached.stateCode) {
          const states = await EBird.getStates(cached.countryCode);
          if (states.length > 0) {
            modalStateFilter.innerHTML = '<option value="">State/Province...</option>';
            states.forEach(s => {
              modalStateFilter.innerHTML += `<option value="${s.code}">${s.name}</option>`;
            });
            modalStateFilter.disabled = false;
            modalStateFilter.value = cached.stateCode;
          }
        }

        // Enable apply button
        const applyBtn = document.getElementById('apply-region-btn');
        if (applyBtn) applyBtn.disabled = false;
      }
    }

    modal.style.display = 'flex';
  },

  async restoreLastSearch() {
    const birdSearch = document.getElementById('bird-search');
    const sortType = document.getElementById('sort-type');
    const seenFilter = document.getElementById('seen-filter');

    // Priority 1: Check for lastSearch (user's previous search session)
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (lastSearch) {
      // Restore search query if saved
      if (lastSearch.query && birdSearch) {
        birdSearch.value = lastSearch.query;
        this.searchQuery = lastSearch.query.toLowerCase();
      }

      // Restore filter preferences if saved
      if (lastSearch.sortBy && sortType) {
        sortType.value = lastSearch.sortBy;
        this.currentSort = lastSearch.sortBy;
      }
      if (lastSearch.seenFilter && seenFilter) {
        seenFilter.value = lastSearch.seenFilter;
      }

      if (lastSearch.type === 'region') {

        // Set userLocation from cached location for "Nearest" sorting
        if (typeof LocationService !== 'undefined') {
          const cached = LocationService.getCached();
          if (cached && cached.lat && cached.lng) {
            this.userLocation = { lat: cached.lat, lng: cached.lng };
          }
        }

        const regionCode = lastSearch.code || lastSearch.stateCode || lastSearch.countryCode;
        const countryCode = (lastSearch.code || lastSearch.countryCode || '').split('-')[0];
        const isCached = await BirdDB.hasCountryCache(countryCode);

        // Show cached data instantly if available
        if (isCached) {
          const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
          this.birds = birds;
          this.showLoading(false);
          this.renderBirdList();
          this.updateCachePrompt(countryCode);
        } else {
          this.showLoading(true);
        }

        // Then fetch fresh data from API in the background
        try {
          const birds = await EBird.getRecentObservations(regionCode, true);
          if (birds && birds.length > 0) {
            const dedupedBirds = this.deduplicateBirds(birds);

            // Check if bird order has changed - only re-render if different
            const oldCodes = this.birds.map(b => b.speciesCode).join(',');
            const newCodes = dedupedBirds.map(b => b.speciesCode).join(',');
            const orderChanged = oldCodes !== newCodes;

            this.birds = dedupedBirds;
            this.showLoading(false);

            // Only re-render if the order actually changed (prevents image flash)
            if (orderChanged) {
              this.renderBirdList();
            }
            this.updateCachePrompt(countryCode);

            // Update cache with fresh coordinates and order for next time
            if (isCached) {
              birds.forEach(bird => {
                BirdDB.cacheBird(bird, 'api_refresh').catch(err => {
                  console.warn('Failed to update bird cache:', err);
                });
              });

              // Update the cached bird order to match API's chronological order
              const speciesCodes = birds.map(b => b.speciesCode);
              BirdDB.updateCacheOrder(countryCode, speciesCodes).catch(err => {
                console.warn('Failed to update cache order:', err);
              });
            }
            return;
          }
        } catch (e) {
          console.log('Network fetch failed, using cached data...', e.message);
          // Already showing cached data if available, no need to do anything
        }

        // No data available (not cached and API failed)
        if (!isCached) {
          this.birds = [];
          this.showLoading(false);
          this.renderBirdList();
          this.updateCachePrompt(countryCode);
        }
        return;
      } else if (lastSearch.type === 'location') {
        this.userLocation = { lat: lastSearch.lat, lng: lastSearch.lng };

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

        // Use GPS coords if available, otherwise use region
        if (LocationService.hasValidCoordinates(cached)) {
          this.showLoading(true);
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

          // Show cached data instantly if available
          if (countryIsCached) {
            const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
            this.birds = birds;
            this.showLoading(false);
            this.renderBirdList();
            this.updateCachePrompt(cached.countryCode);
          } else {
            this.showLoading(true);
          }

          // Then fetch fresh data from API in the background
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
            console.log('Network fetch failed, using cached data...', e.message);
            // Already showing cached data if available, no need to do anything
          }

          // No data available (not cached and API failed)
          if (!countryIsCached) {
            this.birds = [];
            this.showLoading(false);
            this.renderBirdList();
            this.updateCachePrompt(cached.countryCode);
          }
        }
      }
    }
  },

  bindSearchEvents() {
    const sortType = document.getElementById('sort-type');
    const seenFilter = document.getElementById('seen-filter');
    const birdSearch = document.getElementById('bird-search');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const mapCancelBtn = document.getElementById('map-cancel-btn');
    const mapConfirmBtn = document.getElementById('map-confirm-btn');

    // Current Location button - opens modal
    currentLocationBtn?.addEventListener('click', () => {
      this.openLocationModal();
    });

    // Sort type
    sortType?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.saveFilterPreferences();
      this.renderBirdList();
    });

    // Seen filter
    seenFilter?.addEventListener('change', () => {
      this.saveFilterPreferences();
      this.renderBirdList();
    });

    // Bird search filter - also save to lastSearch
    birdSearch?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.saveSearchQuery(e.target.value);
      this.renderBirdList();
    });

    // Map picker controls
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

    // Location modal events
    this.bindLocationModalEvents();
  },

  bindLocationModalEvents() {
    const modal = document.getElementById('location-modal');
    const closeBtn = document.getElementById('location-modal-close');
    const modalCountryFilter = document.getElementById('modal-country-filter');
    const modalStateFilter = document.getElementById('modal-state-filter');
    const applyRegionBtn = document.getElementById('apply-region-btn');
    const useGpsBtn = document.getElementById('use-gps-btn');
    const modalPickMapBtn = document.getElementById('modal-pick-map-btn');

    // Close modal
    closeBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close on backdrop click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Country filter - load states when country selected
    modalCountryFilter?.addEventListener('change', async (e) => {
      const countryCode = e.target.value;
      modalStateFilter.innerHTML = '<option value="">State/Province...</option>';
      modalStateFilter.disabled = true;
      applyRegionBtn.disabled = !countryCode;

      if (countryCode) {
        // Load states for this country
        const states = await EBird.getStates(countryCode);
        if (states.length > 0) {
          states.forEach(s => {
            modalStateFilter.innerHTML += `<option value="${s.code}">${s.name}</option>`;
          });
          modalStateFilter.disabled = false;
        }
      }
    });

    // State filter - enable apply button
    modalStateFilter?.addEventListener('change', () => {
      applyRegionBtn.disabled = false;
    });

    // Apply region button
    applyRegionBtn?.addEventListener('click', () => {
      const countryCode = modalCountryFilter.value;
      const stateCode = modalStateFilter.value;
      const regionCode = stateCode || countryCode;

      if (regionCode) {
        this.searchByRegion(regionCode);
        modal.style.display = 'none';
      }
    });

    // Use GPS button
    useGpsBtn?.addEventListener('click', () => {
      this.useMyLocation();
      modal.style.display = 'none';
    });

    // Pick on map button
    modalPickMapBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
      this.openMapPicker();
    });
  },

  initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) return;

    // Function to update button visibility
    const updateScrollToTopBtn = () => {
      if (window.scrollY > 300) {
        scrollToTopBtn.style.display = 'flex';
      } else {
        scrollToTopBtn.style.display = 'none';
      }
    };

    // Show/hide button based on scroll position
    window.addEventListener('scroll', updateScrollToTopBtn);

    // Check initial state
    updateScrollToTopBtn();

    // Scroll to top when clicked
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
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

  // Save filter preferences to lastSearch
  saveFilterPreferences() {
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (lastSearch) {
      const sortType = document.getElementById('sort-type');
      const seenFilter = document.getElementById('seen-filter');

      if (sortType) {
        lastSearch.sortBy = sortType.value;
      }
      if (seenFilter) {
        lastSearch.seenFilter = seenFilter.value;
      }

      localStorage.setItem('lastSearch', JSON.stringify(lastSearch));
    }
  },

  async useMyLocation() {
    const gpsStatus = document.getElementById('gps-status');

    if (gpsStatus) {
      gpsStatus.textContent = '📍 Detecting location...';
      gpsStatus.style.display = 'block';
    }

    if (typeof LocationService === 'undefined') {
      alert('Location service not available.');
      if (gpsStatus) {
        gpsStatus.style.display = 'none';
      }
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

      if (gpsStatus) {
        const displayName = LocationService.getRegionDisplayName(location);
        gpsStatus.textContent = `✓ Using ${displayName} (50km radius)`;
      }

      this.showLoading(true);
      const birds = await EBird.getNearbyObservations(lat, lng);
      this.birds = this.deduplicateBirds(birds);
      this.showLoading(false);
      this.renderBirdList();

      // Hide cache prompt for GPS-based search
      this.updateCachePrompt(null);

      // Update the location button text
      this.updateSearchLocationButton();

    } catch (error) {
      alert(error.message || 'Could not get your location. Please try using "Pick on map" instead.');
      if (gpsStatus) {
        gpsStatus.style.display = 'none';
      }
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

    // Update the location button text
    this.updateSearchLocationButton();

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
    // Save enhanced search settings for persistence
    const countryCode = regionCode.split('-')[0];
    const stateCode = regionCode.includes('-') ? regionCode : null;
    localStorage.setItem('lastSearch', JSON.stringify({
      type: 'region',
      code: regionCode,
      countryCode,
      stateCode
    }));

    // Update the location button text
    this.updateSearchLocationButton();

    // Set userLocation from cached location for "Nearest" sorting
    if (!this.userLocation && typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached && cached.lat && cached.lng) {
        this.userLocation = { lat: cached.lat, lng: cached.lng };
      }
    }

    const isCached = await BirdDB.hasCountryCache(countryCode);

    // Show cached data instantly if available
    if (isCached) {
      const birds = await BirdDB.getCachedBirdsForRegion(regionCode);
      this.birds = birds;
      this.showLoading(false);
      this.renderBirdList();
      this.updateCachePrompt(countryCode);
    } else {
      this.showLoading(true);
    }

    // Then fetch fresh data from API in the background
    try {
      const birds = await EBird.getRecentObservations(regionCode, true);
      if (birds && birds.length > 0) {
        const dedupedBirds = this.deduplicateBirds(birds);

        // Check if bird order has changed - only re-render if different
        const oldCodes = this.birds.map(b => b.speciesCode).join(',');
        const newCodes = dedupedBirds.map(b => b.speciesCode).join(',');
        const orderChanged = oldCodes !== newCodes;

        this.birds = dedupedBirds;
        this.showLoading(false);

        // Only re-render if the order actually changed (prevents image flash)
        if (orderChanged) {
          this.renderBirdList();
        }
        this.updateCachePrompt(countryCode);

        // Update cache with fresh coordinates and order for next time
        if (isCached) {
          birds.forEach(bird => {
            BirdDB.cacheBird(bird, 'api_refresh').catch(err => {
              console.warn('Failed to update bird cache:', err);
            });
          });

          // Update the cached bird order to match API's chronological order
          const speciesCodes = birds.map(b => b.speciesCode);
          BirdDB.updateCacheOrder(countryCode, speciesCodes).catch(err => {
            console.warn('Failed to update cache order:', err);
          });
        }
        return;
      }
    } catch (e) {
      console.log('Network fetch failed, using cached data...', e.message);
      // Already showing cached data if available, no need to do anything
    }

    // No data available (not cached and API failed)
    if (!isCached) {
      this.birds = [];
      this.showLoading(false);
      this.renderBirdList();
      this.updateCachePrompt(countryCode);
    }
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
    } else if (this.currentSort === 'most-likely') {
      // "Most Likely" preserves the eBird API's natural order
      // The API returns birds chronologically (most recently observed first)
      // This means actively-seen species appear at the top - a good proxy for "likely to see"
      return birds;
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

  async getBingoBirdCodes() {
    // Get all bird species codes from all active bingo games
    if (typeof BirdDB === 'undefined') return [];

    const games = await BirdDB.getAllBingoGames();
    const birdCodes = new Set();

    for (const game of games) {
      if (game.birds && Array.isArray(game.birds)) {
        game.birds.forEach(bird => {
          if (bird.speciesCode) {
            birdCodes.add(bird.speciesCode);
          }
        });
      }
    }

    return Array.from(birdCodes);
  },

  async renderBirdList() {
    const list = document.getElementById('bird-list');
    if (!list) return;

    // Check if online
    const isOnline = navigator.onLine;

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

    // Get all birds on bingo cards
    const bingoBirdCodes = await this.getBingoBirdCodes();

    const seenFilter = document.getElementById('seen-filter');
    const filterValue = seenFilter?.value || 'all';

    if (filterValue === 'only') {
      // Only show seen birds
      birds = birds.filter(b => seenCodes.includes(b.speciesCode));
    } else if (filterValue === 'hide') {
      // Hide seen birds
      birds = birds.filter(b => !seenCodes.includes(b.speciesCode));
    }
    // 'all' - show all birds (no filtering)

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
      const isOnBingoCard = bingoBirdCodes.includes(bird.speciesCode);
      const showRemove = this.currentSort === 'recent';

      // Always use image layout (images will load from cache if available, even offline)
      return `
        <li class="bird-item ${isSeen ? 'seen' : ''}" data-code="${bird.speciesCode}">
          <a href="bird?code=${bird.speciesCode}">
            <div class="bird-thumbnail loading" data-bird="${bird.comName}" data-sci="${bird.sciName || ''}"></div>
            <div class="bird-info">
              <span class="bird-name">${bird.comName}</span>
              <span class="bird-location">${bird.locName || ''}</span>
            </div>
            <div class="bird-badges">
              ${isSeen ? '<span class="seen-badge">✓</span>' : ''}
            </div>
          </a>
          ${isOnBingoCard ? '<span class="bingo-badge-corner">🎲</span>' : ''}
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

    // Load images lazily (works offline if images are cached)
    this.loadBirdThumbnails(list);

    // Save scroll position when clicking bird links
    list.querySelectorAll('.bird-item a').forEach(link => {
      link.addEventListener('click', () => {
        this.saveSearchScrollPosition();
      });
    });

    // Store birds for detail page (merge with recent birds)
    const allBirds = [...this.birds, ...this.recentBirds];
    const uniqueBirds = allBirds.filter((bird, index, self) =>
      index === self.findIndex(b => b.speciesCode === bird.speciesCode)
    );
    localStorage.setItem('currentBirds', JSON.stringify(uniqueBirds));

    // Restore scroll position after rendering (if returning from bird detail)
    const savedY = sessionStorage.getItem('searchScrollY');
    if (savedY) {
      const scrollPos = parseInt(savedY, 10);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPos);
        this.updateScrollToTopButton();
        setTimeout(() => {
          window.scrollTo(0, scrollPos);
          this.updateScrollToTopButton();
        }, 50);
        setTimeout(() => {
          window.scrollTo(0, scrollPos);
          this.updateScrollToTopButton();
        }, 150);
      });
    }
  },

  updateScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (scrollToTopBtn) {
      if (window.scrollY > 300) {
        scrollToTopBtn.style.display = 'flex';
      } else {
        scrollToTopBtn.style.display = 'none';
      }
    }
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

  async loadBirdThumbnails(listElement) {
    const thumbnails = listElement.querySelectorAll('.bird-thumbnail');
    const autoCacheImages = localStorage.getItem('autoCacheImages') === 'true';
    const isOffline = !navigator.onLine;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const thumbnail = entry.target;
          observer.unobserve(thumbnail);

          const birdName = thumbnail.dataset.bird;
          const sciName = thumbnail.dataset.sci;
          console.log('[Thumbnail] Loading image for:', birdName);

          // Try to fetch image URL (from cache or API)
          let imageUrl = await this.fetchWikipediaImage(birdName);
          console.log('[Thumbnail] Image URL from common name:', imageUrl);
          if (!imageUrl && sciName) {
            console.log('[Thumbnail] Trying scientific name:', sciName);
            imageUrl = await this.fetchWikipediaImage(sciName);
            console.log('[Thumbnail] Image URL from scientific name:', imageUrl);
          }

          // If offline and no cached URL found, switch to text-only immediately
          if (isOffline && !imageUrl) {
            thumbnail.classList.remove('loading');
            const listItem = thumbnail.closest('.bird-item');
            if (listItem) {
              listItem.classList.add('text-only-mode');
            }
            return;
          }

          if (imageUrl) {
            const img = document.createElement('img');
            img.alt = birdName;
            // Don't use native lazy loading - we're already using Intersection Observer

            img.onload = () => {
              thumbnail.classList.remove('loading');
              thumbnail.appendChild(img);

              // Always cache loaded images for offline use
              fetch(imageUrl).catch(() => {
                // Silently fail if caching doesn't work
              });
            };

            img.onerror = () => {
              console.warn('Image failed to load:', imageUrl, 'for bird:', birdName);
              thumbnail.classList.remove('loading');
              // If offline and image fails to load, switch to text-only
              if (isOffline) {
                const listItem = thumbnail.closest('.bird-item');
                if (listItem) {
                  listItem.classList.add('text-only-mode');
                }
              }
            };

            // Set src after event handlers are attached
            img.src = imageUrl;
          } else {
            console.warn('No image URL found for bird:', birdName, 'sciName:', sciName);
            thumbnail.classList.remove('loading');
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before thumbnail is visible
    });

    thumbnails.forEach(thumbnail => observer.observe(thumbnail));
  },

  // ===== BIRD DETAIL PAGE =====
  // ===== MAP PAGE =====
  async initMap() {
    const params = new URLSearchParams(window.location.search);
    const speciesCode = params.get('species');

    const backBtn = document.getElementById('back-btn');
    if (backBtn && speciesCode) {
      backBtn.href = `bird?code=${speciesCode}`;
    }

    if (speciesCode) {
      const bird = await BirdDB.getBird(speciesCode);
      if (bird) {
        document.getElementById('map-title').textContent = bird.comName;
        document.getElementById('map-species').textContent = bird.sciName || '';
      }
    }

    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.requestLocationAndLoadMap(speciesCode));
    }

    // Init the location modal for this map page
    this.initMapLocationModal(speciesCode);

    // Auto-load map if we already have a cached location
    const cached = LocationService.getCached();
    if (cached && LocationService.hasValidCoordinates(cached)) {
      this.requestLocationAndLoadMap(speciesCode);
    }
  },

  async requestLocationAndLoadMap(speciesCode) {
    const statusEl = document.getElementById('map-status');

    // Use cached location if available with valid coordinates
    const cached = LocationService.getCached();
    if (cached && LocationService.hasValidCoordinates(cached)) {
      statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Searching for nearby sightings...</p>';
      await this.loadMapWithSightings(speciesCode, cached.lat, cached.lng);
      return;
    }

    if (!navigator.geolocation) {
      statusEl.innerHTML = '<p>Geolocation is not supported by your browser.</p>';
      return;
    }

    statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Getting your location...</p>';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Searching for nearby sightings...</p>';
        await this.loadMapWithSightings(speciesCode, latitude, longitude);
      },
      (error) => {
        let msg = 'Could not get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings and try again.';
        }
        statusEl.innerHTML = `<div class="status-icon">&#x26A0;</div><p>${msg}</p>
          <button class="btn map-btn" onclick="location.reload()">Try again</button>`;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  },

  _mapInstance: null,

  async reloadMapAtLocation(speciesCode, lat, lng) {
    const statusEl = document.getElementById('map-status');
    const mapViewEl = document.getElementById('map-view');
    const controls = document.getElementById('map-controls');
    const updateContainer = document.getElementById('update-location-container');

    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }

    mapViewEl.style.display = 'none';
    controls.style.display = 'none';
    if (updateContainer) updateContainer.style.display = 'none';
    statusEl.style.display = '';
    statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Searching for nearby sightings...</p>';
    document.getElementById('sighting-count').textContent = '';

    await this.loadMapWithSightings(speciesCode, lat, lng);
  },

  _pickerMap: null,
  _pickerMarker: null,
  _pickerLocation: null,

  initMapLocationModal(speciesCode) {
    const modal = document.getElementById('map-location-modal');
    if (!modal) return;

    const optionsView = document.getElementById('modal-options-view');
    const pickerView = document.getElementById('modal-picker-view');
    const gpsStatus = document.getElementById('modal-gps-status');
    const pickerConfirmBtn = document.getElementById('picker-confirm-btn');

    const closeModal = () => {
      modal.style.display = 'none';
      optionsView.style.display = 'block';
      pickerView.style.display = 'none';
      gpsStatus.style.display = 'none';
      if (this._pickerMap) {
        this._pickerMap.remove();
        this._pickerMap = null;
        this._pickerMarker = null;
        this._pickerLocation = null;
      }
      pickerConfirmBtn.disabled = true;
    };

    // Close modal
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Option 1: Use precise GPS (no cache write)
    document.getElementById('modal-use-gps-btn').addEventListener('click', async () => {
      const btn = document.getElementById('modal-use-gps-btn');
      btn.disabled = true;
      gpsStatus.style.display = 'block';
      gpsStatus.textContent = 'Getting your location...';

      try {
        const coords = await LocationService.requestGPS();
        closeModal();
        await this.reloadMapAtLocation(speciesCode, coords.lat, coords.lng);
      } catch (error) {
        gpsStatus.textContent = error.message;
      } finally {
        btn.disabled = false;
      }
    });

    // Option 2: Open map picker
    document.getElementById('modal-pick-map-btn').addEventListener('click', () => {
      optionsView.style.display = 'none';
      pickerView.style.display = 'block';

      if (!this._pickerMap) {
        let startLat = 40, startLng = -95, startZoom = 4;
        if (this._mapInstance) {
          const center = this._mapInstance.getCenter();
          startLat = center.lat;
          startLng = center.lng;
          startZoom = this._mapInstance.getZoom();
        } else {
          const cached = LocationService.getCached();
          if (cached && LocationService.hasValidCoordinates(cached)) {
            startLat = cached.lat;
            startLng = cached.lng;
            startZoom = 9;
          }
        }

        this._pickerMap = L.map('picker-map').setView([startLat, startLng], startZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM',
          maxZoom: 18
        }).addTo(this._pickerMap);

        this._pickerMap.on('click', (e) => {
          this._pickerLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (this._pickerMarker) {
            this._pickerMarker.setLatLng(e.latlng);
          } else {
            this._pickerMarker = L.marker(e.latlng).addTo(this._pickerMap);
          }
          pickerConfirmBtn.disabled = false;
        });

        setTimeout(() => this._pickerMap.invalidateSize(), 100);
      }
    });

    // Back to options
    document.getElementById('picker-back-btn').addEventListener('click', () => {
      pickerView.style.display = 'none';
      optionsView.style.display = 'block';
      if (this._pickerMap) {
        this._pickerMap.remove();
        this._pickerMap = null;
        this._pickerMarker = null;
        this._pickerLocation = null;
      }
      pickerConfirmBtn.disabled = true;
    });

    // Confirm picked location (no cache write)
    pickerConfirmBtn.addEventListener('click', async () => {
      if (!this._pickerLocation) return;
      const { lat, lng } = this._pickerLocation;
      closeModal();
      await this.reloadMapAtLocation(speciesCode, lat, lng);
    });
  },

  async forceRefreshLocationAndReloadMap(speciesCode) {
    const statusEl = document.getElementById('map-status');
    const mapViewEl = document.getElementById('map-view');
    const controls = document.getElementById('map-controls');
    const updateContainer = document.getElementById('update-location-container');

    // Destroy existing Leaflet map instance
    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }

    // Reset UI to loading state
    mapViewEl.style.display = 'none';
    controls.style.display = 'none';
    if (updateContainer) updateContainer.style.display = 'none';
    statusEl.style.display = '';
    statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Updating your location...</p>';
    document.getElementById('sighting-count').textContent = '';

    try {
      const coords = await LocationService.requestGPS();
      LocationService.saveToCache({ ...LocationService.getCached(), lat: coords.lat, lng: coords.lng, cachedAt: new Date().toISOString() });
      statusEl.innerHTML = '<div class="status-icon">&#x1F50D;</div><p>Searching for nearby sightings...</p>';
      await this.loadMapWithSightings(speciesCode, coords.lat, coords.lng);
    } catch (error) {
      statusEl.innerHTML = `<div class="status-icon">&#x26A0;</div><p>${error.message}</p>
        <button class="btn map-btn" onclick="location.reload()">Try again</button>`;
    }
  },

  async loadMapWithSightings(speciesCode, lat, lng) {
    const observations = await EBird.getNearbySpeciesObservations(speciesCode, lat, lng, 50);

    const statusEl = document.getElementById('map-status');
    const countEl = document.getElementById('sighting-count');

    if (observations.length === 0) {
      statusEl.innerHTML = '<div class="status-icon">&#x1F6AB;</div><p><strong>No recent sightings found</strong></p><p>No one has reported this bird within 50 km in the last 30 days.</p>';
      return;
    }

    // Destroy existing map if any
    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }

    statusEl.style.display = 'none';
    const mapViewEl = document.getElementById('map-view');
    mapViewEl.style.display = 'block';

    const map = L.map('map-view', { zoomControl: false }).setView([lat, lng], 9);
    this._mapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // User location marker (blue)
    L.circleMarker([lat, lng], {
      radius: 8, fillColor: '#4285f4', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(map).bindPopup('You are here');

    // 50km radius circle
    L.circle([lat, lng], {
      radius: 50000, color: '#4285f4', fillColor: '#4285f4', fillOpacity: 0.05, weight: 1,
    }).addTo(map);

    // Map controls below the map
    const controls = document.getElementById('map-controls');
    controls.style.display = 'flex';

    // Replace buttons to avoid stacking event listeners
    const zoomIn = document.getElementById('map-zoom-in');
    const zoomOut = document.getElementById('map-zoom-out');
    const centerBtn = document.getElementById('map-center');
    zoomIn.replaceWith(zoomIn.cloneNode(true));
    zoomOut.replaceWith(zoomOut.cloneNode(true));
    centerBtn.replaceWith(centerBtn.cloneNode(true));
    document.getElementById('map-zoom-in').addEventListener('click', () => map.zoomIn());
    document.getElementById('map-zoom-out').addEventListener('click', () => map.zoomOut());
    document.getElementById('map-center').addEventListener('click', () => map.setView([lat, lng], 13));

    // Update location button
    const updateContainer = document.getElementById('update-location-container');
    if (updateContainer) {
      updateContainer.style.display = 'flex';
      const updateBtn = document.getElementById('update-location-btn');
      updateBtn.replaceWith(updateBtn.cloneNode(true));
      document.getElementById('update-location-btn').addEventListener('click', () => {
        document.getElementById('map-location-modal').style.display = 'flex';
      });
    }

    countEl.textContent = `${observations.length} sighting${observations.length !== 1 ? 's' : ''} within 50 km (last 30 days)`;

    // Plot sighting markers (green)
    const bounds = L.latLngBounds([[lat, lng]]);

    observations.forEach(obs => {
      if (!obs.lat || !obs.lng) return;
      bounds.extend([obs.lat, obs.lng]);

      const date = obs.obsDt || 'Unknown date';
      const count = obs.howMany ? `${obs.howMany} seen` : 'Presence noted';
      const loc = obs.locName || 'Unknown location';

      L.circleMarker([obs.lat, obs.lng], {
        radius: 7, fillColor: '#34a853', color: '#fff', weight: 2, fillOpacity: 0.9,
      }).addTo(map).bindPopup(`<strong>${loc}</strong><br>${count}<br>${date}`);
    });

    // Map stays centered on user at zoom 15, user can pan/zoom to explore
  },

  async initBirdDetail() {
    // Set up back button based on referrer or URL params
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      const params = new URLSearchParams(window.location.search);
      const fromContext = params.get('from');
      const gameId = params.get('gameId');

      if (fromContext === 'bingo' && gameId) {
        backBtn.href = `bingo?id=${gameId}`;
      } else {
        const referrer = document.referrer;
        if (referrer.includes('/life')) {
          backBtn.href = 'life';
        } else if (referrer.includes('/bingo')) {
          backBtn.href = 'bingo-games';
        } else {
          backBtn.href = 'search';
        }
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

    // Set up map link (only when online)
    const mapLink = document.getElementById('map-link');
    if (mapLink) {
      if (navigator.onLine) {
        mapLink.href = `map?species=${bird.speciesCode}`;
      } else {
        mapLink.style.display = 'none';
      }
    }

    // Fetch and display bird image from Wikipedia
    this.loadBirdImage(bird);

    // Set up description button and modal
    this.setupBirdDescription(bird);
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

  async fetchWikipediaImage(searchTerm, forceRefetch = false) {
    // Check cache first (unless forcing refetch)
    const cacheKey = `wiki_img_${searchTerm}`;

    if (!forceRefetch) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        // Skip null cache entries if we're online and it might have been cached while offline
        if (cached === 'null' && navigator.onLine) {
          console.log('[WikiAPI] Skipping null cache for', searchTerm, '- will fetch fresh');
          // Don't return null cache, try to fetch fresh
        } else {
          // Return cached URL (or null if we cached a failed lookup)
          if (cached !== 'null') {
            console.log('[WikiAPI] ✓ Using cached image for:', searchTerm);
          }
          return cached === 'null' ? null : cached;
        }
      }
    }

    try {
      const title = encodeURIComponent(searchTerm.replace(/ /g, '_'));
      // Fetch image AND extract in a single API call
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages|extracts&pithumbsize=400&exintro=1&format=json&origin=*&redirects=1`;
      console.log('[WikiAPI] Fetching:', searchTerm);

      const response = await fetch(url);
      const data = await response.json();

      const pages = data.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];

        // Cache description if available
        if (page.extract) {
          const descKey = `wiki_desc_${searchTerm}`;
          localStorage.setItem(descKey, page.extract);
          console.log('[WikiAPI] ✓ Cached description for:', searchTerm);
        }

        if (page.thumbnail?.source) {
          const imageUrl = page.thumbnail.source;
          console.log('[WikiAPI] ✓ Found image for:', searchTerm);
          // Cache the successful result
          localStorage.setItem(cacheKey, imageUrl);
          return imageUrl;
        }
      }
      console.log('[WikiAPI] ✗ No image found for:', searchTerm);
    } catch (error) {
      console.error('[WikiAPI] ✗ Error fetching image for', searchTerm, ':', error);
    }

    // Cache the failed lookup to avoid repeated API calls (only if online)
    if (navigator.onLine) {
      console.log('[WikiAPI] Caching null result for:', searchTerm);
      localStorage.setItem(cacheKey, 'null');
    }
    return null;
  },

  async setupBirdDescription(bird) {
    const btn = document.getElementById('description-btn');
    const content = document.getElementById('description-content');
    if (!btn || !content) return;

    let loaded = false;

    btn.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      if (isVisible) {
        content.style.display = 'none';
        btn.classList.remove('active');
        return;
      }
      // Load content on first open
      if (!loaded) {
        const desc = this.getWikipediaDescription(bird.comName, bird.sciName);
        if (desc) {
          document.getElementById('desc-body').innerHTML = desc;
          loaded = true;
        }
      }
      content.style.display = 'block';
      btn.classList.add('active');
    });

    // Check if description is already cached
    let desc = this.getWikipediaDescription(bird.comName, bird.sciName);
    if (desc) {
      btn.style.display = 'flex';
      return;
    }

    // Description not cached yet - fetch it directly
    try {
      const searchTerm = bird.comName;
      const title = encodeURIComponent(searchTerm.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=extracts&exintro=1&format=json&origin=*&redirects=1`;
      const response = await fetch(url);
      const data = await response.json();
      const pages = data.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page.extract) {
          localStorage.setItem(`wiki_desc_${searchTerm}`, page.extract);
          btn.style.display = 'flex';
          return;
        }
      }
      // Try scientific name if common name didn't work
      if (bird.sciName) {
        const sciTitle = encodeURIComponent(bird.sciName.replace(/ /g, '_'));
        const sciUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${sciTitle}&prop=extracts&exintro=1&format=json&origin=*&redirects=1`;
        const sciResponse = await fetch(sciUrl);
        const sciData = await sciResponse.json();
        const sciPages = sciData.query?.pages;
        if (sciPages) {
          const sciPage = Object.values(sciPages)[0];
          if (sciPage.extract) {
            localStorage.setItem(`wiki_desc_${bird.sciName}`, sciPage.extract);
            btn.style.display = 'flex';
          }
        }
      }
    } catch (error) {
      console.warn('[WikiAPI] Failed to fetch description:', error);
    }
  },

  // Get cached Wikipedia description for a bird (tries common name then scientific name)
  getWikipediaDescription(comName, sciName) {
    let desc = localStorage.getItem(`wiki_desc_${comName}`);
    if (!desc && sciName) {
      desc = localStorage.getItem(`wiki_desc_${sciName}`);
    }
    return desc;
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
    const gameId = urlParams.get('gameId');

    if (fromContext === 'bingo' && gameId) {
      // Load game from database
      try {
        const game = await BirdDB.getBingoGame(parseInt(gameId));
        if (game && game.regionCode) {
          if (game.regionCode.includes('-')) {
            const parts = game.regionCode.split('-');
            preSelectRegion = {
              countryCode: parts[0],
              stateCode: game.regionCode
            };
          } else {
            preSelectRegion = {
              countryCode: game.regionCode,
              stateCode: null
            };
          }
        }
      } catch (error) {
        console.error('Error loading game for region pre-select:', error);
      }
    }

    // Fallback to cached location if not from bingo
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

  // ===== BINGO GAMES LIST =====
  async initBingoGames() {
    await BirdDB.init();
    this.renderBingoGamesList();
  },

  async renderBingoGamesList() {
    const list = document.getElementById('games-list');
    if (!list) return;

    const games = await BirdDB.getAllBingoGames();

    if (games.length === 0) {
      list.innerHTML = '<li class="empty">No bingo games yet. Tap + to create one!</li>';
      return;
    }

    // Get all sightings once for efficiency
    const allSightings = await BirdDB.getAllSightings();

    list.innerHTML = games.map(game => {
      const totalBirds = game.birds?.length || 24;
      const status = game.completedAt ? 'Completed' : 'In Progress';
      const region = game.regionName || game.regionCode || 'Unknown';

      // Count found birds based on sightings after the game was created
      const cardCreatedDate = game.createdAt?.split('T')[0] || '1970-01-01';
      const validSightings = allSightings.filter(s => s.date >= cardCreatedDate);
      const seenCodes = new Set(validSightings.map(s => s.speciesCode));
      const foundCount = game.birds.filter(bird => seenCodes.has(bird.speciesCode)).length;

      return `
        <li>
          <a href="bingo?id=${game.id}">
            <span class="game-title">${game.title}</span>
            <span class="game-info">${region} · ${foundCount}/${totalBirds} found · ${status}</span>
          </a>
        </li>
      `;
    }).join('');
  },

  // ===== NEW BINGO GAME =====
  selectedRegion: null,
  selectedRegionName: null,

  async initNewBingo() {
    this.selectedRegion = null;
    this.selectedRegionName = null;
    this.selectedCoordinates = null;
    this.bindNewBingoEvents();
    await this.loadCountriesForBingo();
    await this.prePopulateCachedLocation();
  },

  bindNewBingoEvents() {
    const titleInput = document.getElementById('game-title');
    const createBtn = document.getElementById('create-game-btn');
    const countrySelect = document.getElementById('country-select');
    const stateSelect = document.getElementById('state-select');
    const useLocationBtn = document.getElementById('use-location-btn');

    titleInput?.addEventListener('input', () => {
      this.validateNewBingo();
    });

    countrySelect?.addEventListener('change', async (e) => {
      const countryCode = e.target.value;
      stateSelect.innerHTML = '<option value="">Loading...</option>';
      stateSelect.disabled = true;

      // Clear precise coordinates when manually changing region
      this.selectedCoordinates = null;

      if (countryCode) {
        this.selectedRegion = countryCode;
        this.selectedRegionName = countrySelect.options[countrySelect.selectedIndex].text;
        const states = await EBird.getStates(countryCode);
        stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
        states.forEach(s => {
          stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
        });
        stateSelect.disabled = false;
      } else {
        this.selectedRegion = null;
        this.selectedRegionName = null;
        stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
        stateSelect.disabled = true;
      }
      this.updateRegionInfoForBingo();
      this.validateNewBingo();
    });

    stateSelect?.addEventListener('change', (e) => {
      const stateCode = e.target.value;

      // Clear precise coordinates when manually changing region
      this.selectedCoordinates = null;

      if (stateCode) {
        this.selectedRegion = stateCode;
        this.selectedRegionName = stateSelect.options[stateSelect.selectedIndex].text;
      } else {
        const countryCode = countrySelect.value;
        if (countryCode) {
          this.selectedRegion = countryCode;
          this.selectedRegionName = countrySelect.options[countrySelect.selectedIndex].text;
        }
      }
      this.updateRegionInfoForBingo();
      this.validateNewBingo();
    });

    useLocationBtn?.addEventListener('click', async () => {
      useLocationBtn.textContent = '📍 Getting precise location...';
      useLocationBtn.disabled = true;

      try {
        const location = await LocationService.getLocation(true);
        if (location && LocationService.hasValidCoordinates(location)) {
          // Store coordinates for precise bird selection
          this.selectedCoordinates = {
            lat: location.lat,
            lng: location.lng
          };

          // Set the region from GPS location
          this.selectedRegion = location.stateCode || location.countryCode;
          this.selectedRegionName = location.stateCode ? location.stateName : location.countryName;

          // Update dropdowns
          countrySelect.value = location.countryCode;

          if (location.stateCode) {
            const states = await EBird.getStates(location.countryCode);
            stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
            states.forEach(s => {
              stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
            });
            stateSelect.disabled = false;
            stateSelect.value = location.stateCode;
          } else {
            // If only country, load states for that country
            const states = await EBird.getStates(location.countryCode);
            stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
            states.forEach(s => {
              stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
            });
            stateSelect.disabled = false;
          }

          this.updateRegionInfoForBingo();
          this.validateNewBingo();
        }
      } catch (error) {
        console.error('Location error:', error);
        alert('Could not get precise location. Please grant location access or select manually.');
      } finally {
        useLocationBtn.textContent = '📍 Use My Precise Location';
        useLocationBtn.disabled = false;
      }
    });

    createBtn?.addEventListener('click', () => {
      this.createBingoGame();
    });
  },

  async loadCountriesForBingo() {
    const select = document.getElementById('country-select');
    if (!select) return;

    try {
      const countries = await EBird.getCountries();
      const cachedCountries = await BirdDB.getCachedCountries();
      const cachedCodes = new Set(cachedCountries.map(c => c.countryCode));

      let html = '<option value="">Select Country...</option>';

      // Add downloaded countries section if any exist
      if (cachedCountries.length > 0) {
        html += '<optgroup label="Downloaded">';
        countries.filter(c => cachedCodes.has(c.code)).forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
        html += '</optgroup>';
        html += '<optgroup label="All Countries">';
        countries.forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
        html += '</optgroup>';
      } else {
        countries.forEach(c => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
      }

      select.innerHTML = html;
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  },

  async prePopulateCachedLocation() {
    const cachedLocation = LocationService.getCached();
    if (!cachedLocation || !cachedLocation.countryCode) return;

    const countrySelect = document.getElementById('country-select');
    const stateSelect = document.getElementById('state-select');

    // Set country dropdown
    countrySelect.value = cachedLocation.countryCode;

    // Set region and name
    this.selectedRegion = cachedLocation.stateCode || cachedLocation.countryCode;
    this.selectedRegionName = cachedLocation.stateCode ? cachedLocation.stateName : cachedLocation.countryName;

    // Load and set state if available
    if (cachedLocation.countryCode) {
      try {
        const states = await EBird.getStates(cachedLocation.countryCode);
        stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
        states.forEach(s => {
          stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
        });
        stateSelect.disabled = false;

        if (cachedLocation.stateCode) {
          stateSelect.value = cachedLocation.stateCode;
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    }

    this.updateRegionInfoForBingo();
    this.validateNewBingo();
  },

  updateRegionInfoForBingo() {
    const regionInfo = document.getElementById('region-info');
    if (!regionInfo) return;

    if (this.selectedCoordinates) {
      regionInfo.textContent = `📍 Using precise location: ${this.selectedCoordinates.lat.toFixed(4)}, ${this.selectedCoordinates.lng.toFixed(4)}`;
      regionInfo.style.color = '#4caf50';
      regionInfo.style.fontWeight = '600';
    } else if (this.selectedRegion) {
      regionInfo.textContent = `Selected: ${this.selectedRegionName}`;
      regionInfo.style.color = '';
      regionInfo.style.fontWeight = '';
    } else {
      regionInfo.textContent = '';
      regionInfo.style.color = '';
      regionInfo.style.fontWeight = '';
    }
  },

  validateNewBingo() {
    const createBtn = document.getElementById('create-game-btn');
    if (!createBtn) return;

    const isValid = this.selectedRegion !== null;
    createBtn.disabled = !isValid;
  },

  async createBingoGame() {
    const titleInput = document.getElementById('game-title');
    const createBtn = document.getElementById('create-game-btn');
    const spinner = document.getElementById('creating-spinner');

    const title = titleInput.value.trim() || new Date().toLocaleDateString();

    // Show loading
    createBtn.style.display = 'none';
    spinner.style.display = 'block';

    try {
      // Get recent observations - use precise coordinates if available, otherwise region
      let observations;
      if (this.selectedCoordinates) {
        observations = await EBird.getNearbyObservations(
          this.selectedCoordinates.lat,
          this.selectedCoordinates.lng,
          50
        );
      } else {
        observations = await EBird.getRecentObservations(this.selectedRegion);
      }

      if (!observations || observations.length < 24) {
        throw new Error('Not enough birds found in this region');
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

      // Take top 100 most common birds as the pool, then randomly pick 24
      const birdPool = birds.slice(0, Math.min(100, birds.length));
      this.shuffleArray(birdPool);
      const selectedBirds = birdPool.slice(0, 24);

      // Pick random position for FREE space (0-24)
      const freePosition = Math.floor(Math.random() * 25);

      // Create the game
      const gameData = {
        title,
        regionCode: this.selectedRegion,
        regionName: this.selectedRegionName,
        birds: selectedBirds,
        foundBirds: [],
        freePosition: freePosition
      };

      // Add coordinates if using precise location
      if (this.selectedCoordinates) {
        gameData.lat = this.selectedCoordinates.lat;
        gameData.lng = this.selectedCoordinates.lng;
      }

      const game = await BirdDB.createBingoGame(gameData);

      // Navigate to the game
      window.location.href = `bingo?id=${game.id}`;
    } catch (error) {
      console.error('Error creating bingo game:', error);
      alert('Failed to create bingo game. Please try again.');
      createBtn.style.display = 'block';
      spinner.style.display = 'none';
    }
  },

  selectRandomBirds(birds, count) {
    const shuffled = [...birds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, birds.length));
  },

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },

  // ===== BIRD BINGO =====
  bingoCard: null,
  currentGameId: null,

  async initBingo() {
    this.bindBingoEvents();
    await this.loadOrCreateBingoCard();

    // Set up view toggle
    this.setupBingoViewToggle();

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

    document.getElementById('menu-rename-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      this.openRenameModal();
    });

    document.getElementById('menu-new-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      document.getElementById('new-game-modal').style.display = 'flex';
    });

    document.getElementById('menu-delete-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      document.getElementById('delete-game-modal').style.display = 'flex';
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

    // Rename modal
    document.getElementById('do-rename-btn')?.addEventListener('click', () => {
      this.renameBingoGame();
    });

    document.getElementById('rename-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('rename-modal').style.display = 'none';
    });

    document.getElementById('rename-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'rename-modal') {
        document.getElementById('rename-modal').style.display = 'none';
      }
    });

    // Delete game modal
    document.getElementById('confirm-delete-game-btn')?.addEventListener('click', () => {
      this.deleteBingoGame();
    });

    document.getElementById('cancel-delete-game-btn')?.addEventListener('click', () => {
      document.getElementById('delete-game-modal').style.display = 'none';
    });

    document.getElementById('delete-game-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'delete-game-modal') {
        document.getElementById('delete-game-modal').style.display = 'none';
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
    // Get game ID from URL
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');

    if (!gameId) {
      // No game ID - redirect to games list
      window.location.href = 'bingo-games';
      return;
    }

    this.currentGameId = parseInt(gameId);

    // Load game from database
    try {
      const game = await BirdDB.getBingoGame(this.currentGameId);

      if (!game) {
        alert('Game not found');
        window.location.href = 'bingo-games';
        return;
      }

      // Convert game to bingoCard format for compatibility with existing render code
      this.bingoCard = {
        birds: game.birds,
        foundBirds: game.foundBirds || [],
        regionCode: game.regionCode,
        regionName: game.regionName,
        lat: game.lat,
        lng: game.lng,
        freePosition: game.freePosition !== undefined ? game.freePosition : 12,
        createdAt: game.createdAt,
        completedAt: game.completedAt,
        completedInSeconds: game.completedInSeconds
      };

      await this.renderBingoCard();
    } catch (error) {
      console.error('Error loading game:', error);
      alert('Failed to load game');
      window.location.href = 'bingo-games';
    }
  },

  async startNewBingoGame() {
    // Navigate to new game page
    window.location.href = 'new-bingo';
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

    // Load full game to get the title
    const game = await BirdDB.getBingoGame(this.currentGameId);
    const gameTitle = game?.title || 'Bird Bingo';

    // Set header info - show game title and date
    document.getElementById('game-title').textContent = gameTitle;
    const startDateStr = new Date(card.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    document.getElementById('bingo-date').textContent = `Started ${startDateStr}`;

    // Show location with coordinates if available
    const locationEl = document.getElementById('bingo-location');
    if (card.lat && card.lng) {
      locationEl.innerHTML = `${card.regionName || ''} <span style="color: #4caf50; font-weight: 600;">📍 ${card.lat.toFixed(4)}, ${card.lng.toFixed(4)}</span>`;
    } else {
      locationEl.textContent = card.regionName || '';
    }

    // Store birds for navigation
    localStorage.setItem('currentBirds', JSON.stringify(card.birds));

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

    // Get FREE position from card (defaults to 12 if not set - for old games)
    const freePosition = card.freePosition !== undefined ? card.freePosition : 12;

    // Build grid with FREE space at the stored position
    const grid = [];
    let birdIndex = 0;
    for (let i = 0; i < 25; i++) {
      if (i === freePosition) {
        grid.push({ isFree: true });
      } else {
        grid.push(card.birds[birdIndex++]);
      }
    }

    // Render grid
    const gridEl = document.getElementById('bingo-grid');
    gridEl.innerHTML = '';

    const foundBirds = [];

    grid.forEach((cell, index) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'bingo-cell';
      cellEl.dataset.index = index;

      if (cell.isFree) {
        cellEl.classList.add('free');
        cellEl.textContent = 'FREE';
      } else {
        // Create text wrapper for name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'bird-name';
        nameSpan.textContent = cell.comName;
        cellEl.appendChild(nameSpan);

        // Store bird data for image loading
        cellEl.dataset.bird = cell.comName;
        cellEl.dataset.sci = cell.sciName || '';

        if (seenCodes.has(cell.speciesCode)) {
          cellEl.classList.add('found');
          foundBirds.push(cell);
        }

        // Click to navigate to bird detail
        cellEl.addEventListener('click', () => {
          window.location.href = `bird?code=${cell.speciesCode}&from=bingo&gameId=${this.currentGameId}`;
        });
      }

      gridEl.appendChild(cellEl);
    });

    // Update found count
    document.getElementById('found-count').textContent = foundBirds.length;

    // Update foundBirds in card
    card.foundBirds = foundBirds.map(b => b.speciesCode);

    // Render found birds list
    const foundListEl = document.getElementById('found-list');
    if (foundBirds.length === 0) {
      foundListEl.innerHTML = '<li class="empty">No birds found yet. Tap a bird to log a sighting!</li>';
    } else {
      foundListEl.innerHTML = foundBirds.map(bird =>
        `<li><a href="bird?code=${bird.speciesCode}&from=bingo&gameId=${this.currentGameId}" style="color: inherit; text-decoration: none;">${bird.comName}</a></li>`
      ).join('');
    }

    // Check for bingo
    const bingoResult = this.checkBingo(grid, seenCodes);
    const winnerEl = document.getElementById('bingo-winner');

    if (bingoResult.hasBingo) {
      // Record bingo time if not already recorded
      if (!card.completedAt) {
        card.completedAt = new Date().toISOString();
        const completedTime = new Date(card.completedAt);
        const createdTime = new Date(card.createdAt);
        card.completedInSeconds = Math.floor((completedTime - createdTime) / 1000);

        // Save to database
        await this.saveBingoGame();
      }

      // Show winner banner
      const bingoTimeStr = new Date(card.completedAt).toLocaleString('en-US', {
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

    // Save progress to database
    await this.saveBingoGame();

    // Reload images if in image view mode
    if (gridEl.classList.contains('image-view')) {
      this.loadBingoCellImages(gridEl);
    }
  },

  async saveBingoGame() {
    if (!this.currentGameId || !this.bingoCard) return;

    try {
      const game = await BirdDB.getBingoGame(this.currentGameId);
      if (game) {
        game.foundBirds = this.bingoCard.foundBirds;
        game.completedAt = this.bingoCard.completedAt;
        game.completedInSeconds = this.bingoCard.completedInSeconds;
        await BirdDB.updateBingoGame(game);
      }
    } catch (error) {
      console.error('Error saving bingo game:', error);
    }
  },

  setupBingoViewToggle() {
    const toggleBtn = document.getElementById('view-toggle-btn');
    const toggleIcon = document.getElementById('view-toggle-icon');
    const toggleText = document.getElementById('view-toggle-text');
    const gridEl = document.getElementById('bingo-grid');

    if (!toggleBtn || !gridEl) return;

    // Always show toggle button - cached images work offline
    toggleBtn.style.display = 'flex';

    // Check saved preference
    const savedView = localStorage.getItem('bingoViewMode') || 'text';
    if (savedView === 'image') {
      gridEl.classList.add('image-view');
      toggleIcon.textContent = '📝';
      toggleText.textContent = 'Show Names';
      // Don't force refetch on page load - use cache for instant display
      this.loadBingoCellImages(gridEl, false);
    }

    toggleBtn.addEventListener('click', () => {
      const isImageView = gridEl.classList.toggle('image-view');

      if (isImageView) {
        toggleIcon.textContent = '📝';
        toggleText.textContent = 'Show Names';
        localStorage.setItem('bingoViewMode', 'image');
        // Force refetch when online to bypass null cache entries from offline mode
        this.loadBingoCellImages(gridEl, navigator.onLine);
      } else {
        toggleIcon.textContent = '🖼️';
        toggleText.textContent = 'Show Images';
        localStorage.setItem('bingoViewMode', 'text');
      }
    });
  },

  async loadBingoCellImages(gridEl, forceRefetch = false) {
    const cells = gridEl.querySelectorAll('.bingo-cell:not(.free)');
    const autoCacheImages = localStorage.getItem('autoCacheImages') === 'true';

    cells.forEach(async (cell) => {
      // Skip if already has image
      if (cell.querySelector('img')) return;

      const birdName = cell.dataset.bird;
      const sciName = cell.dataset.sci;

      if (!birdName) return;

      // Clear any existing loading state and start fresh
      cell.classList.remove('loading');
      cell.classList.add('loading');

      try {
        // Try to fetch image (with optional cache bypass)
        console.log('Fetching image for:', birdName, 'forceRefetch:', forceRefetch);
        let imageUrl = await this.fetchWikipediaImage(birdName, forceRefetch);
        console.log('Got imageUrl for', birdName, ':', imageUrl);

        if (!imageUrl && sciName) {
          console.log('Trying scientific name:', sciName);
          imageUrl = await this.fetchWikipediaImage(sciName, forceRefetch);
          console.log('Got imageUrl for', sciName, ':', imageUrl);
        }

        if (imageUrl) {
          const img = new Image();
          img.alt = birdName;
          // Don't use lazy loading for bingo cells - they're all visible

          img.onload = () => {
            console.log('Image loaded successfully:', birdName);
            cell.classList.remove('loading');
            // Only append to DOM if image loaded successfully
            cell.appendChild(img);

            // Always cache loaded images for offline use (not just when autoCacheImages is enabled)
            fetch(imageUrl).catch(() => {
              // Silently fail if caching doesn't work
            });
          };

          img.onerror = () => {
            console.log('Image failed to load:', birdName, imageUrl);
            cell.classList.remove('loading');
            // If offline and image fails, show text-only mode
            if (!navigator.onLine) {
              cell.classList.add('text-only-mode');
            }
          };

          // Set src AFTER setting up handlers to ensure they fire
          img.src = imageUrl;
        } else {
          console.log('No imageUrl found for:', birdName);
          cell.classList.remove('loading');
          // If no image URL found and offline, show text-only mode
          if (!navigator.onLine) {
            cell.classList.add('text-only-mode');
          }
        }
      } catch (error) {
        console.log('Error loading image for:', birdName, error);
        cell.classList.remove('loading');
        // Keep gray background on error
      }
    });
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
  },

  openRenameModal() {
    if (!this.currentGameId) return;

    const renameInput = document.getElementById('rename-input');
    const modal = document.getElementById('rename-modal');

    // Pre-fill with current game title
    const currentTitle = document.getElementById('game-title')?.textContent || '';
    renameInput.value = currentTitle;

    modal.style.display = 'flex';
    renameInput.focus();
    renameInput.select();
  },

  async renameBingoGame() {
    if (!this.currentGameId) return;

    const renameInput = document.getElementById('rename-input');
    const newTitle = renameInput.value.trim();

    if (!newTitle) {
      alert('Please enter a game name');
      return;
    }

    try {
      const game = await BirdDB.getBingoGame(this.currentGameId);
      if (game) {
        game.title = newTitle;
        await BirdDB.updateBingoGame(game);

        // Update the title on the page
        document.getElementById('game-title').textContent = newTitle;

        // Close modal
        document.getElementById('rename-modal').style.display = 'none';
      }
    } catch (error) {
      console.error('Error renaming game:', error);
      alert('Failed to rename game');
    }
  },

  async deleteBingoGame() {
    if (!this.currentGameId) return;

    try {
      // Delete the game from the database
      await BirdDB.deleteBingoGame(this.currentGameId);

      // Close modal
      document.getElementById('delete-game-modal').style.display = 'none';

      // Redirect to games list
      window.location.href = 'bingo-games';
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game');
    }
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

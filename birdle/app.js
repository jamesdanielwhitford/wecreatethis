// Birdle - Bird Bingo App

const App = {
  birds: [],
  seenBirds: JSON.parse(localStorage.getItem('seenBirds') || '[]'),
  recentBirds: JSON.parse(localStorage.getItem('recentBirds') || '[]'),
  games: JSON.parse(localStorage.getItem('games') || '[]'),
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
    }

    const page = this.detectPage();
    if (page === 'search') this.initSearch();
    if (page === 'bird') this.initBirdDetail();
    if (page === 'games') this.initGames();
    if (page === 'new-game') this.initNewGame();
    if (page === 'game') this.initGameDetail();
    if (page === 'daily') this.initDaily();
    if (page === 'bingo') this.initBingo();
  },

  detectPage() {
    const path = window.location.pathname;
    const fullUrl = window.location.pathname + window.location.search;
    // Support both with and without .html extension
    // Order matters - check more specific paths first
    if (path.includes('new-game')) return 'new-game';
    if (path.includes('games')) return 'games';
    if (path.includes('search')) return 'search';
    if (path.includes('daily')) return 'daily';
    if (path.includes('bingo')) return 'bingo';
    if (path.includes('life')) return 'life';
    // Check for 'bird.html', 'bird?', or '/bird' to avoid matching 'birdle'
    if (path.match(/\/bird(\.html)?$/) || fullUrl.includes('bird?')) return 'bird';
    // Check for 'game.html', 'game?', or '/game' to avoid matching 'games' or 'new-game'
    if (path.match(/\/game(\.html)?$/) || fullUrl.includes('game?')) return 'game';
    return 'home';
  },

  // ===== SEARCH PAGE =====
  initSearch() {
    this.bindSearchEvents();
    this.updateSearchLocationButton();
    this.restoreLastSearch();
  },

  // Update location button text based on cache state
  updateSearchLocationButton() {
    const btn = document.getElementById('use-location-btn');
    if (btn && typeof LocationService !== 'undefined') {
      btn.textContent = LocationService.getButtonText();
    }
  },

  restoreLastSearch() {
    // First check if we have a cached location from LocationService
    if (typeof LocationService !== 'undefined') {
      const cached = LocationService.getCached();
      if (cached) {
        const locationInfo = document.getElementById('location-info');
        const displayName = LocationService.getRegionDisplayName(cached);

        if (locationInfo) {
          locationInfo.textContent = `📍 ${displayName}`;
          locationInfo.style.display = 'block';
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
          EBird.getRecentObservations(regionCode).then(birds => {
            this.birds = this.deduplicateBirds(birds);
            this.showLoading(false);
            this.renderBirdList();
          });
        }
        return;
      }
    }

    // Fallback to lastSearch localStorage
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (!lastSearch) return;

    if (lastSearch.type === 'region') {
      document.getElementById('country-filter').value = lastSearch.code;
      this.searchByRegion(lastSearch.code);
    } else if (lastSearch.type === 'location') {
      this.userLocation = { lat: lastSearch.lat, lng: lastSearch.lng };

      const locationInfo = document.getElementById('location-info');
      if (locationInfo) {
        locationInfo.textContent = `📍 ${lastSearch.lat.toFixed(4)}, ${lastSearch.lng.toFixed(4)} (50km radius)`;
        locationInfo.style.display = 'block';
      }

      this.showLoading(true);
      EBird.getNearbyObservations(lastSearch.lat, lastSearch.lng).then(birds => {
        this.birds = this.deduplicateBirds(birds);
        this.showLoading(false);
        this.renderBirdList();
      });
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

    // Bird search filter
    birdSearch?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
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
    });
  },

  async searchByRegion(regionCode) {
    // Hide location info when switching to region search
    const locationInfo = document.getElementById('location-info');
    if (locationInfo) {
      locationInfo.style.display = 'none';
    }

    this.showLoading(true);
    localStorage.setItem('lastSearch', JSON.stringify({ type: 'region', code: regionCode }));
    const birds = await EBird.getRecentObservations(regionCode);
    this.birds = this.deduplicateBirds(birds);
    this.showLoading(false);
    this.renderBirdList();
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
    } else if (this.currentSort === 'nearest' && this.userLocation) {
      sorted.sort((a, b) => {
        const distA = this.distance(this.userLocation.lat, this.userLocation.lng, a.lat, a.lng);
        const distB = this.distance(this.userLocation.lat, this.userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
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
      } else if (referrer.includes('/daily')) {
        backBtn.href = 'daily';
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

    // 2. Check lifer challenge
    if (!bird) {
      const liferChallenge = JSON.parse(localStorage.getItem('liferChallenge') || 'null');
      if (liferChallenge?.bird?.speciesCode === code) {
        bird = liferChallenge.bird;
      }
    }

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

    // Check URL params for context (from=game&gameId=X or from=bingo)
    const urlParams = new URLSearchParams(window.location.search);
    const fromContext = urlParams.get('from');
    const gameIdParam = urlParams.get('gameId');

    if (fromContext === 'game' && gameIdParam) {
      const gameId = parseInt(gameIdParam);
      const games = JSON.parse(localStorage.getItem('games') || '[]');
      const game = games.find(g => g.id === gameId);
      if (game && game.regionCode) {
        // Parse game region code (could be country or state)
        if (game.regionCode.includes('-')) {
          // It's a state code like "US-CA"
          const parts = game.regionCode.split('-');
          preSelectRegion = {
            countryCode: parts[0],
            stateCode: game.regionCode
          };
        } else {
          // It's a country code
          preSelectRegion = {
            countryCode: game.regionCode,
            stateCode: null
          };
        }
      }
    } else if (fromContext === 'bingo') {
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

  // ===== GAMES LIST PAGE =====
  async initGames() {
    await BirdDB.init();
    this.renderGamesList();
  },

  async renderGamesList() {
    const list = document.getElementById('games-list');
    if (!list) return;

    if (this.games.length === 0) {
      list.innerHTML = '<li class="empty">No games yet. Tap + to create one!</li>';
      return;
    }

    // Get all sightings once for efficiency
    const allSightings = await BirdDB.getAllSightings();

    list.innerHTML = this.games.map((game, index) => {
      const endDate = game.endDate ? new Date(game.endDate) : null;
      const isEnded = endDate && new Date() > endDate;
      const status = isEnded ? 'Ended' : 'Active';
      const region = game.regionName || game.regionCode || 'Unknown';

      // Calculate seen count from sightings
      const matchingSightings = allSightings.filter(sighting => {
        // Check region
        if (!this.regionMatches(sighting.regionCode, game.regionCode)) {
          return false;
        }
        // Check date range
        if (sighting.date < game.startDate) return false;
        if (game.endDate && sighting.date > game.endDate) return false;
        return true;
      });
      const seenCount = new Set(matchingSightings.map(s => s.speciesCode)).size;

      return `
        <li>
          <a href="game?id=${game.id}">
            <span class="game-title">${game.title}</span>
            <span class="game-info">${region} · ${seenCount} found · ${status}</span>
          </a>
        </li>
      `;
    }).join('');
  },

  // ===== NEW GAME PAGE =====
  async initNewGame() {
    this.selectedRegion = null;
    this.selectedRegionName = null;
    this.bindNewGameEvents();
    await this.loadCountries();

    // Check for shared game parameters
    const params = new URLSearchParams(window.location.search);
    const sharedTitle = params.get('title');
    const sharedRegion = params.get('region');
    const sharedRegionName = params.get('regionName');
    const sharedStart = params.get('start');
    const sharedEnd = params.get('end');

    if (sharedTitle && sharedRegion) {
      // Pre-fill form with shared game data
      const titleInput = document.getElementById('game-title');
      const startDateInput = document.getElementById('start-date');
      const endDateInput = document.getElementById('end-date');

      if (titleInput) titleInput.value = sharedTitle;
      if (startDateInput && sharedStart) startDateInput.value = sharedStart;
      if (endDateInput && sharedEnd) endDateInput.value = sharedEnd;

      // Set the region
      this.selectedRegion = sharedRegion;
      this.selectedRegionName = sharedRegionName || sharedRegion;

      // Pre-select country and state if applicable
      const countryCode = sharedRegion.split('-')[0];
      const countrySelect = document.getElementById('country-select');
      const stateSelect = document.getElementById('state-select');

      if (countrySelect) {
        countrySelect.value = countryCode;

        // Load states for this country
        if (stateSelect) {
          stateSelect.innerHTML = '<option value="">Loading...</option>';
          stateSelect.disabled = true;

          const states = await EBird.getStates(countryCode);
          stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
          states.forEach(s => {
            stateSelect.innerHTML += `<option value="${s.code}">${s.name}</option>`;
          });
          stateSelect.disabled = false;

          // If shared region is a state, select it
          if (sharedRegion.includes('-')) {
            stateSelect.value = sharedRegion;
          }
        }
      }

      this.updateRegionInfo();
      this.validateNewGame();
    } else {
      // Normal flow: set default start date (no auto-detect - wait for user click)
      this.updateRegionInfo(); // Set initial placeholder to date
      const startDateInput = document.getElementById('start-date');
      if (startDateInput) {
        startDateInput.value = new Date().toISOString().split('T')[0];
      }
      // Update button text and auto-fill from cache if available
      this.initLocationButton();
    }
  },

  bindNewGameEvents() {
    const titleInput = document.getElementById('game-title');
    const startDateInput = document.getElementById('start-date');
    const startNowBtn = document.getElementById('start-now-btn');
    const endDateInput = document.getElementById('end-date');
    const noEndBtn = document.getElementById('no-end-btn');
    const createBtn = document.getElementById('create-game-btn');
    const countrySelect = document.getElementById('country-select');
    const stateSelect = document.getElementById('state-select');

    titleInput?.addEventListener('input', () => {
      this.validateNewGame();
    });

    startNowBtn?.addEventListener('click', () => {
      startDateInput.value = new Date().toISOString().split('T')[0];
    });

    noEndBtn?.addEventListener('click', () => {
      endDateInput.value = '';
    });

    countrySelect?.addEventListener('change', async (e) => {
      const countryCode = e.target.value;
      stateSelect.innerHTML = '<option value="">Loading...</option>';
      stateSelect.disabled = true;

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
      }
      this.updateRegionInfo();
      this.validateNewGame();
    });

    stateSelect?.addEventListener('change', (e) => {
      const stateCode = e.target.value;
      if (stateCode) {
        this.selectedRegion = stateCode;
        this.selectedRegionName = stateSelect.options[stateSelect.selectedIndex].text;
      } else {
        // Revert to country
        const countryCode = countrySelect.value;
        this.selectedRegion = countryCode;
        this.selectedRegionName = countrySelect.options[countrySelect.selectedIndex].text;
      }
      this.updateRegionInfo();
      this.validateNewGame();
    });

    document.getElementById('use-location-btn')?.addEventListener('click', () => {
      this.detectLocation();
    });

    createBtn?.addEventListener('click', () => {
      this.createGame();
    });
  },

  // Initialize location button with correct text and auto-fill from cache
  initLocationButton() {
    const btn = document.getElementById('use-location-btn');
    if (!btn) return;

    // Update button text based on cache state
    if (typeof LocationService !== 'undefined') {
      btn.textContent = LocationService.getButtonText();

      // If we have cached location, auto-fill the form
      const cached = LocationService.getCached();
      if (cached) {
        this.applyLocationToForm(cached);
      }
    }
  },

  // Apply location data to the new game form
  async applyLocationToForm(location) {
    const countrySelect = document.getElementById('country-select');
    const regionInfo = document.getElementById('region-info');

    if (!countrySelect || !location.countryCode) return;

    // Select country
    countrySelect.value = location.countryCode;
    countrySelect.dispatchEvent(new Event('change'));

    // Wait for states to load, then select state if available
    if (location.stateCode) {
      setTimeout(() => {
        const stateSelect = document.getElementById('state-select');
        if (stateSelect) {
          stateSelect.value = location.stateCode;
          stateSelect.dispatchEvent(new Event('change'));
        }
      }, 500);
    }

    if (regionInfo) {
      regionInfo.textContent = `Region: ${LocationService.getRegionDisplayName(location)}`;
    }
  },

  async detectLocation() {
    const btn = document.getElementById('use-location-btn');
    const regionInfo = document.getElementById('region-info');

    if (typeof LocationService === 'undefined') {
      alert('Location service not available.');
      return;
    }

    btn.disabled = true;
    btn.textContent = '📍 Detecting...';
    if (regionInfo) regionInfo.textContent = 'Getting your location...';

    try {
      // Force refresh to get new GPS location
      const location = await LocationService.getLocation(true);

      if (regionInfo) regionInfo.textContent = 'Finding region...';

      // Apply to form
      await this.applyLocationToForm(location);

      btn.textContent = LocationService.getButtonText();
      btn.disabled = false;

    } catch (error) {
      console.error('Location detection failed:', error);

      if (regionInfo) {
        regionInfo.textContent = error.message || 'Could not detect location. Please select your region manually.';
      }
      btn.textContent = LocationService.getButtonText();
      btn.disabled = false;
    }
  },

  async loadCountries() {
    const countrySelect = document.getElementById('country-select');
    const countries = await EBird.getCountries();
    countries.forEach(c => {
      countrySelect.innerHTML += `<option value="${c.code}">${c.name}</option>`;
    });
  },

  updateRegionInfo() {
    const regionInfo = document.getElementById('region-info');
    const titleInput = document.getElementById('game-title');

    // Always update title placeholder with auto-generated title
    if (titleInput) {
      titleInput.placeholder = this.generateAutoTitle();
    }

    if (this.selectedRegion) {
      if (regionInfo) {
        regionInfo.textContent = `Region: ${this.selectedRegionName} (${this.selectedRegion})`;
      }
    } else {
      if (regionInfo) {
        regionInfo.textContent = '';
      }
    }
  },

  generateAutoTitle() {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Get country name from select
    const countrySelect = document.getElementById('country-select');
    const stateSelect = document.getElementById('state-select');

    let location = '';
    if (stateSelect?.value) {
      const stateName = stateSelect.options[stateSelect.selectedIndex].text;
      const countryName = countrySelect.options[countrySelect.selectedIndex].text;
      location = `${stateName}, ${countryName}`;
    } else if (countrySelect?.value) {
      location = countrySelect.options[countrySelect.selectedIndex].text;
    }

    return location ? `${today} - ${location}` : today;
  },

  validateNewGame() {
    const createBtn = document.getElementById('create-game-btn');
    const hasRegion = this.selectedRegion !== null;

    // Only need region - title can be auto-generated
    if (createBtn) {
      createBtn.disabled = !hasRegion;
    }
  },

  createGame() {
    const titleInput = document.getElementById('game-title');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const customTitle = titleInput?.value.trim();

    if (!this.selectedRegion) {
      alert('Please select a region');
      return;
    }

    // Use custom title or auto-generate one
    const title = customTitle || this.generateAutoTitle();

    const game = {
      id: Date.now(),
      title: title,
      regionCode: this.selectedRegion,
      regionName: this.selectedRegionName,
      startDate: startDateInput?.value || new Date().toISOString().split('T')[0],
      endDate: endDateInput?.value || null, // null means forever
      createdAt: new Date().toISOString(),
      birds: null, // Will be populated when game is first opened
      seenBirds: [] // Birds seen in this game with timestamps
    };

    this.games.unshift(game);
    localStorage.setItem('games', JSON.stringify(this.games));

    // Navigate to game detail
    window.location.href = `game?id=${game.id}`;
  },

  // ===== GAME DETAIL PAGE =====
  currentGame: null,
  currentGameIndex: null,
  selectedBird: null,
  scoreFilter: null, // null = show all, 'all' = all seen, 'common'/'rare'/'ultra' = seen in that rarity

  initGameDetail() {
    const params = new URLSearchParams(window.location.search);
    const gameId = parseInt(params.get('id'));

    // Find game by id (timestamp) instead of array index
    const index = this.games.findIndex(g => g.id === gameId);
    if (index === -1) {
      document.getElementById('game-title').textContent = 'Game not found';
      return;
    }

    this.currentGameIndex = index;
    this.currentGame = this.games[index];

    this.renderGameHeader();
    this.checkGameStatus();
    this.bindGameEvents();

    if (!this.currentGame.birds) {
      this.loadGameBirds();
    } else {
      this.renderGameBirds();
    }
  },

  renderGameHeader() {
    const game = this.currentGame;

    document.getElementById('game-title').textContent = game.title;

    const locationLink = document.getElementById('game-location');
    locationLink.href = `https://ebird.org/region/${game.regionCode}`;
    locationLink.textContent = `📍 ${game.regionName || game.regionCode}`;

    const datesEl = document.getElementById('game-dates');
    const start = new Date(game.startDate).toLocaleDateString();
    const end = game.endDate ? new Date(game.endDate).toLocaleDateString() : 'Forever';
    datesEl.textContent = `${start} → ${end}`;
  },

  checkGameStatus() {
    const game = this.currentGame;
    const now = new Date();
    const endDate = game.endDate ? new Date(game.endDate) : null;
    const banner = document.getElementById('game-ended-banner');

    if (endDate && now > endDate) {
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  },

  isGameActive() {
    const game = this.currentGame;
    const now = new Date();
    const endDate = game.endDate ? new Date(game.endDate) : null;
    return !endDate || now <= endDate;
  },

  bindGameEvents() {
    // Score filter toggles
    document.querySelectorAll('.score-item').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const filter = item.classList.contains('common') ? 'common'
          : item.classList.contains('rare') ? 'rare'
          : item.classList.contains('ultra') ? 'ultra'
          : 'all';

        // Toggle off if clicking same filter
        if (this.scoreFilter === filter) {
          this.scoreFilter = null;
          document.querySelectorAll('.score-item').forEach(i => i.classList.remove('active'));
        } else {
          this.scoreFilter = filter;
          document.querySelectorAll('.score-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
        this.renderGameBirds();
      });
    });

    // Menu toggle
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
    });

    // Menu options
    document.getElementById('menu-share-score')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      document.getElementById('share-modal').style.display = 'flex';
    });

    document.getElementById('menu-share-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      this.shareGame();
    });

    document.getElementById('menu-change-dates')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      this.openDatesModal();
    });

    document.getElementById('menu-delete-game')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      document.getElementById('delete-modal').style.display = 'flex';
    });

    // Share score modal
    document.getElementById('share-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('share-modal').style.display = 'none';
    });

    document.getElementById('share-timeframe')?.addEventListener('change', (e) => {
      document.getElementById('custom-dates').style.display =
        e.target.value === 'custom' ? 'flex' : 'none';
    });

    document.getElementById('do-share-btn')?.addEventListener('click', () => {
      this.shareScore();
    });

    // Game bird search
    const gameBirdSearch = document.getElementById('game-bird-search');
    gameBirdSearch?.addEventListener('input', (e) => {
      this.gameSearchQuery = e.target.value.toLowerCase();
      this.renderGameBirds();
    });

    // Section collapse toggles
    document.querySelectorAll('.section-title').forEach(title => {
      title.addEventListener('click', () => {
        this.toggleSection(title.dataset.section);
      });
    });

    // Change dates modal
    document.getElementById('dates-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('dates-modal').style.display = 'none';
    });

    document.getElementById('edit-forever-btn')?.addEventListener('click', () => {
      document.getElementById('edit-end-date').value = '';
    });

    document.getElementById('do-save-dates-btn')?.addEventListener('click', () => {
      this.saveDates();
    });

    // Delete modal
    document.getElementById('delete-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('delete-modal').style.display = 'none';
    });

    document.getElementById('do-delete-btn')?.addEventListener('click', () => {
      this.deleteGame();
    });
  },

  async loadGameBirds() {
    document.getElementById('game-loading').style.display = 'block';
    document.getElementById('bird-sections').style.display = 'none';

    const game = this.currentGame;

    // Fetch birds for the region with rarity based on observation frequency
    const birds = await this.fetchBirdsWithRarity(game.regionCode);

    game.birds = birds;
    this.saveGame();

    this.renderGameBirds();
  },

  async fetchBirdsWithRarity(regionCode) {
    // Get all species ever recorded in this region
    const speciesCodes = await EBird.getSpeciesList(regionCode);

    // Get recent observations to determine frequency/rarity
    const observations = await EBird.getRecentObservations(regionCode);

    // Count observations per species
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

    // Build birds array - include all species from species list
    // Species with no recent observations get count of 0 (super rare)
    const birds = [];

    // First add species we have data for from observations
    Object.keys(speciesData).forEach(code => {
      birds.push({
        ...speciesData[code],
        count: speciesCount[code]
      });
    });

    // Sort by count (most common first)
    birds.sort((a, b) => b.count - a.count);

    // Assign rarity based on ranking (top third = common, middle = rare, bottom = super rare)
    const total = birds.length;
    const commonThreshold = Math.floor(total / 3);
    const rareThreshold = Math.floor(total * 2 / 3);

    birds.forEach((bird, index) => {
      if (index < commonThreshold) {
        bird.rarity = 'common';
      } else if (index < rareThreshold) {
        bird.rarity = 'rare';
      } else {
        bird.rarity = 'ultra';
      }
    });

    return birds;
  },

  async renderGameBirds() {
    document.getElementById('game-loading').style.display = 'none';
    document.getElementById('bird-sections').style.display = 'block';

    const birds = this.currentGame.birds || [];

    // Store birds for detail page
    localStorage.setItem('currentBirds', JSON.stringify(birds));

    // Get seen birds from IndexedDB sightings that match this game's criteria
    const seenCodes = await this.getSeenBirdsForGame();

    const common = birds.filter(b => b.rarity === 'common');
    const rare = birds.filter(b => b.rarity === 'rare');
    const ultra = birds.filter(b => b.rarity === 'ultra');

    document.getElementById('common-count').textContent = `(${common.length})`;
    document.getElementById('rare-count').textContent = `(${rare.length})`;
    document.getElementById('ultra-count').textContent = `(${ultra.length})`;

    this.renderBirdSection('common-birds', common, seenCodes, 'common');
    this.renderBirdSection('rare-birds', rare, seenCodes, 'rare');
    this.renderBirdSection('ultra-birds', ultra, seenCodes, 'ultra');

    this.restoreCollapsedSections();
    this.updateScoreSummary(seenCodes);
  },

  // Get birds that have been seen within this game's region and date range
  async getSeenBirdsForGame() {
    if (typeof BirdDB === 'undefined') {
      // Fallback to old seenBirds if no IndexedDB
      return this.currentGame.seenBirds?.map(s => s.speciesCode) || [];
    }

    const game = this.currentGame;
    const allSightings = await BirdDB.getAllSightings();

    // Filter sightings that match this game
    const matchingSightings = allSightings.filter(sighting => {
      // Check region - sighting region must be within or match game region
      if (!this.regionMatches(sighting.regionCode, game.regionCode)) {
        return false;
      }

      // Check date range
      if (sighting.date < game.startDate) return false;
      if (game.endDate && sighting.date > game.endDate) return false;

      return true;
    });

    // Return unique species codes
    const seenCodes = [...new Set(matchingSightings.map(s => s.speciesCode))];
    return seenCodes;
  },

  // Check if sighting region is within or matches game region
  regionMatches(sightingRegion, gameRegion) {
    if (sightingRegion === gameRegion) return true;
    if (sightingRegion.startsWith(gameRegion + '-')) return true;
    if (!gameRegion.includes('-') && sightingRegion.startsWith(gameRegion + '-')) return true;
    return false;
  },

  renderBirdSection(listId, birds, seenCodes, rarity) {
    const list = document.getElementById(listId);
    if (!list) return;

    // Filter by search query
    let filteredBirds = birds;
    if (this.gameSearchQuery) {
      filteredBirds = birds.filter(b =>
        b.comName.toLowerCase().includes(this.gameSearchQuery) ||
        (b.sciName && b.sciName.toLowerCase().includes(this.gameSearchQuery))
      );
    }

    // Filter by score filter (seen only)
    if (this.scoreFilter) {
      if (this.scoreFilter === 'all') {
        // Show all seen birds across all rarities
        filteredBirds = filteredBirds.filter(b => seenCodes.includes(b.speciesCode));
      } else if (this.scoreFilter === rarity) {
        // Show only seen birds in this specific rarity
        filteredBirds = filteredBirds.filter(b => seenCodes.includes(b.speciesCode));
      } else {
        // Different rarity filter is active, hide this section's birds
        filteredBirds = [];
      }
    }

    // Sort birds by count (most common first) within this rarity category
    const sortedBirds = [...filteredBirds].sort((a, b) => b.count - a.count);

    if (sortedBirds.length === 0) {
      if (this.scoreFilter && this.scoreFilter !== rarity && this.scoreFilter !== 'all') {
        // Different rarity filter active, just hide the list
        list.innerHTML = '';
      } else if (this.scoreFilter) {
        list.innerHTML = '<li class="empty">No sightings yet</li>';
      } else if (this.gameSearchQuery) {
        list.innerHTML = '<li class="empty">No matches</li>';
      } else {
        list.innerHTML = '';
      }
      return;
    }

    const gameId = this.currentGame.id;
    list.innerHTML = sortedBirds.map(bird => {
      const isSeen = seenCodes.includes(bird.speciesCode);
      return `
        <li class="${isSeen ? 'seen' : ''}">
          <a href="bird?code=${bird.speciesCode}&from=game&gameId=${gameId}">
            <span class="bird-name">${bird.comName}</span>
            ${isSeen ? '<span class="seen-check">✓</span>' : ''}
          </a>
        </li>
      `;
    }).join('');
  },


  updateScoreSummary(seenCodes) {
    const birds = this.currentGame.birds || [];
    const seen = birds.filter(b => seenCodes.includes(b.speciesCode));

    const total = seen.length;
    const common = seen.filter(s => s.rarity === 'common').length;
    const rare = seen.filter(s => s.rarity === 'rare').length;
    const ultra = seen.filter(s => s.rarity === 'ultra').length;

    document.getElementById('total-found').textContent = total;
    document.getElementById('common-found').textContent = common;
    document.getElementById('rare-found').textContent = rare;
    document.getElementById('ultra-found').textContent = ultra;
  },

  toggleSection(section) {
    const title = document.querySelector(`.section-title[data-section="${section}"]`);
    if (!title) return;

    title.classList.toggle('collapsed');

    // Save collapsed state
    const collapsed = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
    const gameId = this.currentGame.id;
    if (!collapsed[gameId]) collapsed[gameId] = {};
    collapsed[gameId][section] = title.classList.contains('collapsed');
    localStorage.setItem('collapsedSections', JSON.stringify(collapsed));
  },

  restoreCollapsedSections() {
    const collapsed = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
    const gameId = this.currentGame.id;
    if (!collapsed[gameId]) return;

    Object.keys(collapsed[gameId]).forEach(section => {
      if (collapsed[gameId][section]) {
        const title = document.querySelector(`.section-title[data-section="${section}"]`);
        if (title) title.classList.add('collapsed');
      }
    });
  },

  saveGame() {
    this.games[this.currentGameIndex] = this.currentGame;
    localStorage.setItem('games', JSON.stringify(this.games));
  },

  openDatesModal() {
    document.getElementById('edit-start-date').value = this.currentGame.startDate;
    document.getElementById('edit-end-date').value = this.currentGame.endDate || '';
    document.getElementById('dates-modal').style.display = 'flex';
  },

  saveDates() {
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value;

    this.currentGame.startDate = startDate;
    this.currentGame.endDate = endDate || null;
    this.saveGame();

    // Update header display
    this.renderGameHeader();
    this.checkGameStatus();

    document.getElementById('dates-modal').style.display = 'none';
  },

  deleteGame() {
    this.games.splice(this.currentGameIndex, 1);
    localStorage.setItem('games', JSON.stringify(this.games));
    window.location.href = 'games';
  },

  async shareScore() {
    const includeTotal = document.getElementById('share-total').checked;
    const includeRarity = document.getElementById('share-rarity').checked;
    const includeList = document.getElementById('share-list').checked;
    const timeframe = document.getElementById('share-timeframe').value;

    const game = this.currentGame;
    const birds = game.birds || [];

    // Get sightings that match this game
    let sightings = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      sightings = allSightings.filter(s => {
        if (!this.regionMatches(s.regionCode, game.regionCode)) return false;
        if (s.date < game.startDate) return false;
        if (game.endDate && s.date > game.endDate) return false;
        return true;
      });
    }

    // Apply additional timeframe filter
    const now = new Date();
    if (timeframe === 'today') {
      const today = now.toISOString().split('T')[0];
      sightings = sightings.filter(s => s.date === today);
    } else if (timeframe === 'week') {
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      sightings = sightings.filter(s => s.date >= weekAgo);
    } else if (timeframe === 'custom') {
      const from = document.getElementById('share-from-date').value;
      const to = document.getElementById('share-to-date').value;
      if (from) sightings = sightings.filter(s => s.date >= from);
      if (to) sightings = sightings.filter(s => s.date <= to);
    }

    // Get unique species and add rarity info from game birds
    const seenCodes = [...new Set(sightings.map(s => s.speciesCode))];
    const seen = seenCodes.map(code => {
      const sighting = sightings.find(s => s.speciesCode === code);
      const gameBird = birds.find(b => b.speciesCode === code);
      return {
        speciesCode: code,
        comName: sighting?.comName || code,
        rarity: gameBird?.rarity || 'common'
      };
    });

    // Build share text
    let text = `🐦 Birdle: ${game.title}\n\n`;

    if (includeTotal) {
      text += `Found: ${seen.length} birds\n`;
    }

    if (includeRarity) {
      const common = seen.filter(s => s.rarity === 'common').length;
      const rare = seen.filter(s => s.rarity === 'rare').length;
      const ultra = seen.filter(s => s.rarity === 'ultra').length;
      text += `🟢 Common: ${common}\n`;
      text += `🔵 Rare: ${rare}\n`;
      text += `🟣 Ultra: ${ultra}\n`;
    }

    if (includeList && seen.length > 0) {
      text += `\nBirds:\n`;
      seen.forEach(s => {
        const icon = s.rarity === 'common' ? '🟢' : s.rarity === 'rare' ? '🔵' : '🟣';
        text += `${icon} ${s.comName}\n`;
      });
    }

    // Share using Web Share API or copy to clipboard
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Score copied to clipboard!');
      });
    }

    document.getElementById('share-modal').style.display = 'none';
  },

  shareGame() {
    const game = this.currentGame;

    // Create readable URL parameters for new-game page
    const params = new URLSearchParams({
      title: game.title,
      region: game.regionCode,
      regionName: game.regionName || '',
      start: game.startDate
    });

    if (game.endDate) {
      params.set('end', game.endDate);
    }

    const baseUrl = window.location.origin + '/birdle/new-game';
    const shareUrl = `${baseUrl}?${params.toString()}`;

    const endDateText = game.endDate ? new Date(game.endDate).toLocaleDateString() : 'Forever';
    const text = `🐦 Join my Birdle game!\n\n"${game.title}"\n${game.regionName}\n${new Date(game.startDate).toLocaleDateString()} - ${endDateText}\n\n${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Birdle: ${game.title}`,
        text: text,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Game link copied to clipboard!');
      });
    }
  },


  // ===== LIFER CHALLENGE =====
  liferChallenge: null,

  async initDaily() {
    this.bindLiferEvents();
    await this.loadOrCreateLiferChallenge();

    // Refresh challenge state when user returns to the page (e.g., after adding a sighting)
    window.addEventListener('pageshow', async (e) => {
      // Only refresh if returning from back/forward navigation
      if (e.persisted || performance.navigation.type === 2) {
        await this.updateLiferFoundState();
      }
    });

    // Also refresh when page becomes visible (mobile app switching)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.liferChallenge) {
        await this.updateLiferFoundState();
      }
    });
  },

  bindLiferEvents() {
    // Menu toggle
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
      if (menuDropdown) menuDropdown.style.display = 'none';
    });

    // Menu share
    document.getElementById('menu-share-score')?.addEventListener('click', () => {
      menuDropdown.style.display = 'none';
      this.openLiferShareModal();
    });

    // Enable location button (initial state)
    document.getElementById('enable-location-btn')?.addEventListener('click', () => {
      this.requestLocationForChallenge();
    });

    // Retry location button
    document.getElementById('retry-location-btn')?.addEventListener('click', () => {
      this.requestLocationForChallenge();
    });

    // Share complete button
    document.getElementById('share-complete-btn')?.addEventListener('click', () => {
      this.openLiferShareModal();
    });

    // Share modal
    document.getElementById('share-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('share-modal').style.display = 'none';
    });

    document.getElementById('do-share-btn')?.addEventListener('click', () => {
      this.shareLiferScore();
    });

    // Close modals on backdrop click
    document.getElementById('share-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'share-modal') {
        document.getElementById('share-modal').style.display = 'none';
      }
    });
  },

  // Request location permission for lifer challenge
  async requestLocationForChallenge() {
    document.getElementById('daily-initial').style.display = 'none';
    document.getElementById('daily-error').style.display = 'none';
    document.getElementById('daily-loading').style.display = 'block';

    try {
      // Force GPS request
      const location = await LocationService.getLocation(true);
      await this.generateLiferChallenge(location);
    } catch (error) {
      console.error('Location request failed:', error);
      document.getElementById('daily-loading').style.display = 'none';
      document.getElementById('daily-error').style.display = 'block';
      document.getElementById('daily-error').innerHTML = `<p>${error.message}</p><button id="retry-location-btn" class="btn-small">Try Again</button>`;
      // Re-bind retry button since we replaced innerHTML
      document.getElementById('retry-location-btn')?.addEventListener('click', () => {
        this.requestLocationForChallenge();
      });
    }
  },

  async loadOrCreateLiferChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('liferChallenge');

    // Get current cached location
    let cachedLocation = null;
    if (typeof LocationService !== 'undefined') {
      cachedLocation = LocationService.getCached();
    }

    // Check for existing valid challenge - only check date, not location
    // Once a challenge is set for today, keep it (even if found or location changed)
    if (stored) {
      const challenge = JSON.parse(stored);
      if (challenge.date === today) {
        this.liferChallenge = challenge;
        this.renderLiferChallenge();
        return;
      }
    }

    // Need to create new challenge (new day)
    if (cachedLocation) {
      // Use cached location - no GPS request needed
      document.getElementById('daily-loading').style.display = 'block';
      await this.generateLiferChallenge(cachedLocation);
      return;
    }

    // No cached location - show initial state with button
    document.getElementById('daily-initial').style.display = 'block';
    document.getElementById('daily-loading').style.display = 'none';
  },

  async generateLiferChallenge(location) {
    document.getElementById('daily-initial').style.display = 'none';
    document.getElementById('daily-loading').style.display = 'block';
    document.getElementById('daily-error').style.display = 'none';
    document.getElementById('daily-no-birds').style.display = 'none';
    document.getElementById('daily-content').style.display = 'none';

    try {
      let observations;
      let latitude = location.lat;
      let longitude = location.lng;

      // Check if we have valid GPS coordinates or need to use region
      if (LocationService.hasValidCoordinates(location)) {
        // Use GPS-based search
        observations = await EBird.getNearbyObservations(latitude, longitude, 50);
      } else {
        // Use region-based search
        const regionCode = LocationService.getRegionCode(location);
        observations = await EBird.getRecentObservations(regionCode);
        // Set coordinates to 0 for region-based
        latitude = 0;
        longitude = 0;
      }

      if (observations.length === 0) {
        throw new Error('No birds found nearby');
      }

      // Get user's life list (species they've already seen)
      let lifeListCodes = [];
      if (typeof BirdDB !== 'undefined') {
        const allSightings = await BirdDB.getAllSightings();
        lifeListCodes = [...new Set(allSightings.map(s => s.speciesCode))];
      }

      // Deduplicate and count observations
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

      // Build birds array with counts, excluding life list birds
      const birds = Object.keys(speciesData)
        .filter(code => !lifeListCodes.includes(code))
        .map(code => ({
          ...speciesData[code],
          count: speciesCount[code]
        }));

      // Sort by count (most common first) - pick the most common bird not on life list
      birds.sort((a, b) => b.count - a.count);

      if (birds.length === 0) {
        // User has seen all nearby birds!
        document.getElementById('daily-loading').style.display = 'none';
        document.getElementById('daily-no-birds').style.display = 'block';
        return;
      }

      // Select the most common bird not on life list
      const targetBird = birds[0];

      // Assign rarity based on where it falls in the full list
      const total = Object.keys(speciesData).length;
      const allBirdsSorted = Object.keys(speciesData)
        .map(code => ({ code, count: speciesCount[code] }))
        .sort((a, b) => b.count - a.count);

      const targetIndex = allBirdsSorted.findIndex(b => b.code === targetBird.speciesCode);
      const commonThreshold = Math.floor(total / 3);
      const rareThreshold = Math.floor(total * 2 / 3);

      if (targetIndex < commonThreshold) {
        targetBird.rarity = 'common';
      } else if (targetIndex < rareThreshold) {
        targetBird.rarity = 'rare';
      } else {
        targetBird.rarity = 'ultra';
      }

      // Get region info - prefer input location for manual locations
      let locationName, regionCode, regionName;

      if (!LocationService.hasValidCoordinates(location) && location.countryCode) {
        // Manual location - use the location's region info
        locationName = LocationService.getRegionDisplayName(location);
        regionCode = LocationService.getRegionCode(location);
        regionName = location.stateName || location.countryName || 'Your Area';
      } else {
        // GPS location - get from observations
        locationName = 'Nearby';
        regionCode = observations[0]?.subnational1Code || observations[0]?.countryCode || 'WORLD';
        regionName = observations[0]?.subnational1Name || observations[0]?.countryName || 'Your Area';

        // Extract city/location name from first observation if available
        if (observations[0]?.locName) {
          const locParts = observations[0].locName.split(',');
          locationName = locParts[0].trim() || 'Nearby';
        }
      }

      // Create challenge
      const challenge = {
        date: new Date().toISOString().split('T')[0],
        lat: latitude,
        lng: longitude,
        locationName: locationName,
        regionCode: regionCode,
        regionName: regionName,
        bird: targetBird,
        createdAt: new Date().toISOString()
      };

      this.liferChallenge = challenge;
      localStorage.setItem('liferChallenge', JSON.stringify(challenge));

      await this.renderLiferChallenge();

    } catch (error) {
      console.error('Failed to create lifer challenge:', error);
      document.getElementById('daily-loading').style.display = 'none';
      document.getElementById('daily-error').style.display = 'block';
      document.getElementById('daily-error').innerHTML = `<p>${error.message || 'Could not load challenge.'}</p><button id="retry-location-btn" class="btn-small">Try Again</button>`;
      // Re-bind retry button
      document.getElementById('retry-location-btn')?.addEventListener('click', () => {
        this.requestLocationForChallenge();
      });
    }
  },

  async renderLiferChallenge() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    document.getElementById('daily-initial').style.display = 'none';
    document.getElementById('daily-loading').style.display = 'none';
    document.getElementById('daily-error').style.display = 'none';
    document.getElementById('daily-no-birds').style.display = 'none';
    document.getElementById('daily-content').style.display = 'block';

    // Set header info
    const dateStr = new Date(challenge.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('daily-date').textContent = dateStr;

    // Set location as clickable Google search link
    const searchQuery = encodeURIComponent(`where to see ${challenge.bird.comName} near me`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
    const locationLink = document.getElementById('daily-location');
    locationLink.textContent = 'Find it near you →';
    locationLink.href = searchUrl;

    // Set bird info
    document.getElementById('target-bird-name').textContent = challenge.bird.comName;
    const rarityEl = document.getElementById('target-bird-rarity');
    rarityEl.textContent = challenge.bird.rarity.charAt(0).toUpperCase() + challenge.bird.rarity.slice(1);
    rarityEl.className = `bird-rarity ${challenge.bird.rarity}`;

    // Set bird detail link
    const birdLink = document.getElementById('target-bird-link');
    if (birdLink) {
      birdLink.href = `bird?code=${challenge.bird.speciesCode}&from=daily`;
    }

    // Check and update found state based on sightings
    await this.updateLiferFoundState();
  },

  async updateLiferFoundState() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    const item = document.getElementById('target-bird-item');
    const check = document.getElementById('found-check');
    const completedBanner = document.getElementById('daily-completed');

    // Check if user has any sightings for this bird on this date
    let hasFoundBird = false;
    if (typeof BirdDB !== 'undefined') {
      const sightings = await BirdDB.getSightingsForBird(challenge.bird.speciesCode);
      // Check if any sighting matches the challenge date
      hasFoundBird = sightings.some(s => s.date === challenge.date);
    }

    if (hasFoundBird) {
      item?.classList.add('found');
      if (check) check.style.display = 'inline';
      if (completedBanner) completedBanner.style.display = 'block';
    } else {
      item?.classList.remove('found');
      if (check) check.style.display = 'none';
      if (completedBanner) completedBanner.style.display = 'none';
    }
  },

  async openLiferShareModal() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    // Check if user has found the bird
    let hasFoundBird = false;
    if (typeof BirdDB !== 'undefined') {
      const sightings = await BirdDB.getSightingsForBird(challenge.bird.speciesCode);
      hasFoundBird = sightings.some(s => s.date === challenge.date);
    }

    // Generate HTML preview with clickable link
    const dateStr = new Date(challenge.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const searchQuery = encodeURIComponent(`where to see ${challenge.bird.comName} near me`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    let html = `<strong>Birdle Lifer Challenge - ${dateStr}</strong><br><br>`;

    if (hasFoundBird) {
      html += `New lifer: ${challenge.bird.comName}!<br>`;
    } else {
      html += `Target: ${challenge.bird.comName}<br>`;
      html += `Still searching...<br>`;
    }

    html += `<br><a href="${searchUrl}" target="_blank" style="color: #2196f3; text-decoration: none;">Find it near you →</a>`;

    document.getElementById('share-preview').innerHTML = html;
    document.getElementById('share-modal').style.display = 'flex';
  },

  async generateLiferShareText() {
    const challenge = this.liferChallenge;
    if (!challenge) return '';

    // Check if user has found the bird
    let hasFoundBird = false;
    if (typeof BirdDB !== 'undefined') {
      const sightings = await BirdDB.getSightingsForBird(challenge.bird.speciesCode);
      hasFoundBird = sightings.some(s => s.date === challenge.date);
    }

    const dateStr = new Date(challenge.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    let text = `Birdle Lifer Challenge - ${dateStr}\n\n`;

    if (hasFoundBird) {
      text += `New lifer: ${challenge.bird.comName}!\n`;
    } else {
      text += `Target: ${challenge.bird.comName}\n`;
      text += `Still searching...\n`;
    }

    const searchQuery = encodeURIComponent(`where to see ${challenge.bird.comName} near me`);
    text += `\nhttps://www.google.com/search?q=${searchQuery}`;

    return text;
  },

  async shareLiferScore() {
    const text = await this.generateLiferShareText();

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      });
    }

    document.getElementById('share-modal').style.display = 'none';
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

    // Get sightings created after the bingo card was created
    let sightings = [];
    if (typeof BirdDB !== 'undefined') {
      const allSightings = await BirdDB.getAllSightings();
      const cardCreatedAt = new Date(card.createdAt);
      sightings = allSightings.filter(s => {
        const sightingCreatedAt = new Date(s.createdAt);
        return sightingCreatedAt >= cardCreatedAt;
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
      const cardCreatedAt = new Date(card.createdAt);
      sightings = allSightings.filter(s => {
        const sightingCreatedAt = new Date(s.createdAt);
        return sightingCreatedAt >= cardCreatedAt;
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
      const cardCreatedAt = new Date(card.createdAt);
      sightings = allSightings.filter(s => {
        const sightingCreatedAt = new Date(s.createdAt);
        return sightingCreatedAt >= cardCreatedAt;
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

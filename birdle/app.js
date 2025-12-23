// Birdle - Bird Bingo App
console.log('=== app.js loaded, version 40 ===');

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
  },

  detectPage() {
    const path = window.location.pathname;
    if (path.includes('search.html')) return 'search';
    if (path.includes('bird.html')) return 'bird';
    if (path.includes('daily.html')) return 'daily';
    if (path.includes('new-game.html')) return 'new-game';
    if (path.includes('game.html') && !path.includes('games.html') && !path.includes('new-game.html')) return 'game';
    if (path.includes('games.html')) return 'games';
    return 'home';
  },

  // ===== SEARCH PAGE =====
  initSearch() {
    this.bindSearchEvents();
    this.restoreLastSearch();
  },

  restoreLastSearch() {
    const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');
    if (!lastSearch) return;

    if (lastSearch.type === 'region') {
      document.getElementById('country-filter').value = lastSearch.code;
      this.searchByRegion(lastSearch.code);
    } else if (lastSearch.type === 'location') {
      this.userLocation = { lat: lastSearch.lat, lng: lastSearch.lng };

      // Show location info
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

    // Extensive debugging
    console.log('=== Geolocation Debug Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    console.log('Hostname:', window.location.hostname);
    console.log('navigator.geolocation exists:', !!navigator.geolocation);
    console.log('isSecureContext:', window.isSecureContext);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.\n\n' +
                  'Protocol: ' + window.location.protocol + '\n' +
                  'Secure Context: ' + window.isSecureContext;
      alert(msg);
      console.error(msg);
      btn.textContent = '📍 Use My Location';
      btn.disabled = false;
      return;
    }

    // Check permissions API if available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Permission state:', result.state);

        if (result.state === 'denied') {
          alert('Location permission is blocked.\n\nPlease:\n1. Click the lock/info icon in your address bar\n2. Allow location access\n3. Refresh and try again');
          btn.textContent = '📍 Use My Location';
          btn.disabled = false;
          return;
        }
      } catch (e) {
        console.log('Permissions API not available or query failed:', e);
      }
    }

    try {
      // Request permission explicitly first (helps with debugging)
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      this.userLocation = { lat: latitude, lng: longitude };

      // Save and search
      localStorage.setItem('lastSearch', JSON.stringify({
        type: 'location',
        lat: latitude,
        lng: longitude
      }));

      // Show location info
      const locationInfo = document.getElementById('location-info');
      if (locationInfo) {
        locationInfo.textContent = `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (50km radius)`;
        locationInfo.style.display = 'block';
      }

      this.showLoading(true);
      const birds = await EBird.getNearbyObservations(latitude, longitude);
      this.birds = this.deduplicateBirds(birds);
      this.showLoading(false);
      this.renderBirdList();

      btn.textContent = '📍 Use My Location';
      btn.disabled = false;

    } catch (error) {
      console.error('Location error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'Could not get your location.\n\n';

      if (error.code === 1) {
        // PERMISSION_DENIED
        errorMessage += 'Location permission denied.\n\n';
        errorMessage += 'To fix:\n';
        errorMessage += '• Click the location icon in your address bar\n';
        errorMessage += '• Allow location access for this site\n';
        errorMessage += '• Refresh the page and try again';
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        errorMessage += 'Location unavailable.\n\n';
        errorMessage += 'Please check:\n';
        errorMessage += '• Location services are enabled on your device\n';
        errorMessage += '• You have a GPS signal\n';
        errorMessage += '\nOr use "Pick on map" instead.';
      } else if (error.code === 3) {
        // TIMEOUT
        errorMessage += 'Location request timed out.\n\n';
        errorMessage += 'This might happen if:\n';
        errorMessage += '• Your device is searching for GPS signal\n';
        errorMessage += '• Your connection is slow\n';
        errorMessage += '\nTry again or use "Pick on map".';
      } else {
        errorMessage += 'Unknown error.\n\nPlease try using "Pick on map" instead.';
      }

      alert(errorMessage);
      btn.textContent = '📍 Use My Location';
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
          <a href="bird.html?code=${bird.speciesCode}">
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
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      document.getElementById('bird-name').textContent = 'Bird not found';
      return;
    }

    const birds = JSON.parse(localStorage.getItem('currentBirds') || '[]');
    const bird = birds.find(b => b.speciesCode === code);

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
    document.getElementById('bird-location').textContent = bird.locName || 'Unknown';
    document.getElementById('bird-date').textContent = bird.obsDt || 'Unknown';

    // Set up Google search link
    const googleLink = document.getElementById('google-link');
    if (googleLink) {
      const searchQuery = encodeURIComponent(bird.comName + ' bird');
      googleLink.href = `https://www.google.com/search?q=${searchQuery}`;
    }
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
  initGames() {
    this.renderGamesList();
  },

  renderGamesList() {
    const list = document.getElementById('games-list');
    if (!list) return;

    if (this.games.length === 0) {
      list.innerHTML = '<li class="empty">No games yet. Tap + to create one!</li>';
      return;
    }

    list.innerHTML = this.games.map((game, index) => {
      const endDate = game.endDate ? new Date(game.endDate) : null;
      const isEnded = endDate && new Date() > endDate;
      const seenCount = game.seenBirds?.length || 0;
      const status = isEnded ? 'Ended' : 'Active';
      const region = game.regionName || game.regionCode || 'Unknown';

      return `
        <li>
          <a href="game.html?id=${index}">
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
    this.updateRegionInfo(); // Set initial placeholder to date

    // Set default start date to today
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
      startDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Auto-detect user's region
    this.detectLocation();
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

  async detectLocation() {
    const btn = document.getElementById('use-location-btn');
    const regionInfo = document.getElementById('region-info');

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    btn.disabled = true;
    btn.textContent = '📍 Detecting...';
    regionInfo.textContent = 'Getting your location...';

    try {
      // Get GPS coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      regionInfo.textContent = 'Finding region...';

      // Reverse geocode using OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();

      const countryCode = data.address?.country_code?.toUpperCase();
      const state = data.address?.state;

      if (!countryCode) {
        throw new Error('Could not determine country');
      }

      // Select country
      const countrySelect = document.getElementById('country-select');
      countrySelect.value = countryCode;
      countrySelect.dispatchEvent(new Event('change'));

      // Wait for states to load, then try to match state
      if (state) {
        setTimeout(() => {
          const stateSelect = document.getElementById('state-select');
          const stateOption = Array.from(stateSelect.options).find(opt =>
            opt.text.toLowerCase() === state.toLowerCase()
          );
          if (stateOption) {
            stateSelect.value = stateOption.value;
            stateSelect.dispatchEvent(new Event('change'));
          }
        }, 500);
      }

      btn.textContent = '📍 Use My Location';
      btn.disabled = false;

    } catch (error) {
      console.error('Location detection failed:', error);

      let errorMessage = 'Could not detect location. ';

      if (error.code === 1) {
        errorMessage += 'Location permission denied. Please allow location access and try again.';
      } else if (error.code === 2) {
        errorMessage += 'Position unavailable. Please check your location settings.';
      } else if (error.code === 3) {
        errorMessage += 'Request timed out. Please try again.';
      } else {
        errorMessage += 'Please select your region manually.';
      }

      regionInfo.textContent = errorMessage;
      btn.textContent = '📍 Use My Location';
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
    window.location.href = `game.html?id=0`;
  },

  // ===== GAME DETAIL PAGE =====
  currentGame: null,
  currentGameIndex: null,
  selectedBird: null,
  scoreFilter: null, // null = show all, 'all' = all seen, 'common'/'rare'/'ultra' = seen in that rarity

  initGameDetail() {
    const params = new URLSearchParams(window.location.search);
    const index = parseInt(params.get('id'));

    if (isNaN(index) || !this.games[index]) {
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

    // Bird modal
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('bird-modal').style.display = 'none';
    });

    document.getElementById('modal-add-sighting-btn')?.addEventListener('click', () => {
      this.openGameSightingModal();
    });

    // Game sighting modal
    document.getElementById('game-sighting-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('game-sighting-modal').style.display = 'none';
    });

    document.getElementById('game-sighting-save-btn')?.addEventListener('click', () => {
      this.saveGameSighting();
    });

    // Close modals on backdrop click
    document.getElementById('bird-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'bird-modal') {
        document.getElementById('bird-modal').style.display = 'none';
      }
    });

    document.getElementById('game-sighting-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'game-sighting-modal') {
        document.getElementById('game-sighting-modal').style.display = 'none';
      }
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

    list.innerHTML = sortedBirds.map(bird => {
      const isSeen = seenCodes.includes(bird.speciesCode);
      return `
        <li class="${isSeen ? 'seen' : ''}" data-code="${bird.speciesCode}">
          <span class="bird-name">${bird.comName}</span>
          ${isSeen ? '<span class="seen-check">✓</span>' : ''}
        </li>
      `;
    }).join('');

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const code = li.dataset.code;
        this.openBirdModal(code);
      });
    });
  },

  async openBirdModal(speciesCode) {
    const bird = this.currentGame.birds.find(b => b.speciesCode === speciesCode);
    if (!bird) return;

    this.selectedBird = bird;
    const game = this.currentGame;
    const isActive = this.isGameActive();

    document.getElementById('modal-bird-name').textContent = bird.comName;
    document.getElementById('modal-bird-rarity').textContent = bird.rarity;
    document.getElementById('modal-bird-rarity').className = `modal-rarity ${bird.rarity}`;

    // Set up Google search link
    const googleLink = document.getElementById('modal-google-link');
    if (googleLink) {
      const searchQuery = encodeURIComponent(bird.comName + ' bird');
      googleLink.href = `https://www.google.com/search?q=${searchQuery}`;
    }

    // Load and display sightings that match this game
    await this.loadGameBirdSightings(bird);

    // Show add sighting button if game is active
    const addBtn = document.getElementById('modal-add-sighting-btn');
    if (addBtn) {
      addBtn.style.display = isActive ? 'block' : 'none';
    }

    document.getElementById('bird-modal').style.display = 'flex';
  },

  async loadGameBirdSightings(bird) {
    const listEl = document.getElementById('modal-sightings-list');
    if (!listEl || typeof BirdDB === 'undefined') return;

    const game = this.currentGame;
    const allSightings = await BirdDB.getSightingsForBird(bird.speciesCode);

    // Filter to sightings that match this game's criteria
    const gameSightings = allSightings.filter(sighting => {
      if (!this.regionMatches(sighting.regionCode, game.regionCode)) return false;
      if (sighting.date < game.startDate) return false;
      if (game.endDate && sighting.date > game.endDate) return false;
      return true;
    });

    if (gameSightings.length === 0) {
      listEl.innerHTML = '<p class="empty">No sightings in this game yet</p>';
      return;
    }

    // Sort by date descending
    gameSightings.sort((a, b) => b.date.localeCompare(a.date));

    listEl.innerHTML = gameSightings.map(s => `
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
          await this.deleteGameSighting(parseInt(btn.dataset.id));
        }
      });
    });
  },

  async deleteGameSighting(sightingId) {
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.deleteSighting(sightingId);
      await this.loadGameBirdSightings(this.selectedBird);
      // Refresh the game birds list to update seen status
      await this.renderGameBirds();
    }
  },

  openGameSightingModal() {
    const bird = this.selectedBird;
    const game = this.currentGame;
    if (!bird) return;

    document.getElementById('game-sighting-bird-name').textContent = bird.comName;
    document.getElementById('game-sighting-region').textContent = game.regionName || game.regionCode;
    document.getElementById('game-sighting-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('game-sighting-notes').value = '';

    document.getElementById('game-sighting-modal').style.display = 'flex';
  },

  async saveGameSighting() {
    const bird = this.selectedBird;
    const game = this.currentGame;
    if (!bird) return;

    const date = document.getElementById('game-sighting-date').value;
    const notes = document.getElementById('game-sighting-notes').value;

    if (!date) {
      alert('Please select a date');
      return;
    }

    // Save sighting with game's region
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.addSighting({
        speciesCode: bird.speciesCode,
        comName: bird.comName,
        sciName: bird.sciName,
        date: date,
        regionCode: game.regionCode,
        regionName: game.regionName,
        notes: notes
      });
    }

    // Close sighting modal and refresh
    document.getElementById('game-sighting-modal').style.display = 'none';
    await this.loadGameBirdSightings(bird);
    await this.renderGameBirds();
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
    window.location.href = 'games.html';
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

    // Encode game data in URL parameters
    const params = new URLSearchParams({
      title: game.title,
      region: game.regionCode,
      regionName: game.regionName || '',
      start: game.startDate,
      end: game.endDate || ''
    });

    const baseUrl = window.location.origin + '/birdle/game.html';
    const shareUrl = `${baseUrl}?join=${btoa(params.toString())}`;

    const text = `🐦 Join my Birdle game: "${game.title}"\n\n${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Birdle: ${game.title}`,
        text: `Join my Birdle game: "${game.title}"`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert('Game link copied to clipboard!');
      });
    }
  },

  // Check for shared game URL and create game
  checkForSharedGame() {
    const params = new URLSearchParams(window.location.search);
    const joinData = params.get('join');

    if (!joinData) return false;

    try {
      const decoded = atob(joinData);
      const gameParams = new URLSearchParams(decoded);

      const title = gameParams.get('title');
      const regionCode = gameParams.get('region');
      const regionName = gameParams.get('regionName') || regionCode;
      const startDate = gameParams.get('start');
      const endDate = gameParams.get('end') || null;

      if (!title || !regionCode) {
        return false;
      }

      // Create new game from shared data
      const game = {
        id: Date.now(),
        title: title,
        regionCode: regionCode,
        regionName: regionName,
        startDate: startDate,
        endDate: endDate,
        createdAt: new Date().toISOString(),
        birds: null,
        seenBirds: [],
        sharedFrom: true
      };

      this.games.unshift(game);
      localStorage.setItem('games', JSON.stringify(this.games));

      // Redirect to the new game without the join parameter
      window.location.href = `game.html?id=0`;
      return true;

    } catch (e) {
      console.error('Failed to parse shared game:', e);
      return false;
    }
  },

  // ===== LIFER CHALLENGE =====
  liferChallenge: null,
  liferSightingId: null,

  async initDaily() {
    this.bindLiferEvents();
    await this.loadOrCreateLiferChallenge();
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

    // Retry location button
    document.getElementById('retry-location-btn')?.addEventListener('click', () => {
      document.getElementById('daily-error').style.display = 'none';
      document.getElementById('daily-loading').style.display = 'block';
      this.loadOrCreateLiferChallenge();
    });

    // Found button - toggles on/off
    document.getElementById('found-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLiferFound();
    });

    // Bird item click - open modal
    document.getElementById('target-bird-item')?.addEventListener('click', (e) => {
      if (e.target.closest('.daily-found-btn')) return;
      this.openLiferBirdModal();
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

    // Bird detail modal
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('bird-modal').style.display = 'none';
    });

    document.getElementById('modal-found-btn')?.addEventListener('click', () => {
      this.toggleLiferFound();
      document.getElementById('bird-modal').style.display = 'none';
    });

    document.getElementById('modal-unfound-btn')?.addEventListener('click', () => {
      this.toggleLiferFound();
      document.getElementById('bird-modal').style.display = 'none';
    });

    // Close modals on backdrop click
    document.getElementById('share-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'share-modal') {
        document.getElementById('share-modal').style.display = 'none';
      }
    });

    document.getElementById('bird-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'bird-modal') {
        document.getElementById('bird-modal').style.display = 'none';
      }
    });
  },

  async loadOrCreateLiferChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('liferChallenge');

    if (stored) {
      const challenge = JSON.parse(stored);
      if (challenge.date === today) {
        this.liferChallenge = challenge;
        this.renderLiferChallenge();
        return;
      }
    }

    // Need to create new challenge for today
    await this.generateLiferChallenge();
  },

  async generateLiferChallenge() {
    document.getElementById('daily-loading').style.display = 'block';
    document.getElementById('daily-error').style.display = 'none';
    document.getElementById('daily-no-birds').style.display = 'none';
    document.getElementById('daily-content').style.display = 'none';

    if (!navigator.geolocation) {
      document.getElementById('daily-loading').style.display = 'none';
      document.getElementById('daily-error').style.display = 'block';
      document.getElementById('daily-error').innerHTML = '<p>Geolocation is not supported by your browser.</p>';
      return;
    }

    try {
      // Get user's location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Get nearby birds
      const observations = await EBird.getNearbyObservations(latitude, longitude, 50);

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

      // Reverse geocode for location name
      let locationName = 'Your Area';
      let regionCode = 'US';
      let regionName = 'Your Area';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        locationName = data.address?.city || data.address?.town || data.address?.county || data.address?.state || 'Your Area';

        const countryCode = data.address?.country_code?.toUpperCase() || 'US';
        const state = data.address?.state;

        if (countryCode && state) {
          const states = await EBird.getStates(countryCode);
          const stateMatch = states.find(s => s.name.toLowerCase() === state.toLowerCase());
          if (stateMatch) {
            regionCode = stateMatch.code;
            regionName = stateMatch.name;
          } else {
            regionCode = countryCode;
            regionName = data.address?.country || countryCode;
          }
        } else if (countryCode) {
          regionCode = countryCode;
          regionName = data.address?.country || countryCode;
        }
      } catch (e) {
        console.error('Geocoding failed:', e);
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
        found: false,
        sightingId: null,
        createdAt: new Date().toISOString()
      };

      this.liferChallenge = challenge;
      localStorage.setItem('liferChallenge', JSON.stringify(challenge));

      this.renderLiferChallenge();

    } catch (error) {
      console.error('Failed to create lifer challenge:', error);
      document.getElementById('daily-loading').style.display = 'none';
      document.getElementById('daily-error').style.display = 'block';
    }
  },

  renderLiferChallenge() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

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
    document.getElementById('daily-location').textContent = challenge.locationName;

    // Set bird info
    document.getElementById('target-bird-name').textContent = challenge.bird.comName;
    const rarityEl = document.getElementById('target-bird-rarity');
    rarityEl.textContent = challenge.bird.rarity.charAt(0).toUpperCase() + challenge.bird.rarity.slice(1);
    rarityEl.className = `bird-rarity ${challenge.bird.rarity}`;

    // Update found state
    this.updateLiferFoundState();
  },

  updateLiferFoundState() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    const item = document.getElementById('target-bird-item');
    const btn = document.getElementById('found-btn');
    const check = document.getElementById('found-check');
    const completedBanner = document.getElementById('daily-completed');

    if (challenge.found) {
      item?.classList.add('found');
      if (btn) {
        btn.textContent = 'Undo';
        btn.style.background = '#999';
      }
      if (check) check.style.display = 'inline';
      if (completedBanner) completedBanner.style.display = 'block';
    } else {
      item?.classList.remove('found');
      if (btn) {
        btn.textContent = 'Found';
        btn.style.background = '#333';
      }
      if (check) check.style.display = 'none';
      if (completedBanner) completedBanner.style.display = 'none';
    }
  },

  async toggleLiferFound() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    if (challenge.found) {
      // Undo - remove sighting
      if (challenge.sightingId && typeof BirdDB !== 'undefined') {
        await BirdDB.deleteSighting(challenge.sightingId);
      }
      challenge.found = false;
      challenge.sightingId = null;
    } else {
      // Mark as found - add sighting
      if (typeof BirdDB !== 'undefined') {
        const sightingId = await BirdDB.addSighting({
          speciesCode: challenge.bird.speciesCode,
          comName: challenge.bird.comName,
          sciName: challenge.bird.sciName,
          date: challenge.date,
          regionCode: challenge.regionCode,
          regionName: challenge.regionName,
          notes: 'Lifer Challenge'
        });
        challenge.sightingId = sightingId;
      }
      challenge.found = true;
    }

    localStorage.setItem('liferChallenge', JSON.stringify(challenge));
    this.updateLiferFoundState();
  },

  openLiferBirdModal() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    const bird = challenge.bird;

    document.getElementById('modal-bird-name').textContent = bird.comName;
    document.getElementById('modal-bird-rarity').textContent = bird.rarity.charAt(0).toUpperCase() + bird.rarity.slice(1);
    document.getElementById('modal-bird-rarity').className = `modal-rarity ${bird.rarity}`;
    document.getElementById('modal-bird-scientific').textContent = bird.sciName || '';

    // Set up Google search link
    const googleLink = document.getElementById('modal-google-link');
    if (googleLink) {
      const searchQuery = encodeURIComponent(bird.comName + ' bird');
      googleLink.href = `https://www.google.com/search?q=${searchQuery}`;
    }

    // Update button states based on found status
    const foundBtn = document.getElementById('modal-found-btn');
    const unfoundBtn = document.getElementById('modal-unfound-btn');

    if (challenge.found) {
      foundBtn.style.display = 'none';
      unfoundBtn.style.display = 'block';
    } else {
      foundBtn.style.display = 'block';
      unfoundBtn.style.display = 'none';
    }

    document.getElementById('bird-modal').style.display = 'flex';
  },

  openLiferShareModal() {
    const challenge = this.liferChallenge;
    if (!challenge) return;

    const preview = this.generateLiferShareText();
    document.getElementById('share-preview').textContent = preview;
    document.getElementById('share-modal').style.display = 'flex';
  },

  generateLiferShareText() {
    const challenge = this.liferChallenge;
    if (!challenge) return '';

    const dateStr = new Date(challenge.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    let text = `Birdle Lifer Challenge - ${dateStr}\n`;
    text += `${challenge.locationName}\n\n`;

    if (challenge.found) {
      text += `New lifer: ${challenge.bird.comName}!\n`;
    } else {
      text += `Target: ${challenge.bird.comName}\n`;
      text += `Still searching...\n`;
    }

    return text;
  },

  shareLiferScore() {
    const text = this.generateLiferShareText();

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

// Check for shared game before normal init
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Birdle App Starting ===');
  console.log('Current page:', window.location.pathname);
  console.log('App object exists:', typeof App !== 'undefined');

  try {
    // If on game page, check for shared game first
    if (window.location.pathname.includes('game.html') &&
        window.location.search.includes('join=')) {
      if (App.checkForSharedGame()) {
        return; // Will redirect
      }
    }
    console.log('Calling App.init()...');
    App.init();
    console.log('App.init() completed');
  } catch (error) {
    console.error('Error initializing app:', error);
    alert('Error loading app. Please refresh the page.\n\n' + error.message);
  }
});

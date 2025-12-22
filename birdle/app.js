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

  init() {
    const page = this.detectPage();
    if (page === 'search') this.initSearch();
    if (page === 'bird') this.initBirdDetail();
    if (page === 'games') this.initGames();
    if (page === 'new-game') this.initNewGame();
    if (page === 'game') this.initGameDetail();
  },

  detectPage() {
    const path = window.location.pathname;
    if (path.includes('search.html')) return 'search';
    if (path.includes('bird.html')) return 'bird';
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
    const sortType = document.getElementById('sort-type');
    const seenFilter = document.getElementById('seen-filter');
    const pickLocationBtn = document.getElementById('pick-location-btn');
    const mapCancelBtn = document.getElementById('map-cancel-btn');
    const mapConfirmBtn = document.getElementById('map-confirm-btn');

    countryFilter?.addEventListener('change', (e) => {
      if (e.target.value) {
        this.searchByRegion(e.target.value);
      }
    });

    sortType?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderBirdList();
    });

    seenFilter?.addEventListener('change', () => {
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
        () => {
          // Default to world view if location fails
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

  renderBirdList() {
    const list = document.getElementById('bird-list');
    if (!list) return;

    let birds;

    // If "recent" sort, show recently viewed birds
    if (this.currentSort === 'recent') {
      birds = this.recentBirds;
    } else {
      birds = this.sortBirds(this.birds);
    }

    const seenFilter = document.getElementById('seen-filter');
    if (seenFilter?.checked) {
      birds = birds.filter(b => this.seenBirds.includes(b.speciesCode));
    }

    if (birds.length === 0) {
      const msg = this.currentSort === 'recent'
        ? 'No recently viewed birds'
        : 'No birds found';
      list.innerHTML = `<li class="empty">${msg}</li>`;
      return;
    }

    list.innerHTML = birds.map(bird => {
      const isSeen = this.seenBirds.includes(bird.speciesCode);
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
  initBirdDetail() {
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

    this.addRecentBird(bird);
    this.renderBirdDetail(bird);
    this.bindDetailEvents(bird);
  },

  renderBirdDetail(bird) {
    document.getElementById('bird-name').textContent = bird.comName;
    document.getElementById('bird-scientific').textContent = bird.sciName || '';
    document.getElementById('bird-location').textContent = bird.locName || 'Unknown';
    document.getElementById('bird-date').textContent = bird.obsDt || 'Unknown';
    document.getElementById('bird-count').textContent = bird.howMany || 'Not recorded';

    this.updateSeenButton(bird.speciesCode);
  },

  bindDetailEvents(bird) {
    const btn = document.getElementById('toggle-seen-btn');
    btn?.addEventListener('click', () => {
      this.toggleSeen(bird.speciesCode);
    });
  },

  toggleSeen(speciesCode) {
    const index = this.seenBirds.indexOf(speciesCode);
    if (index === -1) {
      this.seenBirds.push(speciesCode);
    } else {
      this.seenBirds.splice(index, 1);
    }
    localStorage.setItem('seenBirds', JSON.stringify(this.seenBirds));
    this.updateSeenButton(speciesCode);
  },

  updateSeenButton(speciesCode) {
    const btn = document.getElementById('toggle-seen-btn');
    if (!btn) return;

    const isSeen = this.seenBirds.includes(speciesCode);
    btn.textContent = isSeen ? '✓ Seen' : 'Mark as Seen';
    btn.classList.toggle('is-seen', isSeen);
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

    btn.disabled = true;
    btn.textContent = '📍 Detecting...';
    regionInfo.textContent = 'Getting your location...';

    try {
      // Get GPS coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000
        });
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
      regionInfo.textContent = 'Could not detect location. Please select manually.';
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

    document.getElementById('modal-seen-btn')?.addEventListener('click', () => {
      this.markBirdSeen(this.selectedBird);
    });

    document.getElementById('modal-unseen-btn')?.addEventListener('click', () => {
      this.markBirdUnseen(this.selectedBird);
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

  renderGameBirds() {
    document.getElementById('game-loading').style.display = 'none';
    document.getElementById('bird-sections').style.display = 'block';

    const birds = this.currentGame.birds || [];
    const seenCodes = this.currentGame.seenBirds.map(s => s.speciesCode);

    const common = birds.filter(b => b.rarity === 'common');
    const rare = birds.filter(b => b.rarity === 'rare');
    const ultra = birds.filter(b => b.rarity === 'ultra');

    document.getElementById('common-count').textContent = `(${common.length})`;
    document.getElementById('rare-count').textContent = `(${rare.length})`;
    document.getElementById('ultra-count').textContent = `(${ultra.length})`;

    this.renderBirdSection('common-birds', common, seenCodes);
    this.renderBirdSection('rare-birds', rare, seenCodes);
    this.renderBirdSection('ultra-birds', ultra, seenCodes);

    this.restoreCollapsedSections();
    this.updateScoreSummary();
  },

  renderBirdSection(listId, birds, seenCodes) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = birds.map(bird => {
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

  openBirdModal(speciesCode) {
    const bird = this.currentGame.birds.find(b => b.speciesCode === speciesCode);
    if (!bird) return;

    this.selectedBird = bird;

    const isSeen = this.currentGame.seenBirds.some(s => s.speciesCode === speciesCode);
    const isActive = this.isGameActive();

    document.getElementById('modal-bird-name').textContent = bird.comName;
    document.getElementById('modal-bird-rarity').textContent = bird.rarity;
    document.getElementById('modal-bird-rarity').className = `modal-rarity ${bird.rarity}`;

    document.getElementById('modal-seen-btn').style.display = (!isSeen && isActive) ? 'block' : 'none';
    document.getElementById('modal-unseen-btn').style.display = (isSeen && isActive) ? 'block' : 'none';

    document.getElementById('bird-modal').style.display = 'flex';
  },

  markBirdSeen(bird) {
    if (!bird) return;

    this.currentGame.seenBirds.push({
      speciesCode: bird.speciesCode,
      comName: bird.comName,
      rarity: bird.rarity,
      seenAt: new Date().toISOString()
    });

    this.saveGame();
    document.getElementById('bird-modal').style.display = 'none';
    this.renderGameBirds();
  },

  markBirdUnseen(bird) {
    if (!bird) return;

    this.currentGame.seenBirds = this.currentGame.seenBirds.filter(
      s => s.speciesCode !== bird.speciesCode
    );

    this.saveGame();
    document.getElementById('bird-modal').style.display = 'none';
    this.renderGameBirds();
  },

  updateScoreSummary() {
    const seen = this.currentGame.seenBirds;

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

  shareScore() {
    const includeTotal = document.getElementById('share-total').checked;
    const includeRarity = document.getElementById('share-rarity').checked;
    const includeList = document.getElementById('share-list').checked;
    const timeframe = document.getElementById('share-timeframe').value;

    let seen = [...this.currentGame.seenBirds];

    // Filter by timeframe
    const now = new Date();
    if (timeframe === 'today') {
      const today = now.toISOString().split('T')[0];
      seen = seen.filter(s => s.seenAt.startsWith(today));
    } else if (timeframe === 'week') {
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      seen = seen.filter(s => new Date(s.seenAt) >= weekAgo);
    } else if (timeframe === 'custom') {
      const from = document.getElementById('share-from-date').value;
      const to = document.getElementById('share-to-date').value;
      if (from) seen = seen.filter(s => s.seenAt >= from);
      if (to) seen = seen.filter(s => s.seenAt <= to + 'T23:59:59');
    }

    // Build share text
    let text = `🐦 Birdle: ${this.currentGame.title}\n\n`;

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
        const icon = s.rarity === 'common' ? '🟢' : s.rarity === 'rare' ? '🔵' : '🟣'; // ultra
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
  }
};

// Check for shared game before normal init
document.addEventListener('DOMContentLoaded', () => {
  // If on game page, check for shared game first
  if (window.location.pathname.includes('game.html') &&
      window.location.search.includes('join=')) {
    if (App.checkForSharedGame()) {
      return; // Will redirect
    }
  }
  App.init();
});

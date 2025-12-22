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

      return `
        <li>
          <a href="game.html?id=${index}">
            <span class="game-title">${game.title}</span>
            <span class="game-info">${seenCount} birds found · ${status}</span>
          </a>
        </li>
      `;
    }).join('');
  },

  // ===== NEW GAME PAGE =====
  initNewGame() {
    this.bindNewGameEvents();
    this.initAreaMap();
  },

  bindNewGameEvents() {
    const titleInput = document.getElementById('game-title');
    const useDateBtn = document.getElementById('use-date-btn');
    const startDateInput = document.getElementById('start-date');
    const startNowBtn = document.getElementById('start-now-btn');
    const endDateInput = document.getElementById('end-date');
    const noEndBtn = document.getElementById('no-end-btn');
    const createBtn = document.getElementById('create-game-btn');

    titleInput?.addEventListener('input', () => {
      this.validateNewGame();
    });

    useDateBtn?.addEventListener('click', () => {
      const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      titleInput.value = today;
      this.validateNewGame();
    });

    startNowBtn?.addEventListener('click', () => {
      startDateInput.value = new Date().toISOString().split('T')[0];
    });

    noEndBtn?.addEventListener('click', () => {
      endDateInput.value = '';
    });

    createBtn?.addEventListener('click', () => {
      this.createGame();
    });
  },

  initAreaMap() {
    this.map = L.map('map').setView([40, -95], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Update circle on zoom
    this.map.on('zoomend', () => {
      this.updateAreaCircle();
    });

    this.map.on('moveend', () => {
      this.updateAreaCircle();
    });

    // Center on user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map.setView([latitude, longitude], 10);
          this.updateAreaCircle();
        },
        () => {
          this.updateAreaCircle();
        }
      );
    } else {
      this.updateAreaCircle();
    }

    setTimeout(() => this.map.invalidateSize(), 100);
  },

  updateAreaCircle() {
    const center = this.map.getCenter();
    const bounds = this.map.getBounds();

    // Calculate radius based on visible area (roughly 1/3 of the view)
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latDiff = Math.abs(ne.lat - sw.lat);
    const radius = (latDiff * 111) / 3; // km (111km per degree latitude)

    this.pickedLocation = { lat: center.lat, lng: center.lng };
    this.pickedRadius = radius;

    if (this.mapCircle) {
      this.mapCircle.setLatLng(center);
      this.mapCircle.setRadius(radius * 1000); // Leaflet uses meters
    } else {
      this.mapCircle = L.circle(center, {
        radius: radius * 1000,
        color: '#333',
        fillColor: '#333',
        fillOpacity: 0.1,
        weight: 2
      }).addTo(this.map);
    }

    // Update area info
    const areaInfo = document.getElementById('area-info');
    if (areaInfo) {
      areaInfo.textContent = `Area: ~${radius.toFixed(1)} km radius`;
    }

    this.validateNewGame();
  },

  validateNewGame() {
    const titleInput = document.getElementById('game-title');
    const createBtn = document.getElementById('create-game-btn');

    const hasTitle = titleInput?.value.trim().length > 0;
    const hasLocation = this.pickedLocation !== null;

    if (createBtn) {
      createBtn.disabled = !(hasTitle && hasLocation);
    }
  },

  createGame() {
    const titleInput = document.getElementById('game-title');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const title = titleInput?.value.trim();

    if (!title || !this.pickedLocation) {
      alert('Please enter a title and pick an area');
      return;
    }

    const game = {
      id: Date.now(),
      title: title,
      lat: this.pickedLocation.lat,
      lng: this.pickedLocation.lng,
      radius: this.pickedRadius,
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
    locationLink.href = `https://www.google.com/maps?q=${game.lat},${game.lng}`;
    locationLink.textContent = `📍 ${game.lat.toFixed(3)}, ${game.lng.toFixed(3)}`;

    const datesEl = document.getElementById('game-dates');
    const start = new Date(game.startDate).toLocaleDateString();
    const end = game.endDate ? new Date(game.endDate).toLocaleDateString() : 'Forever';
    datesEl.textContent = `${start} → ${end}`;
  },

  checkGameStatus() {
    const game = this.currentGame;
    const now = new Date();
    const endDate = game.endDate ? new Date(game.endDate) : null;

    if (endDate && now > endDate) {
      document.getElementById('game-ended-banner').style.display = 'block';
    }
  },

  isGameActive() {
    const game = this.currentGame;
    const now = new Date();
    const endDate = game.endDate ? new Date(game.endDate) : null;
    return !endDate || now <= endDate;
  },

  bindGameEvents() {
    // Share button
    document.getElementById('share-btn')?.addEventListener('click', () => {
      document.getElementById('share-modal').style.display = 'flex';
    });

    // Share modal
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

    // Resume game
    document.getElementById('resume-game-btn')?.addEventListener('click', () => {
      document.getElementById('resume-modal').style.display = 'flex';
    });

    document.getElementById('resume-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('resume-modal').style.display = 'none';
    });

    document.getElementById('resume-forever-btn')?.addEventListener('click', () => {
      document.getElementById('resume-end-date').value = '';
    });

    document.getElementById('do-resume-btn')?.addEventListener('click', () => {
      this.resumeGame();
    });
  },

  async loadGameBirds() {
    document.getElementById('game-loading').style.display = 'block';
    document.getElementById('bird-sections').style.display = 'none';

    const game = this.currentGame;

    // Fetch birds for the area using historic data to calculate rarity
    const birds = await this.fetchBirdsWithRarity(game.lat, game.lng, game.startDate);

    game.birds = birds;
    this.saveGame();

    this.renderGameBirds();
  },

  async fetchBirdsWithRarity(lat, lng, startDate) {
    // Get recent observations for the area
    const observations = await EBird.getNearbyObservations(lat, lng);

    // Deduplicate and count observations per species
    const speciesCount = {};
    const speciesData = {};

    observations.forEach(obs => {
      if (!speciesCount[obs.speciesCode]) {
        speciesCount[obs.speciesCode] = 0;
        speciesData[obs.speciesCode] = {
          speciesCode: obs.speciesCode,
          comName: obs.comName,
          sciName: obs.sciName
        };
      }
      speciesCount[obs.speciesCode]++;
    });

    // Calculate rarity based on observation count
    const totalObs = observations.length;
    const birds = Object.keys(speciesData).map(code => {
      const count = speciesCount[code];
      const frequency = count / totalObs;

      let rarity;
      if (frequency > 0.1) {
        rarity = 'common';
      } else if (frequency > 0.02) {
        rarity = 'rare';
      } else {
        rarity = 'superrare';
      }

      return {
        ...speciesData[code],
        frequency,
        rarity
      };
    });

    // Sort by frequency (most common first)
    birds.sort((a, b) => b.frequency - a.frequency);

    return birds;
  },

  renderGameBirds() {
    document.getElementById('game-loading').style.display = 'none';
    document.getElementById('bird-sections').style.display = 'block';

    const birds = this.currentGame.birds || [];
    const seenCodes = this.currentGame.seenBirds.map(s => s.speciesCode);

    const common = birds.filter(b => b.rarity === 'common');
    const rare = birds.filter(b => b.rarity === 'rare');
    const superrare = birds.filter(b => b.rarity === 'superrare');

    document.getElementById('common-count').textContent = `(${common.length})`;
    document.getElementById('rare-count').textContent = `(${rare.length})`;
    document.getElementById('superrare-count').textContent = `(${superrare.length})`;

    this.renderBirdSection('common-birds', common, seenCodes);
    this.renderBirdSection('rare-birds', rare, seenCodes);
    this.renderBirdSection('superrare-birds', superrare, seenCodes);

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
    const superrare = seen.filter(s => s.rarity === 'superrare').length;

    document.getElementById('total-found').textContent = total;
    document.getElementById('common-found').textContent = common;
    document.getElementById('rare-found').textContent = rare;
    document.getElementById('superrare-found').textContent = superrare;
  },

  saveGame() {
    this.games[this.currentGameIndex] = this.currentGame;
    localStorage.setItem('games', JSON.stringify(this.games));
  },

  resumeGame() {
    const endDateInput = document.getElementById('resume-end-date');
    this.currentGame.endDate = endDateInput.value || null;
    this.saveGame();

    document.getElementById('resume-modal').style.display = 'none';
    document.getElementById('game-ended-banner').style.display = 'none';
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
      const superrare = seen.filter(s => s.rarity === 'superrare').length;
      text += `🟢 Common: ${common}\n`;
      text += `🔵 Rare: ${rare}\n`;
      text += `🟣 Super Rare: ${superrare}\n`;
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
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

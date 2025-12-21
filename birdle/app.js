// Birdle - Bird Bingo App

const App = {
  birds: [],
  seenBirds: JSON.parse(localStorage.getItem('seenBirds') || '[]'),
  recentBirds: JSON.parse(localStorage.getItem('recentBirds') || '[]'),
  currentSort: 'nearest',
  userLocation: null,
  map: null,
  mapMarker: null,
  pickedLocation: null,

  init() {
    const page = this.detectPage();
    if (page === 'search') this.initSearch();
    if (page === 'bird') this.initBirdDetail();
  },

  detectPage() {
    const path = window.location.pathname;
    if (path.includes('search.html')) return 'search';
    if (path.includes('bird.html')) return 'bird';
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
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

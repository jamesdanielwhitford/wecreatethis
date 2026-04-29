const INAT_API_BASE = 'https://api.inaturalist.org/v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOW_RESULT_THRESHOLD = 10;
const FETCH_COUNT = 100;

const SoundsApp = {
  locationLabel: '',
  placeId: null,
  cacheKey: null,
  parentPlaceId: null,
  parentCacheKey: null,
  parentLabel: '',

  deck: [],
  currentIndex: 0,
  currentRecording: null,

  _pendingDeck: null,

  init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'pack') {
      this.bindRetry();
      this.bindDeckComplete();
      this.loadPackDeck();
      return;
    }
    this.bindLocationPanel();
    this.bindFallback();
    this.bindRetry();
    this.bindDeckComplete();
    this.showPhase('area-select');
  },

  // ---------------------------------------------------------------------------
  // Phase management
  // ---------------------------------------------------------------------------

  showPhase(name) {
    const phases = ['area-select', 'loading', 'flashcard', 'revealed', 'deck-complete', 'error'];
    phases.forEach(p => {
      const el = document.getElementById(`phase-${p}`);
      if (el) el.style.display = (p === name) ? 'block' : 'none';
    });
  },

  // ---------------------------------------------------------------------------
  // Location search panel
  // ---------------------------------------------------------------------------

  bindLocationPanel() {
    const searchInput = document.getElementById('place-search');
    const resultsEl = document.getElementById('place-results');
    const startBtn = document.getElementById('location-start-btn');
    let searchTimeout = null;

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = searchInput.value.trim();
      if (q.length < 2) {
        resultsEl.style.display = 'none';
        resultsEl.innerHTML = '';
        startBtn.disabled = true;
        this.placeId = null;
        return;
      }
      searchTimeout = setTimeout(() => this.searchPlaces(q), 300);
    });

    startBtn.addEventListener('click', () => {
      if (!this.placeId) return;
      this.loadDeck();
    });
  },

  async searchPlaces(q) {
    const resultsEl = document.getElementById('place-results');
    const startBtn = document.getElementById('location-start-btn');

    resultsEl.innerHTML = '<div class="place-result-item" style="color:#999;">Searching...</div>';
    resultsEl.style.display = 'block';

    try {
      const url = `${INAT_API_BASE}/places/autocomplete?q=${encodeURIComponent(q)}&per_page=8`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      const places = (data.results || []).filter(p => p.name);

      if (!places.length) {
        resultsEl.innerHTML = '<div class="place-result-item" style="color:#999;">No places found</div>';
        return;
      }

      resultsEl.innerHTML = places.map(p =>
        `<div class="place-result-item" data-id="${p.id}" data-name="${p.display_name || p.name}" data-parent="${p.ancestor_place_ids ? p.ancestor_place_ids[p.ancestor_place_ids.length - 2] || '' : ''}" data-parent-name="">${p.display_name || p.name}</div>`
      ).join('');

      resultsEl.querySelectorAll('.place-result-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
          this.placeId = parseInt(item.dataset.id);
          this.cacheKey = `inat-place-${this.placeId}`;
          this.locationLabel = item.dataset.name;

          const parentId = item.dataset.parent ? parseInt(item.dataset.parent) : null;
          this.parentPlaceId = parentId || null;
          this.parentCacheKey = parentId ? `inat-place-${parentId}` : null;
          this.parentLabel = '';

          document.getElementById('place-search').value = item.dataset.name;
          resultsEl.style.display = 'none';
          startBtn.disabled = false;
        });
      });
    } catch (e) {
      resultsEl.innerHTML = '<div class="place-result-item" style="color:#999;">Search failed, try again</div>';
    }
  },

  // ---------------------------------------------------------------------------
  // Fallback warning
  // ---------------------------------------------------------------------------

  bindFallback() {
    document.getElementById('fallback-broaden-btn').addEventListener('click', async () => {
      document.getElementById('fallback-warning').style.display = 'none';
      if (!this.parentPlaceId) {
        this.showError('No broader area available. Try a different location.');
        return;
      }
      this.placeId = this.parentPlaceId;
      this.cacheKey = this.parentCacheKey;
      this.locationLabel = this.parentLabel;
      this.parentPlaceId = null;
      this.parentCacheKey = null;
      this.parentLabel = '';
      this.loadDeck();
    });

    document.getElementById('fallback-use-btn').addEventListener('click', () => {
      document.getElementById('fallback-warning').style.display = 'none';
      if (this._pendingDeck && this._pendingDeck.length > 0) {
        this.deck = this.shuffle(this._pendingDeck);
        this._pendingDeck = null;
        this.currentIndex = 0;
        this.showCard();
      } else {
        this.showPhase('area-select');
      }
    });
  },

  showFallbackWarning(count, label, fallbackLabel, recordings) {
    this._pendingDeck = recordings;
    const msg = count === 0
      ? `No recordings found for ${label}.`
      : `Only ${count} recording${count === 1 ? '' : 's'} found for ${label}.`;
    const broadenText = fallbackLabel ? `Broaden to ${fallbackLabel}` : 'Try broader area';
    document.getElementById('fallback-message').textContent =
      `${msg}${fallbackLabel ? ` Try broadening to ${fallbackLabel}?` : ''}`;
    document.getElementById('fallback-broaden-btn').textContent = broadenText;
    document.getElementById('fallback-broaden-btn').style.display = fallbackLabel ? '' : 'none';
    document.getElementById('fallback-use-btn').textContent =
      count > 0 ? `Use these ${count}` : 'Go back';
    document.getElementById('fallback-warning').style.display = 'block';
  },

  // ---------------------------------------------------------------------------
  // Deck loading
  // ---------------------------------------------------------------------------

  async loadDeck() {
    this.showPhase('loading');
    document.getElementById('loading-message').textContent =
      `Loading recordings for ${this.locationLabel}…`;

    try {
      const recordings = await this.fetchRecordings(this.cacheKey, this.placeId);

      if (recordings.length < LOW_RESULT_THRESHOLD && this.parentPlaceId) {
        this.showPhase('area-select');
        const parentLabel = await this.getParentPlaceName(this.parentPlaceId);
        this.parentLabel = parentLabel;
        this.showFallbackWarning(recordings.length, this.locationLabel, parentLabel, recordings);
        return;
      }

      if (recordings.length === 0) {
        this.showError('No recordings found for this region. Try a different location.');
        return;
      }

      this.deck = this.shuffle(recordings);
      this.currentIndex = 0;
      this.showCard();
    } catch (err) {
      console.error('[Sounds] loadDeck error:', err);
      this.showError('Could not load recordings. Check your connection and try again.');
    }
  },

  async getParentPlaceName(placeId) {
    try {
      const res = await fetch(`${INAT_API_BASE}/places/${placeId}`);
      if (!res.ok) return 'broader area';
      const data = await res.json();
      return data.results?.[0]?.display_name || data.results?.[0]?.name || 'broader area';
    } catch (e) {
      return 'broader area';
    }
  },

  async fetchRecordings(cacheKey, placeId) {
    const cached = await BirdDB.getSoundsCache(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      console.log('[Sounds] Using cached recordings for:', cacheKey);
      return cached.recordings;
    }

    // Get total count first, then pick a random page
    const countUrl = `${INAT_API_BASE}/observations?taxon_id=3&sounds=true&quality_grade=research&place_id=${placeId}&per_page=1`;
    const countRes = await fetch(countUrl);
    if (!countRes.ok) throw new Error(`API error ${countRes.status}`);
    const countData = await countRes.json();
    const total = countData.total_results || 0;

    if (total === 0) return [];

    // iNaturalist caps offset at 10,000 results (page * per_page <= 10000)
    const maxPage = Math.min(Math.floor(total / FETCH_COUNT), Math.floor(10000 / FETCH_COUNT) - 1) || 1;
    const page = Math.floor(Math.random() * maxPage) + 1;

    const url = `${INAT_API_BASE}/observations?taxon_id=3&sounds=true&quality_grade=research&place_id=${placeId}&per_page=${FETCH_COUNT}&page=${page}&order_by=created_at&order=desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();

    const normalized = [];
    for (const obs of (data.results || [])) {
      const taxon = obs.taxon || {};
      const sounds = obs.sounds || [];
      for (const sound of sounds) {
        if (!sound.file_url) continue;
        normalized.push({
          id: `${obs.id}-${sound.id}`,
          en: taxon.preferred_common_name || taxon.name || '',
          gen: taxon.name ? taxon.name.split(' ')[0] : '',
          sp: taxon.name ? taxon.name.split(' ').slice(1).join(' ') : '',
          rec: obs.user?.login || 'Unknown',
          lic: sound.license_code || '',
          url: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
          audioUrl: sound.file_url
        });
      }
    }

    await BirdDB.setSoundsCache(cacheKey, normalized);
    return normalized;
  },

  // ---------------------------------------------------------------------------
  // Pack mode (custom species set)
  // ---------------------------------------------------------------------------

  async loadPackDeck() {
    const raw = localStorage.getItem('sounds-pack');
    if (!raw) {
      this.showError('No sound set found. Go back and build one.');
      document.getElementById('error-change-area-btn').textContent = 'Build a Set';
      document.getElementById('error-change-area-btn').onclick = () => {
        window.location.href = 'pack';
      };
      return;
    }

    let species;
    try {
      species = JSON.parse(raw);
    } catch (e) {
      this.showError('Could not read sound set. Please rebuild it.');
      return;
    }

    this.locationLabel = `${species.length} bird set`;
    this.showPhase('loading');
    document.getElementById('loading-message').textContent =
      `Loading sounds for ${species.length} bird${species.length === 1 ? '' : 's'}…`;

    try {
      const recordings = await this.fetchPackRecordings(species);
      if (recordings.length === 0) {
        this.showError('No recordings found for your selected birds. Try a different set.');
        return;
      }
      this.deck = this.shuffle(recordings);
      this.currentIndex = 0;

      // Override "Change Region" to go back to pack builder
      document.getElementById('change-area-btn').textContent = 'Change Set';
      document.getElementById('change-area-btn').onclick = () => {
        window.location.href = 'pack';
      };

      this.showCard();
    } catch (err) {
      console.error('[Sounds] loadPackDeck error:', err);
      this.showError('Could not load recordings. Check your connection and try again.');
    }
  },

  async fetchPackRecordings(species) {
    const SOUNDS_PER_SPECIES = 5;
    const all = [];

    for (const bird of species) {
      const cacheKey = `inat-species-${bird.speciesCode}`;
      const cached = await BirdDB.getSoundsCache(cacheKey);
      if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
        all.push(...cached.recordings);
        continue;
      }

      try {
        const name = encodeURIComponent(bird.sciName || bird.comName);
        const url = `${INAT_API_BASE}/observations?taxon_name=${name}&sounds=true&quality_grade=research&per_page=${SOUNDS_PER_SPECIES}&order_by=votes&order=desc`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        const normalized = [];
        for (const obs of (data.results || [])) {
          const taxon = obs.taxon || {};
          for (const sound of (obs.sounds || [])) {
            if (!sound.file_url) continue;
            normalized.push({
              id: `${obs.id}-${sound.id}`,
              en: taxon.preferred_common_name || bird.comName || taxon.name || '',
              gen: (taxon.name || bird.sciName || '').split(' ')[0] || '',
              sp: (taxon.name || bird.sciName || '').split(' ').slice(1).join(' ') || '',
              rec: obs.user?.login || 'Unknown',
              lic: sound.license_code || '',
              url: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
              audioUrl: sound.file_url
            });
          }
        }

        await BirdDB.setSoundsCache(cacheKey, normalized);
        all.push(...normalized);
      } catch (e) {
        console.warn('[Sounds] Failed to fetch for:', bird.comName, e);
      }
    }

    return all;
  },

  // ---------------------------------------------------------------------------
  // Flashcard
  // ---------------------------------------------------------------------------

  showCard() {
    if (this.currentIndex >= this.deck.length) {
      this.showPhase('deck-complete');
      return;
    }

    this.currentRecording = this.deck[this.currentIndex];
    document.getElementById('card-counter').textContent =
      `Card ${this.currentIndex + 1} of ${this.deck.length}`;

    const audio = document.getElementById('bird-audio');
    audio.src = this.currentRecording.audioUrl;
    audio.load();

    const playBtn = document.getElementById('play-btn');
    playBtn.textContent = '▶ Play Sound';
    playBtn.onclick = () => this.toggleAudio();

    document.getElementById('reveal-btn').onclick = () => this.revealCard();
    document.getElementById('reveal-image-container').style.display = 'none';

    this.showPhase('flashcard');
  },

  toggleAudio() {
    const audio = document.getElementById('bird-audio');
    const playBtn = document.getElementById('play-btn');

    if (audio.paused) {
      audio.play().catch(err => console.warn('[Sounds] Audio play failed:', err));
      playBtn.textContent = '⏹ Stop';
      audio.onended = () => { playBtn.textContent = '▶ Play Again'; };
    } else {
      audio.pause();
      audio.currentTime = 0;
      playBtn.textContent = '▶ Play Sound';
    }
  },

  async revealCard() {
    const rec = this.currentRecording;

    document.getElementById('reveal-card-counter').textContent =
      `Card ${this.currentIndex + 1} of ${this.deck.length}`;
    document.getElementById('reveal-name').textContent = rec.en || `${rec.gen} ${rec.sp}`;
    document.getElementById('reveal-sciname').textContent = `${rec.gen} ${rec.sp}`;
    document.getElementById('attr-recordist').textContent = rec.rec || 'Unknown';

    const licenseEl = document.getElementById('attr-license');
    licenseEl.textContent = this.formatLicense(rec.lic);
    licenseEl.href = rec.lic ? `https://creativecommons.org/licenses/${rec.lic}/` : '#';

    document.getElementById('attr-xclink').href = rec.url || 'https://www.inaturalist.org';
    document.getElementById('attr-xclink').textContent = 'iNaturalist';

    document.getElementById('replay-btn').onclick = () => {
      const audio = document.getElementById('bird-audio');
      audio.currentTime = 0;
      audio.play().catch(err => console.warn('[Sounds] Replay failed:', err));
    };

    document.getElementById('next-btn').onclick = () => {
      this.currentIndex++;
      this.showCard();
    };

    this.showPhase('revealed');

    if (rec.en) this.loadRevealImage(rec.en, rec.gen, rec.sp);
  },

  async loadRevealImage(comName, gen, sp) {
    try {
      let imageUrl = await App.fetchWikipediaImage(comName);
      if (!imageUrl && gen && sp) imageUrl = await App.fetchWikipediaImage(`${gen} ${sp}`);
      if (imageUrl) {
        const img = document.getElementById('reveal-image');
        const container = document.getElementById('reveal-image-container');
        img.src = imageUrl;
        img.alt = comName;
        img.onload = () => { container.style.display = 'block'; };
        img.onerror = () => { container.style.display = 'none'; };
      }
    } catch (e) {
      console.warn('[Sounds] Wikipedia image failed:', e);
    }
  },

  // ---------------------------------------------------------------------------
  // Deck complete + retry + error
  // ---------------------------------------------------------------------------

  bindDeckComplete() {
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.deck = this.shuffle(this.deck);
      this.currentIndex = 0;
      this.showCard();
    });
    document.getElementById('change-area-btn').addEventListener('click', () => {
      this.showPhase('area-select');
    });
  },

  bindRetry() {
    document.getElementById('retry-btn').addEventListener('click', () => {
      if (this.placeId) {
        this.loadDeck();
      } else {
        this.showPhase('area-select');
      }
    });
    document.getElementById('error-change-area-btn').addEventListener('click', () => {
      this.showPhase('area-select');
    });
  },

  showError(msg) {
    document.getElementById('error-message').textContent = msg;
    this.showPhase('error');
  },

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  formatLicense(code) {
    if (!code) return '';
    return 'CC ' + code.toUpperCase().replace(/-/g, ' ');
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};

window.SoundsApp = SoundsApp;

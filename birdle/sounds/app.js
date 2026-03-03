const XC_API_BASE = 'https://xeno-canto.org/api/3/recordings';
const XC_API_KEY = '70dcd0d2a5397685bd48fbaa28d8a0b981694d4b';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOW_RESULT_THRESHOLD = 10;

const CONTINENTS = [
  { id: 'africa',    label: 'Africa' },
  { id: 'america',   label: 'Americas' },
  { id: 'asia',      label: 'Asia' },
  { id: 'australia', label: 'Australia' },
  { id: 'europe',    label: 'Europe' },
];

const SoundsApp = {
  locationLabel: '',
  locationQuery: null,
  locationCacheKey: null,
  fallbackQuery: null,
  fallbackCacheKey: null,
  fallbackLabel: '',

  deck: [],
  currentIndex: 0,
  currentRecording: null,

  init() {
    this.bindLocationPanel();
    this.bindFallback();
    this.bindRetry();
    this.bindDeckComplete();
    this.loadCountries();
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
  // Country/State location panel
  // ---------------------------------------------------------------------------

  async loadCountries() {
    const countrySelect = document.getElementById('country-select');
    const startBtn = document.getElementById('location-start-btn');

    try {
      const countries = await EBird.getCountries();
      if (countries && countries.length) {
        countrySelect.innerHTML = '<option value="">Select Country\u2026</option>' +
          countries.map(c => `<option value="${c.code}" data-name="${c.name}">${c.name}</option>`).join('');
      } else {
        countrySelect.innerHTML = '<option value="">Could not load countries</option>';
      }
    } catch (e) {
      countrySelect.innerHTML = '<option value="">Could not load countries</option>';
    }
  },

  async loadStates(countryCode) {
    const stateSelect = document.getElementById('state-select');
    stateSelect.innerHTML = '<option value="">Loading\u2026</option>';
    stateSelect.disabled = true;

    try {
      const states = await EBird.getStates(countryCode);
      if (states && states.length) {
        stateSelect.innerHTML = '<option value="">Entire Country</option>' +
          states.map(s => `<option value="${s.code}" data-name="${s.name}">${s.name}</option>`).join('');
        stateSelect.disabled = false;
      } else {
        stateSelect.innerHTML = '<option value="">No states available</option>';
      }
    } catch (e) {
      stateSelect.innerHTML = '<option value="">Could not load states</option>';
    }
  },

  bindLocationPanel() {
    const countrySelect = document.getElementById('country-select');
    const stateSelect = document.getElementById('state-select');
    const startBtn = document.getElementById('location-start-btn');

    countrySelect.addEventListener('change', async () => {
      const code = countrySelect.value;
      startBtn.disabled = !code;
      if (code) {
        await this.loadStates(code);
      } else {
        stateSelect.innerHTML = '<option value="">Select State / Province (optional)</option>';
        stateSelect.disabled = true;
      }
    });

    startBtn.addEventListener('click', () => {
      const countryCode = countrySelect.value;
      if (!countryCode) return;

      const countryOption = countrySelect.options[countrySelect.selectedIndex];
      const countryName = countryOption.dataset.name || countryOption.text;

      const stateCode = stateSelect.value;
      const stateOption = stateCode ? stateSelect.options[stateSelect.selectedIndex] : null;
      const stateName = stateOption ? (stateOption.dataset.name || stateOption.text) : null;

      if (stateCode && stateName) {
        this.locationQuery = `cnt:"${countryName}" loc:"${stateName}"`;
        this.locationCacheKey = stateCode;
        this.locationLabel = `${stateName}, ${countryName}`;
        this.fallbackQuery = `cnt:"${countryName}"`;
        this.fallbackCacheKey = countryCode;
        this.fallbackLabel = countryName;
      } else {
        this.locationQuery = `cnt:"${countryName}"`;
        this.locationCacheKey = countryCode;
        this.locationLabel = countryName;
        const cont = this.continentFromCountryCode(countryCode);
        this.fallbackQuery = `area:${cont.id}`;
        this.fallbackCacheKey = cont.id;
        this.fallbackLabel = cont.label;
      }

      this.loadDeck();
    });
  },

  continentFromCountryCode(code) {
    const africaCodes = new Set(['ZA','NG','KE','ET','GH','TZ','UG','ZW','MZ','ZM','BW','NA','AO','CM','CI','SN','TN','MA','EG','DZ','LY','SD','SO','RW','BI','MW','LS','SZ','GM','GN','SL','LR','TG','BJ','NE','BF','ML','TD','CF','CD','CG','GA','GQ','ST','CV','MR','DJ','ER','KM','SC','MG','MU','RE','YT']);
    const europeCodes = new Set(['GB','FR','DE','IT','ES','PT','NL','BE','CH','AT','PL','CZ','SK','HU','RO','BG','HR','SI','RS','BA','ME','MK','AL','GR','CY','MT','IE','IS','NO','SE','FI','DK','EE','LV','LT','BY','UA','MD','RU','LU','LI','MC','SM','VA','AD']);
    const asiaCodes = new Set(['CN','JP','IN','ID','PK','BD','PH','VN','TH','MM','KR','KP','TW','HK','MO','MN','KZ','UZ','TM','TJ','KG','AF','IR','IQ','SY','LB','JO','IL','PS','SA','AE','OM','YE','KW','BH','QA','TR','AZ','GE','AM','NP','BT','LK','MV','SG','MY','BN','TL']);
    const australiaCodes = new Set(['AU','NZ','PG','FJ','SB','VU','WS','TO','KI','TV','NR','PW','FM','MH','CK','NU','TK','AS','GU','MP','PF','NC','WF']);
    if (africaCodes.has(code)) return CONTINENTS.find(c => c.id === 'africa');
    if (europeCodes.has(code)) return CONTINENTS.find(c => c.id === 'europe');
    if (asiaCodes.has(code)) return CONTINENTS.find(c => c.id === 'asia');
    if (australiaCodes.has(code)) return CONTINENTS.find(c => c.id === 'australia');
    return CONTINENTS.find(c => c.id === 'america');
  },

  // ---------------------------------------------------------------------------
  // Fallback warning
  // ---------------------------------------------------------------------------

  bindFallback() {
    document.getElementById('fallback-broaden-btn').addEventListener('click', () => {
      document.getElementById('fallback-warning').style.display = 'none';
      this.locationQuery = this.fallbackQuery;
      this.locationCacheKey = this.fallbackCacheKey;
      this.locationLabel = this.fallbackLabel;
      this.fallbackQuery = null;
      this.fallbackCacheKey = null;
      this.fallbackLabel = '';
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
    document.getElementById('fallback-message').textContent =
      `${msg} Try broadening to ${fallbackLabel}?`;
    document.getElementById('fallback-broaden-btn').textContent = `Broaden to ${fallbackLabel}`;
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
      `Loading recordings for ${this.locationLabel}\u2026`;

    try {
      const recordings = await this.fetchRecordings(this.locationCacheKey, this.locationQuery);

      if (recordings.length < LOW_RESULT_THRESHOLD && this.fallbackQuery) {
        this.showPhase('area-select');
        this.showFallbackWarning(recordings.length, this.locationLabel, this.fallbackLabel, recordings);
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

  async fetchRecordings(cacheKey, xcQuery) {
    const cached = await BirdDB.getSoundsCache(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      console.log('[Sounds] Using cached recordings for:', cacheKey);
      return cached.recordings;
    }

    const query = `type:song q:">C" ${xcQuery}`;
    const url = `${XC_API_BASE}?query=${encodeURIComponent(query)}&per_page=100&key=${XC_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();

    if (!data.recordings || data.recordings.length === 0) return [];

    const normalized = data.recordings.map(r => ({
      id: r.id,
      en: r.en,
      gen: r.gen,
      sp: r.sp,
      rec: r.rec,
      lic: r.lic ? (r.lic.startsWith('//') ? 'https:' + r.lic : r.lic) : '',
      url: r.url ? (r.url.startsWith('//') ? 'https:' + r.url : r.url) : '',
      audioUrl: r.file ? (r.file.startsWith('//') ? 'https:' + r.file : r.file) : ''
    })).filter(r => r.audioUrl);

    await BirdDB.setSoundsCache(cacheKey, normalized);
    return normalized;
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
    playBtn.textContent = '\u25B6 Play Sound';
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
      playBtn.textContent = '\u23F9 Stop';
      audio.onended = () => { playBtn.textContent = '\u25B6 Play Again'; };
    } else {
      audio.pause();
      audio.currentTime = 0;
      playBtn.textContent = '\u25B6 Play Sound';
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
    licenseEl.textContent = this.parseLicenseCode(rec.lic);
    licenseEl.href = rec.lic || '#';

    document.getElementById('attr-xclink').href = rec.url || 'https://xeno-canto.org';

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
      if (this.locationQuery) {
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

  parseLicenseCode(licUrl) {
    if (!licUrl) return '';
    const match = licUrl.match(/\/licenses\/([^/]+)\/([^/]+)/);
    if (!match) return '';
    return `CC ${match[1].toUpperCase()} ${match[2]}`;
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

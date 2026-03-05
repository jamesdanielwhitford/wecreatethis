// app.js — Tonight page orchestration

// ── SVG Icons ─────────────────────────────────────────────────────────────

const Icons = {
  sun: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,

  moon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`,

  // Renders a moon phase SVG based on fraction (0=new, 1=full) and phase (0-1 from SunCalc)
  moonPhase(fraction, phase, size = 48) {
    const r = size / 2 - 2;
    const cx = size / 2;
    const cy = size / 2;

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a1a" stroke="var(--border)" stroke-width="1"/>`;

    if (fraction < 0.02) {
      // New moon — dark only
    } else if (fraction > 0.98) {
      // Full moon
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.85"/>`;
    } else {
      // The terminator ellipse x-radius: 0=full, r=new
      // fraction=1 → rx=0 (no dark terminator), fraction=0 → rx=r (all dark)
      const rx = r * Math.abs(1 - 2 * fraction);

      // Waxing (phase 0→0.5): right side lit. Waning (phase 0.5→1): left side lit.
      const waxing = phase < 0.5;

      // Strategy: draw lit semicircle + terminator ellipse to form crescent or gibbous
      // For waxing gibbous (fraction > 0.5): lit right half + ellipse curves left (adds to lit area)
      // For waxing crescent (fraction < 0.5): lit right half − ellipse (subtracts from lit area)

      if (waxing) {
        if (fraction >= 0.5) {
          // Waxing gibbous: right half lit + left ellipse cap also lit
          // Path: top→bottom along right semicircle, then bottom→top along terminator ellipse (curving left)
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z"
            fill="var(--accent)" opacity="0.85"/>`;
        } else {
          // Waxing crescent: right half lit, terminator cuts into it from left
          // Path: top→bottom right semicircle, then back up along terminator (curves right, subtracting)
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z"
            fill="var(--accent)" opacity="0.85"/>`;
        }
      } else {
        if (fraction >= 0.5) {
          // Waning gibbous: left half lit + right ellipse cap also lit
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z"
            fill="var(--accent)" opacity="0.85"/>`;
        } else {
          // Waning crescent: left half lit, terminator cuts into it from right
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z"
            fill="var(--accent)" opacity="0.85"/>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  },

  // Filled dot visibility indicators (replaces ⭐)
  visibilityDots(count, max = 3) {
    let html = '<span class="vis-dots">';
    for (let i = 0; i < max; i++) {
      html += `<span class="vis-dot${i < count ? ' filled' : ''}"></span>`;
    }
    return html + '</span>';
  },

  cloudSun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="13" cy="6" r="3"/><path d="M8 15a4 4 0 0 1 0-8h1"/><path d="M18 15H8a4 4 0 0 0 0 8h10a4 4 0 0 0 0-8z"/>
  </svg>`,

  cloudPartly: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>`,

  cloudFull: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>`,

  clearSky: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,
};

// AstronomyAPI credentials (astronomyapi.com free tier)
const ASTRONOMY_APP_ID     = '3538ece1-51e1-46ce-982a-d5f289a01693';
const ASTRONOMY_APP_SECRET = 'd8fa9bb289235718f328b1134406eccb3a3478bac29a7debf6b2f758cfb73a0b527065c233cf26ae8d45ede614e8e846a522fdc0e304282051a8c6393ba884be3b3d3998443e0bae0620cb879628814448868e02746800a92671ad2cbf3065c0446d7d05c845cd00c48427c0f6b199cd';

function hasRealAstronomyKey() {
  return ASTRONOMY_APP_ID.length > 10 && ASTRONOMY_APP_SECRET.length > 10;
}

const App = {
  lat: null,
  lng: null,
  locationName: null,
  targetDate: null,   // null = today; set from ?date= param
  weatherData: null,
  usingStaleWeather: false,

  async init() {
    // Parse ?date= URL param
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T12:00:00');
      if (!isNaN(parsed)) this.targetDate = parsed;
    }

    // Show back link if viewing a future date from week page
    if (this.targetDate) {
      const backLink = document.getElementById('backLink');
      if (backLink) {
        backLink.classList.remove('hidden');
        const dateHeader = document.getElementById('dateHeader');
        if (dateHeader) {
          dateHeader.textContent = this.targetDate.toLocaleDateString([], {
            weekday: 'long', month: 'long', day: 'numeric',
          });
          dateHeader.classList.remove('hidden');
        }
      }
    }

    // Load cached location immediately for fast first render
    const saved = this._loadSavedLocation();
    if (saved) {
      this.lat = saved.lat;
      this.lng = saved.lng;
      this.locationName = saved.name;
      this._updateLocationDisplay();
      await this.loadData();
    }

    // Request fresh geolocation (non-blocking if we already have cached data)
    this._requestGeolocation();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/starrynight/sw.js', { scope: '/starrynight/' }).catch(() => {});
    }
  },

  _loadSavedLocation() {
    try {
      const raw = localStorage.getItem('starrynight-location');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  },

  _saveLocation(lat, lng, name) {
    try {
      localStorage.setItem('starrynight-location', JSON.stringify({ lat, lng, name, timestamp: Date.now() }));
    } catch {}
  },

  _updateLocationDisplay() {
    const el = document.getElementById('locationName');
    if (el) el.textContent = this.locationName || `${this.lat.toFixed(2)}°, ${this.lng.toFixed(2)}°`;
  },

  _requestGeolocation() {
    if (!('geolocation' in navigator)) {
      if (!this.lat) this.showLocationInput();
      return;
    }

    // If we already have a cached location, only refresh GPS after 24 hours
    const saved = this._loadSavedLocation();
    const locationAge = saved?.timestamp ? Date.now() - saved.timestamp : Infinity;
    const REFRESH_AFTER = 24 * 60 * 60 * 1000; // 24 hours

    if (saved && locationAge < REFRESH_AFTER) {
      // Already have a recent location — no need to prompt again
      return;
    }

    // No saved location or it's stale — request fresh GPS
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const locationChanged = !this.lat
          || Math.abs(this.lat - newLat) > 0.1
          || Math.abs(this.lng - newLng) > 0.1;

        this.lat = newLat;
        this.lng = newLng;

        // Reverse geocode in background
        const name = await this._reverseGeocode(newLat, newLng);
        this.locationName = name;
        this._saveLocation(newLat, newLng, name);
        this._updateLocationDisplay();

        if (locationChanged) await this.loadData();
      },
      () => {
        if (!this.lat) this.showLocationInput();
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  },

  async _reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};
      return addr.city || addr.town || addr.village || addr.county || data.display_name?.split(',')[0] || null;
    } catch { return null; }
  },

  async loadData() {
    if (!this.lat || !this.lng) return;

    const date = this.targetDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    // Fetch weather
    try {
      this.weatherData = await Weather.fetch(this.lat, this.lng);
      this.usingStaleWeather = false;
    } catch {
      this.weatherData = Weather.getCachedData();
      this.usingStaleWeather = !!this.weatherData;
    }

    const dayData = Weather.getDayData(this.weatherData, dateStr);

    // Astronomical calculations
    const sunTimes  = Astronomy.getSunTimes(date, this.lat, this.lng);
    const moonData  = Astronomy.getMoonData(date, this.lat, this.lng);
    let planets     = Astronomy.getPlanetData(date, this.lat, this.lng);

    // Try AstronomyAPI for enhanced planet data
    let enhanced = false;
    if (hasRealAstronomyKey() && navigator.onLine) {
      const apiRows = await this._tryAstronomyAPI(date, this.lat, this.lng);
      if (apiRows) {
        planets = Astronomy.getPlanetDataEnhanced(planets, apiRows);
        enhanced = true;
      }
    }

    // Score
    const cloudCover = dayData ? dayData.eveningCloudCover : 50;
    const precipProb = dayData ? dayData.eveningPrecipProb : 0;
    const score = Astronomy.calcScore(cloudCover, precipProb, moonData.fraction);

    // Render
    this.renderScore(score);
    this.renderConditionsCard(cloudCover, precipProb, enhanced);
    this.renderSunMoonCard(sunTimes, moonData, dayData);
    this.renderPlanetsSection(planets);
    if (this.usingStaleWeather) this.showStaleBanner();
  },

  async _tryAstronomyAPI(date, lat, lng) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://api.astronomyapi.com/api/v2/bodies/positions`
      + `?latitude=${lat}&longitude=${lng}&elevation=0`
      + `&from_date=${dateStr}&to_date=${dateStr}&time=21:00:00`;
    const credentials = btoa(`${ASTRONOMY_APP_ID}:${ASTRONOMY_APP_SECRET}`);
    try {
      const res = await fetch(url, { headers: { Authorization: `Basic ${credentials}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.table?.rows || null;
    } catch { return null; }
  },

  renderScore(score) {
    const el = document.getElementById('scoreValue');
    const labelEl = document.getElementById('scoreLabel');
    const subtitleEl = document.getElementById('scoreSubtitle');
    if (el) {
      el.textContent = score.toFixed(1);
      el.style.color = Astronomy.getScoreColor(score);
    }
    if (labelEl) labelEl.textContent = 'Skywatching Score';
    if (subtitleEl) {
      subtitleEl.textContent = Astronomy.getScoreLabel(score);
      subtitleEl.style.color = Astronomy.getScoreColor(score);
    }
  },

  renderConditionsCard(cloudCover, precipProb, enhanced) {
    const card = document.getElementById('conditionsCard');
    if (!card) return;

    const badgeClass = enhanced ? 'enhanced' : 'offline';
    const badgeText  = enhanced ? 'Enhanced' : (navigator.onLine ? 'Live' : 'Offline Mode');

    card.innerHTML = `
      <div class="card-title">Tonight's Conditions</div>
      <div class="conditions-grid">
        <div class="condition-item">
          <div class="condition-label">Cloud Cover</div>
          <div class="condition-value">${cloudCover}<span class="condition-unit">%</span></div>
        </div>
        <div class="condition-item">
          <div class="condition-label">Rain Chance</div>
          <div class="condition-value">${precipProb}<span class="condition-unit">%</span></div>
        </div>
      </div>
      <div style="margin-top:12px;text-align:right">
        <span class="mode-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  },

  renderSunMoonCard(sunTimes, moonData, dayData) {
    const card = document.getElementById('sunMoonCard');
    if (!card) return;

    // Prefer weather API sunrise/sunset if available
    const sunriseStr = dayData?.sunrise
      ? Astronomy.formatTime(new Date(dayData.sunrise))
      : Astronomy.formatTime(sunTimes.sunrise);
    const sunsetStr = dayData?.sunset
      ? Astronomy.formatTime(new Date(dayData.sunset))
      : Astronomy.formatTime(sunTimes.sunset);

    const moonriseStr = Astronomy.formatTime(moonData.moonrise);
    const moonsetStr  = Astronomy.formatTime(moonData.moonset);

    card.innerHTML = `
      <div class="card-title">Sun &amp; Moon</div>
      <div class="sun-moon-grid">
        <div class="sun-moon-item">
          <div class="sun-moon-label">${Icons.sun} Sunrise</div>
          <div class="sun-moon-value">${sunriseStr}</div>
        </div>
        <div class="sun-moon-item">
          <div class="sun-moon-label">${Icons.sun} Sunset</div>
          <div class="sun-moon-value">${sunsetStr}</div>
        </div>
        <div class="sun-moon-item">
          <div class="sun-moon-label">${Icons.moon} Moonrise</div>
          <div class="sun-moon-value">${moonriseStr}</div>
        </div>
        <div class="sun-moon-item">
          <div class="sun-moon-label">${Icons.moon} Moonset</div>
          <div class="sun-moon-value">${moonsetStr}</div>
        </div>
      </div>
      <div class="moon-phase-display">
        <div class="moon-phase-svg">${Icons.moonPhase(moonData.fraction, moonData.phase, 48)}</div>
        <div class="moon-details">
          <div class="moon-phase-name">${moonData.phaseName}</div>
          <div class="moon-illumination">${Math.round(moonData.fraction * 100)}% illuminated</div>
        </div>
      </div>
    `;
  },

  renderPlanetsSection(planets) {
    const list = document.getElementById('planetsList');
    if (!list) return;

    if (!planets.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No planet data available.</p>';
      return;
    }

    const items = planets.map(p => {
      const riseStr = Astronomy.formatTime(p.rise);
      const setStr  = Astronomy.formatTime(p.set);
      const starsHtml = p.stars > 0
        ? Icons.visibilityDots(p.stars)
        : '<span style="color:var(--text-muted);font-size:12px">Not visible tonight</span>';
      const timesHtml = p.rise && p.set
        ? `Rise ${riseStr} · Set ${setStr}`
        : p.daytimeOnly
          ? 'Daytime only'
          : 'Below horizon all night';
      const noteHtml = p.note
        ? `<div class="planet-note">${p.note}</div>`
        : '';
      // Only show peak altitude for planets visible in the evening
      const altHtml = `<div class="planet-altitude">${p.visibleTonight && p.eveningPeakAlt > 0 ? `Peak ${p.eveningPeakAlt}°` : ''}</div>`;

      return `
        <div class="planet-item">
          <div class="planet-symbol">${p.symbol}</div>
          <div class="planet-info">
            <div class="planet-name">${p.name}</div>
            <div class="planet-times">${timesHtml}</div>
            ${noteHtml}
          </div>
          <div class="planet-right">
            <div class="planet-stars">${starsHtml}</div>
            ${altHtml}
          </div>
        </div>
      `;
    });

    list.innerHTML = items.join('');
  },

  showLocationInput() {
    const section = document.getElementById('locationSection');
    if (section) section.classList.remove('hidden');
  },

  showStaleBanner() {
    const banner = document.getElementById('staleBanner');
    if (banner) banner.classList.remove('hidden');
  },

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  },

  async searchCity(query) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (!results.length) { this.showToast('Location not found'); return; }
      const r = results[0];
      this.lat = parseFloat(r.lat);
      this.lng = parseFloat(r.lon);
      this.locationName = r.display_name.split(',')[0];
      this._saveLocation(this.lat, this.lng, this.locationName);
      this._updateLocationDisplay();
      document.getElementById('locationSection')?.classList.add('hidden');
      await this.loadData();
    } catch {
      this.showToast('Could not search — check your connection');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  // Location search form
  const form = document.getElementById('locationForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('cityInput');
      if (input && input.value.trim()) App.searchCity(input.value.trim());
    });
  }
  App.init();
});

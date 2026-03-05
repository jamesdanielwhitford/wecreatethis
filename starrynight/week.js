// week.js — 7-day overview page orchestration

// ── SVG Icons (shared subset from app.js) ────────────────────────────────

const Icons = {
  moonPhase(fraction, phase, size = 24) {
    const r = size / 2 - 1;
    const cx = size / 2;
    const cy = size / 2;

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a1a" stroke="var(--border)" stroke-width="1"/>`;

    if (fraction < 0.02) {
      // new moon
    } else if (fraction > 0.98) {
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent)" opacity="0.85"/>`;
    } else {
      const rx = r * Math.abs(1 - 2 * fraction);
      const waxing = phase < 0.5;
      if (waxing) {
        if (fraction >= 0.5) {
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z" fill="var(--accent)" opacity="0.85"/>`;
        } else {
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z" fill="var(--accent)" opacity="0.85"/>`;
        }
      } else {
        if (fraction >= 0.5) {
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z" fill="var(--accent)" opacity="0.85"/>`;
        } else {
          svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z" fill="var(--accent)" opacity="0.85"/>`;
        }
      }
    }

    return svg + `</svg>`;
  },

  cloudIcon(pct) {
    if (pct < 20) return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${pct >= 80 ? 2.5 : 2}" stroke-linecap="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" opacity="${pct >= 80 ? 1 : 0.7}"/>
    </svg>`;
  },
};

const WeekApp = {
  lat: null,
  lng: null,
  locationName: null,
  weatherData: null,

  async init() {
    // Load cached location immediately
    const saved = this._loadSavedLocation();
    if (saved) {
      this.lat = saved.lat;
      this.lng = saved.lng;
      this.locationName = saved.name;
      this._updateLocationDisplay();
      await this.loadData();
    }

    // Request fresh geolocation
    this._requestGeolocation();

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
      if (!this.lat) this._showLocationInput();
      return;
    }

    // Skip GPS prompt if we have a location saved within the last 24 hours
    const saved = this._loadSavedLocation();
    const locationAge = saved?.timestamp ? Date.now() - saved.timestamp : Infinity;
    if (saved && locationAge < 24 * 60 * 60 * 1000) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const changed = !this.lat
          || Math.abs(this.lat - newLat) > 0.1
          || Math.abs(this.lng - newLng) > 0.1;

        this.lat = newLat;
        this.lng = newLng;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            this.locationName = addr.city || addr.town || addr.village || addr.county || null;
          }
        } catch {}

        this._saveLocation(this.lat, this.lng, this.locationName);
        this._updateLocationDisplay();
        if (changed) await this.loadData();
      },
      () => { if (!this.lat) this._showLocationInput(); },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  },

  _showLocationInput() {
    document.getElementById('locationSection')?.classList.remove('hidden');
  },

  async loadData() {
    if (!this.lat || !this.lng) return;

    try {
      this.weatherData = await Weather.fetch(this.lat, this.lng);
    } catch {
      this.weatherData = Weather.getCachedData();
    }

    if (!this.weatherData) {
      document.getElementById('weekGrid').innerHTML =
        '<p style="color:var(--text-muted);padding:16px;font-size:14px">Could not load forecast. Please check your connection.</p>';
      return;
    }

    this.renderWeekGrid();
  },

  renderWeekGrid() {
    const grid = document.getElementById('weekGrid');
    if (!grid || !this.weatherData) return;

    const today = new Date().toISOString().split('T')[0];
    const rows = this.weatherData.days.map(day => {
      const date = new Date(day.date + 'T12:00:00');
      const moonData = Astronomy.getMoonData(date, this.lat, this.lng);
      const score = Astronomy.calcScore(day.eveningCloudCover, day.eveningPrecipProb, moonData.fraction);
      const scoreColor = Astronomy.getScoreColor(score);
      const isToday = day.date === today;

      const dayName = isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const cloudIcon = Icons.cloudIcon(day.eveningCloudCover);
      const moonSvg   = Icons.moonPhase(moonData.fraction, moonData.phase, 22);

      return `
        <a class="week-row${isToday ? ' today' : ''}" href="index.html?date=${day.date}">
          <span class="week-day-name">${dayName}</span>
          <span class="week-date">${dateStr}</span>
          <span class="week-cloud">${cloudIcon}</span>
          <span class="week-cloud-pct">${day.eveningCloudCover}%</span>
          <span class="week-moon">${moonSvg}</span>
          <span class="week-score" style="color:${scoreColor}">${score.toFixed(1)}</span>
          <span class="week-chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </a>
      `;
    });

    grid.innerHTML = rows.join('');
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
  const form = document.getElementById('locationForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('cityInput');
      if (input && input.value.trim()) WeekApp.searchCity(input.value.trim());
    });
  }
  WeekApp.init();
});

// app.js — Perfect Day main app

const App = {
  map: null,
  sheetExpanded: false,
  isDragging: false,
  dragStartY: 0,
  dragStartHeight: 0,
  updateThrottle: null,

  async init() {
    await TileCache.init();
    TileCache.registerProtocol();
    await this.initMap();
    this.initBottomSheet();
    this.initSensors();
    this.updateStorage();
  },

  // ── Map ──

  async initMap() {
    const styleUrl = 'https://tiles.openfreemap.org/styles/liberty';

    // Fetch and cache style JSON for offline use
    let style;
    try {
      const response = await fetch(styleUrl);
      const text = await response.text();
      style = JSON.parse(text);
      TileCache.saveResource(styleUrl, new TextEncoder().encode(text).buffer).catch(() => {});
    } catch (e) {
      // Offline — load from cache
      const cached = await TileCache.getResource(styleUrl);
      if (cached) {
        style = JSON.parse(new TextDecoder().decode(cached));
      } else {
        console.error('Map style not available offline');
        return;
      }
    }

    this.map = new maplibregl.Map({
      container: 'map',
      style: style,
      center: [0, 20],
      zoom: 2,
      attributionControl: true,
      transformRequest: (url, resourceType) => {
        // Route all tile server requests through caching protocol for offline
        if (url.startsWith('https://tiles.openfreemap.org')) {
          return { url: url.replace('https://', 'cached://') };
        }
        return { url };
      }
    });

    // Add zoom controls
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Add geolocate control
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    this.map.addControl(geolocate, 'top-right');

    // Auto-activate geolocation after map loads
    this.map.on('load', () => {
      // Small delay so the map is fully ready
      setTimeout(() => geolocate.trigger(), 500);
    });

    // Update tile stats periodically while moving
    this.map.on('moveend', () => this.updateStorage());
  },

  // ── Sensors ──

  initSensors() {
    // Start GPS immediately
    Sensors.startGPS();

    // Throttle UI updates to ~4fps to avoid jank
    Sensors.onUpdate(() => {
      if (this.updateThrottle) return;
      this.updateThrottle = setTimeout(() => {
        this.updateThrottle = null;
        this.updateSensorUI();
      }, 250);
    });

    // Enable sensors button (needed for iOS permission)
    const btn = document.getElementById('enableSensorsBtn');
    btn.addEventListener('click', async () => {
      const ok = await Sensors.enableDeviceSensors();
      if (ok) {
        btn.style.display = 'none';
        document.getElementById('sensorGrid').style.display = 'grid';
      } else {
        btn.textContent = 'Sensors Unavailable';
        btn.disabled = true;
        btn.style.opacity = '0.5';
      }
    });

    // On desktop, sensors may not require permission — try auto-enabling
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission !== 'function') {
      // Not iOS — sensors available without permission
      Sensors.enableDeviceSensors().then(ok => {
        if (ok) {
          btn.style.display = 'none';
          document.getElementById('sensorGrid').style.display = 'grid';
        }
      });
    }
  },

  updateSensorUI() {
    const g = Sensors.gps;
    const o = Sensors.orientation;
    const m = Sensors.motion;

    // Summary (collapsed view)
    if (g.lat != null) {
      document.getElementById('summaryCoords').textContent =
        `${Sensors.formatCoord(g.lat, true)}, ${Sensors.formatCoord(g.lng, false)}`;
    }

    document.getElementById('summaryElevation').textContent =
      g.altitude != null ? `${Math.round(g.altitude)} m` : '--';

    // Heading: prefer compass, fall back to GPS heading
    const rawHeading = o.heading != null ? o.heading : g.heading;
    if (rawHeading != null) {
      const cardinal = Sensors.getCardinal(rawHeading);
      document.getElementById('summaryHeading').textContent = `${Math.round(rawHeading)}° ${cardinal}`;

      // Smooth heading for needle rotation to prevent jitter
      const smoothed = Sensors.smoothHeading(rawHeading);
      const needle = document.querySelector('.compass-needle');
      needle.style.transform = `rotate(${-smoothed}deg)`;
      document.getElementById('compassLetter').textContent = cardinal;
    } else {
      document.getElementById('summaryHeading').textContent = '--';
    }

    // Detail view (expanded)
    document.getElementById('detailLat').textContent = Sensors.formatCoord(g.lat, true);
    document.getElementById('detailLng').textContent = Sensors.formatCoord(g.lng, false);
    document.getElementById('detailAltitude').textContent =
      g.altitude != null ? `${g.altitude.toFixed(1)} m (±${g.altitudeAccuracy ? Math.round(g.altitudeAccuracy) : '?'} m)` : '--';
    document.getElementById('detailSpeed').textContent =
      g.speed != null ? `${(g.speed * 3.6).toFixed(1)} km/h` : '--';
    document.getElementById('detailAccuracy').textContent =
      g.accuracy != null ? `±${Math.round(g.accuracy)} m` : '--';
    document.getElementById('detailGpsHeading').textContent =
      g.heading != null ? `${Math.round(g.heading)}° ${Sensors.getCardinal(g.heading)}` : '--';

    // Compass & motion
    if (Sensors.sensorsEnabled) {
      document.getElementById('detailCompass').textContent =
        o.heading != null ? `${Math.round(o.heading)}° ${Sensors.getCardinal(o.heading)}` : '--';
      document.getElementById('detailTilt').textContent =
        o.beta != null ? `${o.beta.toFixed(1)}°` : '--';
      document.getElementById('detailRoll').textContent =
        o.gamma != null ? `${o.gamma.toFixed(1)}°` : '--';
      document.getElementById('detailAccelX').textContent =
        m.x != null ? `${m.x.toFixed(2)} m/s²` : '--';
      document.getElementById('detailAccelY').textContent =
        m.y != null ? `${m.y.toFixed(2)} m/s²` : '--';
      document.getElementById('detailAccelZ').textContent =
        m.z != null ? `${m.z.toFixed(2)} m/s²` : '--';
    }
  },

  // ── Bottom Sheet ──

  initBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    const handle = document.getElementById('sheetHandle');

    // Tap to toggle
    handle.addEventListener('click', () => {
      if (this.isDragging) return;
      this.toggleSheet();
    });

    // Drag to resize
    handle.addEventListener('touchstart', (e) => {
      this.isDragging = false;
      this.dragStartY = e.touches[0].clientY;
      this.dragStartHeight = sheet.offsetHeight;
      sheet.classList.add('dragging');
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      this.isDragging = true;
      const dy = this.dragStartY - e.touches[0].clientY;
      const newHeight = Math.max(110, Math.min(420, this.dragStartHeight + dy));
      sheet.style.height = newHeight + 'px';
    }, { passive: true });

    handle.addEventListener('touchend', () => {
      sheet.classList.remove('dragging');
      const currentHeight = sheet.offsetHeight;
      // Snap to expanded or collapsed
      if (currentHeight > 200) {
        this.sheetExpanded = true;
        sheet.classList.add('expanded');
      } else {
        this.sheetExpanded = false;
        sheet.classList.remove('expanded');
      }
      sheet.style.height = '';

      // Reset drag flag after a tick so click handler doesn't fire
      setTimeout(() => { this.isDragging = false; }, 50);
    });

    // Storage buttons
    document.getElementById('clearCacheBtn').addEventListener('click', async () => {
      if (confirm('Clear all cached map tiles?')) {
        await TileCache.clearAll();
        this.updateStorage();
      }
    });

    document.getElementById('persistBtn').addEventListener('click', async () => {
      if (navigator.storage && navigator.storage.persist) {
        const granted = await navigator.storage.persist();
        const btn = document.getElementById('persistBtn');
        btn.textContent = granted ? 'Persistent!' : 'Denied';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Keep Offline';
          btn.disabled = false;
        }, 2000);
      }
    });
  },

  toggleSheet() {
    const sheet = document.getElementById('bottomSheet');
    this.sheetExpanded = !this.sheetExpanded;
    sheet.classList.toggle('expanded', this.sheetExpanded);
    if (this.sheetExpanded) {
      this.updateStorage();
    }
  },

  // ── Storage ──

  async updateStorage() {
    try {
      const stats = await TileCache.getStats();
      document.getElementById('tileCount').textContent = stats.count.toLocaleString();
      const mb = (stats.sizeBytes / (1024 * 1024)).toFixed(1);
      document.getElementById('storageUsed').textContent = `${mb} MB`;

      // Update storage bar
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const pct = Math.min(100, (estimate.usage / estimate.quota * 100));
        document.getElementById('storageFill').style.width = pct.toFixed(1) + '%';
      }
    } catch (e) {
      // IndexedDB might not be ready yet
    }
  }
};

// Start
App.init();

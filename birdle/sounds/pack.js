const INAT_API_BASE = 'https://api.inaturalist.org/v1';
const RADIUS_KM = 50;
const MAX_CANDIDATES = 60; // top N by frequency before sound-checking
const SOUND_BATCH_SIZE = 10;

const PackApp = {
  map: null,
  marker: null,
  pickedLat: null,
  pickedLng: null,

  init() {
    App.checkVersionAndReload();
    this.initMap();
    this.bindGps();
    this.bindStart();
  },

  initMap() {
    this.map = L.map('sounds-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', (e) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Center on cached location if available
    const cached = typeof LocationService !== 'undefined' ? LocationService.getCached() : null;
    if (cached && cached.lat && cached.lng) {
      this.map.setView([cached.lat, cached.lng], 9);
      this.setMarker(cached.lat, cached.lng);
    }
  },

  setMarker(lat, lng) {
    this.pickedLat = lat;
    this.pickedLng = lng;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    document.getElementById('start-btn').style.display = 'block';
    this.showError('');
  },

  bindGps() {
    document.getElementById('gps-btn').addEventListener('click', () => {
      if (!navigator.geolocation) {
        this.showError('Geolocation not supported by your browser.');
        return;
      }
      document.getElementById('gps-btn').textContent = '📍 Detecting...';
      document.getElementById('gps-btn').disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('gps-btn').textContent = '📍 Use My Location';
          document.getElementById('gps-btn').disabled = false;
          const { latitude, longitude } = pos.coords;
          this.map.setView([latitude, longitude], 11);
          this.setMarker(latitude, longitude);
        },
        () => {
          document.getElementById('gps-btn').textContent = '📍 Use My Location';
          document.getElementById('gps-btn').disabled = false;
          this.showError('Could not get your location. Tap the map to pick a spot manually.');
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  },

  bindStart() {
    document.getElementById('start-btn').addEventListener('click', () => {
      if (this.pickedLat === null) return;
      this.loadAndGo();
    });
  },

  async loadAndGo() {
    const statusEl = document.getElementById('load-status');
    const startBtn = document.getElementById('start-btn');

    startBtn.disabled = true;
    statusEl.style.display = 'block';
    statusEl.textContent = 'Finding birds in this area...';
    this.showError('');

    try {
      const candidates = await this.fetchSpeciesByFrequency(this.pickedLat, this.pickedLng);

      if (candidates.length === 0) {
        this.showError('No bird sightings found in this area for the past 30 days. Try a different location.');
        statusEl.style.display = 'none';
        startBtn.disabled = false;
        return;
      }

      statusEl.textContent = `Checking sounds for ${candidates.length} species...`;

      const withSounds = await this.filterToSoundSpecies(candidates, (done, total) => {
        statusEl.textContent = `Checking sounds… ${done}/${total}`;
      });

      if (withSounds.length === 0) {
        this.showError('No sound recordings found for birds in this area. Try a different location.');
        statusEl.style.display = 'none';
        startBtn.disabled = false;
        return;
      }

      statusEl.textContent = `Found ${withSounds.length} birds with sounds.`;

      const name = this.defaultPackName(this.pickedLat, this.pickedLng);
      const pack = await BirdDB.createSoundPack({
        name,
        lat: this.pickedLat,
        lng: this.pickedLng,
        species: withSounds
      });

      window.location.href = `pack-view?id=${pack.id}`;
    } catch (err) {
      console.error('[PackApp] Error:', err);
      this.showError('Could not load birds. Check your connection and try again.');
      statusEl.style.display = 'none';
      startBtn.disabled = false;
    }
  },

  async fetchSpeciesByFrequency(lat, lng) {
    const today = new Date();
    const d2 = today.toISOString().slice(0, 10);
    const d1Date = new Date(today);
    d1Date.setDate(d1Date.getDate() - 30);
    const d1 = d1Date.toISOString().slice(0, 10);

    const url = `${INAT_API_BASE}/observations/species_counts?taxon_id=3&lat=${lat}&lng=${lng}&radius=${RADIUS_KM}&d1=${d1}&d2=${d2}&quality_grade=research&order_by=observation_count&order=desc&per_page=${MAX_CANDIDATES}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iNaturalist API error ${res.status}`);
    const data = await res.json();

    return (data.results || []).map(r => ({
      taxonId: r.taxon.id,
      comName: r.taxon.preferred_common_name || r.taxon.name,
      sciName: r.taxon.name,
      count: r.count
    })).filter(s => s.comName);
  },

  async filterToSoundSpecies(candidates, onProgress) {
    const results = [];
    const total = candidates.length;
    let done = 0;

    for (let i = 0; i < candidates.length; i += SOUND_BATCH_SIZE) {
      const batch = candidates.slice(i, i + SOUND_BATCH_SIZE);

      const checks = await Promise.all(batch.map(async (bird) => {
        const url = `${INAT_API_BASE}/observations?taxon_name=${encodeURIComponent(bird.sciName)}&sounds=true&quality_grade=research&per_page=1&order_by=votes&order=desc`;
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.json();
          const obs = (data.results || [])[0];
          if (!obs) return null;
          const sound = (obs.sounds || [])[0];
          if (!sound || !sound.file_url) return null;
          return { ...bird, soundUrl: sound.file_url };
        } catch {
          return null;
        }
      }));

      for (const result of checks) {
        if (result) results.push(result);
      }

      done += batch.length;
      onProgress(done, total);
    }

    return results;
  },

  defaultPackName(lat, lng) {
    const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${lat.toFixed(2)}, ${lng.toFixed(2)} · ${date}`;
  },

  showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }
};

window.PackApp = PackApp;

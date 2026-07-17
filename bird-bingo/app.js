// Bird Bingo - shared helpers used across pages
const LOCATION_KEY = 'bird-bingo-location';

const Shared = {
  // ---------- Location ----------

  getSavedLocation() {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  saveLocation(location) {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  },

  clearLocation() {
    localStorage.removeItem(LOCATION_KEY);
  },

  // Requests GPS, reverse-geocodes to get a human-readable region name for display.
  async captureLocation() {
    const coords = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        (error) => {
          let message = 'Could not get your location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied. Please allow location access and try again.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out. Please try again.';
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    });

    let regionName = null;
    try {
      const geo = await LocationService.reverseGeocode(coords.lat, coords.lng);
      if (geo) regionName = LocationService.getRegionDisplayName(geo);
    } catch (e) {
      console.error('Reverse geocode failed', e);
    }

    const location = { lat: coords.lat, lng: coords.lng, regionName, updatedAt: new Date().toISOString() };
    this.saveLocation(location);
    return location;
  },

  // ---------- Wikipedia image + description ----------

  async fetchWikipediaData(searchTerm) {
    const cacheKey = `wiki_${searchTerm}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached === 'null' ? null : JSON.parse(cached);
    }

    const searchVariants = [searchTerm, searchTerm.replace(/-/g, ' ')];

    for (let i = 0; i < searchVariants.length; i++) {
      const variant = searchVariants[i];
      if (i > 0 && variant === searchVariants[0]) continue;

      try {
        const title = encodeURIComponent(variant.replace(/ /g, '_'));
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages|extracts&pithumbsize=500&exintro=1&explaintext=1&format=json&origin=*&redirects=1`;
        const response = await fetch(url);
        const data = await response.json();

        const pages = data.query?.pages;
        if (pages) {
          const page = Object.values(pages)[0];
          const isDisambiguation = /may (also )?refer to:?\s*$/i.test((page.extract || '').trim());
          if (!isDisambiguation && (page.thumbnail?.source || page.extract)) {
            const result = {
              imageUrl: page.thumbnail?.source || null,
              description: page.extract || null
            };
            localStorage.setItem(cacheKey, JSON.stringify(result));
            return result;
          }
        }
      } catch (error) {
        console.error('[WikiAPI] Error fetching data for', variant, ':', error);
      }
    }

    localStorage.setItem(cacheKey, 'null');
    return null;
  },

  // ---------- iNaturalist bird call ----------

  async fetchBirdCall(sciName) {
    if (!sciName) return null;
    const cacheKey = `inat_call_${sciName}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached === 'null' ? null : cached;
    }

    try {
      const url = `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(sciName)}&sounds=true&quality_grade=research&per_page=5&order_by=votes&order=desc`;
      const response = await fetch(url);
      const data = await response.json();

      for (const result of (data.results || [])) {
        if (result.sounds && result.sounds.length > 0) {
          const audioUrl = result.sounds[0].file_url;
          if (audioUrl) {
            localStorage.setItem(cacheKey, audioUrl);
            return audioUrl;
          }
        }
      }
    } catch (error) {
      console.error('[iNat] Error fetching bird call for', sciName, ':', error);
    }

    localStorage.setItem(cacheKey, 'null');
    return null;
  },

  // ---------- Bingo cell rendering (image + name always shown) ----------

  renderCell(bird, index, found) {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell' + (found ? ' found' : '');
    cell.dataset.speciesCode = bird.speciesCode;
    cell.innerHTML = `
      <div class="thumb-wrap"><span class="no-img">🐦</span></div>
      <div class="cell-name">${bird.comName}</div>
    `;
    this.loadCellImage(cell, bird);
    return cell;
  },

  async loadCellImage(cell, bird) {
    const data = await this.fetchWikipediaData(bird.comName) || (bird.sciName ? await this.fetchWikipediaData(bird.sciName) : null);
    if (!data || !data.imageUrl) return;

    const thumbWrap = cell.querySelector('.thumb-wrap');
    if (!thumbWrap) return;
    const img = new Image();
    img.alt = bird.comName;
    img.onload = () => {
      thumbWrap.innerHTML = '';
      thumbWrap.appendChild(img);
    };
    img.src = data.imageUrl;
  },

  formatDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

// LocationService - Unified location management for Birdle
const LocationService = {
  CACHE_KEY: 'userLocation',

  // Get cached location or null
  getCached() {
    const stored = localStorage.getItem(this.CACHE_KEY);
    if (!stored) return null;

    try {
      const location = JSON.parse(stored);
      // Check if cache is valid (only countryCode is required)
      if (location.countryCode) {
        return location;
      }
    } catch (e) {
      console.error('Error parsing cached location:', e);
    }
    return null;
  },

  // Save location to cache
  saveToCache(location) {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      ...location,
      cachedAt: new Date().toISOString()
    }));
  },

  // Check if we have a cached location
  hasCached() {
    return this.getCached() !== null;
  },

  // Get the appropriate button text
  getButtonText() {
    return this.hasCached() ? '📍 Update Location' : '📍 Use My Location';
  },

  // Update all location buttons on the page to show correct text
  updateButtonTexts() {
    const text = this.getButtonText();
    const buttons = document.querySelectorAll('#use-location-btn, .use-location-btn');
    buttons.forEach(btn => {
      if (!btn.disabled) {
        btn.textContent = text;
      }
    });
  },

  // Request GPS location (returns Promise with coordinates)
  async requestGPS() {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser');
    }

    // Check permissions if available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          throw new Error('Location permission denied. Please enable location access in your browser settings.');
        }
      } catch (e) {
        // Permissions API not available, continue anyway
        if (e.message.includes('denied')) throw e;
      }
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Could not get your location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please allow location access and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              message += 'Position unavailable. Please check your location settings.';
              break;
            case error.TIMEOUT:
              message += 'Request timed out. Please try again.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );
    });
  },

  // Reverse geocode coordinates using Nominatim (OpenStreetMap)
  async reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Birdle Bird Spotting App'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.address) {
        throw new Error('No address data returned');
      }

      const address = data.address;

      // Extract country code (ISO 3166-1 alpha-2)
      const countryCode = address.country_code?.toUpperCase();
      const countryName = address.country;

      // Extract state/province
      const stateName = address.state || address.province || address.region;

      return {
        countryCode,
        countryName,
        stateName,
        displayName: data.display_name
      };
    } catch (error) {
      console.error('Nominatim reverse geocode failed:', error);
      return null;
    }
  },

  // Map ISO country code to eBird region code (they're mostly the same)
  // eBird uses ISO 3166-1 alpha-2 codes
  getEBirdCountryCode(isoCode) {
    // Most are identical, but there are a few exceptions
    const mappings = {
      'GB': 'GB', // United Kingdom
      'UK': 'GB', // Also United Kingdom
    };
    return mappings[isoCode] || isoCode;
  },

  // Try to find eBird state code by matching state name to eBird states
  async findEBirdStateCode(countryCode, stateName) {
    if (!countryCode || !stateName) return null;

    try {
      const states = await EBird.getStates(countryCode);
      if (!states || states.length === 0) return null;

      // Normalize for comparison
      const normalizedName = stateName.toLowerCase().trim();

      // Try exact match first
      let match = states.find(s => s.name.toLowerCase() === normalizedName);

      // Try partial match
      if (!match) {
        match = states.find(s =>
          s.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(s.name.toLowerCase())
        );
      }

      return match ? match.code : null;
    } catch (error) {
      console.error('Error finding eBird state code:', error);
      return null;
    }
  },

  // Main method: Get location with reverse geocoding
  // If forceRefresh is true, always request new GPS
  // Otherwise, return cached location if available
  async getLocation(forceRefresh = false) {
    // Return cached if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCached();
      if (cached) {
        return cached;
      }
    }

    // Request GPS
    const coords = await this.requestGPS();

    // Reverse geocode
    const geo = await this.reverseGeocode(coords.lat, coords.lng);

    if (!geo || !geo.countryCode) {
      // Fallback: try to get region from eBird observations
      const fallback = await this.getRegionFromEBird(coords.lat, coords.lng);
      if (fallback) {
        const location = {
          lat: coords.lat,
          lng: coords.lng,
          ...fallback
        };
        this.saveToCache(location);
        return location;
      }
      throw new Error('Could not determine your location. Please select your region manually.');
    }

    // Get eBird codes
    const ebirdCountryCode = this.getEBirdCountryCode(geo.countryCode);
    const ebirdStateCode = await this.findEBirdStateCode(ebirdCountryCode, geo.stateName);

    const location = {
      lat: coords.lat,
      lng: coords.lng,
      countryCode: ebirdCountryCode,
      countryName: geo.countryName,
      stateCode: ebirdStateCode,
      stateName: geo.stateName,
      displayName: geo.displayName
    };

    // Cache the location
    this.saveToCache(location);

    return location;
  },

  // Fallback: Get region from eBird observations
  async getRegionFromEBird(lat, lng) {
    try {
      const nearby = await EBird.getNearbyObservations(lat, lng, 50);

      if (!nearby || nearby.length === 0) {
        return null;
      }

      const obs = nearby[0];
      return {
        countryCode: obs.countryCode,
        countryName: obs.countryName,
        stateCode: obs.subnational1Code,
        stateName: obs.subnational1Name
      };
    } catch (error) {
      console.error('eBird fallback failed:', error);
      return null;
    }
  },

  // Helper: Get just the region code (state if available, otherwise country)
  getRegionCode(location) {
    return location.stateCode || location.countryCode;
  },

  // Helper: Get display name for region
  getRegionDisplayName(location) {
    if (location.stateCode && location.stateName) {
      return `${location.stateName}, ${location.countryName}`;
    }
    return location.countryName || 'Unknown location';
  },

  // Helper: Check if location has valid GPS coordinates
  hasValidCoordinates(location) {
    return location &&
           typeof location.lat === 'number' &&
           typeof location.lng === 'number' &&
           (location.lat !== 0 || location.lng !== 0);
  }
};

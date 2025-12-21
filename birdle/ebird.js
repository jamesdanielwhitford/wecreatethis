// eBird API Module
const EBird = {
  // API key - get yours at https://ebird.org/api/keygen
  API_KEY: 'rut6699v8fce',

  BASE_URL: 'https://api.ebird.org/v2',

  // Fetch recent observations for a region
  async getRecentObservations(regionCode) {
    const url = `${this.BASE_URL}/data/obs/${regionCode}/recent`;
    return this.fetch(url);
  },

  // Fetch recent observations near coordinates
  async getNearbyObservations(lat, lng) {
    const url = `${this.BASE_URL}/data/obs/geo/recent?lat=${lat}&lng=${lng}`;
    return this.fetch(url);
  },

  // Fetch historic observations for a specific date
  async getHistoricObservations(regionCode, year, month, day) {
    const url = `${this.BASE_URL}/data/obs/${regionCode}/historic/${year}/${month}/${day}`;
    return this.fetch(url);
  },

  // Internal fetch with auth header
  async fetch(url) {
    if (!this.API_KEY) {
      console.error('eBird API key not set. Get one at https://ebird.org/api/keygen');
      return [];
    }

    try {
      const response = await fetch(url, {
        headers: {
          'x-ebirdapitoken': this.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`eBird API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('eBird fetch error:', error);
      return [];
    }
  }
};

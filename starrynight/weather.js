// weather.js — Open-Meteo API fetch with localStorage caching

const Weather = {
  CACHE_KEY: 'starrynight-weather-v1',
  CACHE_TTL: 60 * 60 * 1000, // 1 hour

  async fetch(lat, lng) {
    const cached = this._getCache(lat, lng);
    if (cached) return cached;

    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lng}`
      + `&hourly=cloud_cover,precipitation_probability,weather_code`
      + `&daily=sunrise,sunset,precipitation_probability_max,weather_code`
      + `&forecast_days=7`
      + `&timezone=auto`;

    const res = await window.fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const raw = await res.json();
    const data = this._process(raw);
    this._setCache(lat, lng, data);
    return data;
  },

  _process(raw) {
    const hourly = raw.hourly;
    const daily  = raw.daily;
    const days = [];

    for (let d = 0; d < 7; d++) {
      const date = daily.time[d]; // YYYY-MM-DD

      // Slice hourly data for this day (24 hours per day)
      const dayStart = d * 24;
      const hourCloud = hourly.cloud_cover.slice(dayStart, dayStart + 24);
      const hourPrecip = hourly.precipitation_probability.slice(dayStart, dayStart + 24);

      // Evening = hours 19–23 (indices 19..23)
      const eveningCloud  = hourCloud.slice(19, 24);
      const eveningPrecip = hourPrecip.slice(19, 24);

      const validCloud  = eveningCloud.filter(v => v !== null && v !== undefined);
      const validPrecip = eveningPrecip.filter(v => v !== null && v !== undefined);

      const avgCloud  = validCloud.length  ? Math.round(validCloud.reduce((a, b) => a + b, 0) / validCloud.length)   : 50;
      const maxPrecip = validPrecip.length ? Math.round(Math.max(...validPrecip)) : 0;

      days.push({
        date,
        eveningCloudCover: avgCloud,
        eveningPrecipProb: maxPrecip,
        sunrise: daily.sunrise[d],
        sunset:  daily.sunset[d],
        weatherCode: daily.weather_code[d],
      });
    }

    return { days, utcOffsetSeconds: raw.utc_offset_seconds || 0 };
  },

  _getCache(lat, lng) {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const { data, timestamp, cachedLat, cachedLng } = JSON.parse(raw);
      if (Date.now() - timestamp > this.CACHE_TTL) return null;
      if (Math.abs(cachedLat - lat) > 0.05 || Math.abs(cachedLng - lng) > 0.05) return null;
      return data;
    } catch { return null; }
  },

  _setCache(lat, lng, data) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        data, timestamp: Date.now(), cachedLat: lat, cachedLng: lng,
      }));
    } catch {}
  },

  // Return stale cache regardless of age/location (used when offline)
  getCachedData() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch { return null; }
  },

  // Get cached data for a specific date string (YYYY-MM-DD)
  getDayData(weatherData, dateStr) {
    if (!weatherData) return null;
    return weatherData.days.find(d => d.date === dateStr) || weatherData.days[0];
  },
};

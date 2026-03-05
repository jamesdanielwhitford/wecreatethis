// astronomy.js — Pure calculation module. No DOM, no fetch.
// Depends on SunCalc global being loaded first.

const Astronomy = {

  // ── Moon phase names ──────────────────────────────────────────────────────

  getMoonPhaseName(phase) {
    // phase is 0.0–1.0 from SunCalc.getMoonIllumination().phase
    const phases = [
      { name: 'New Moon',        emoji: '🌑', center: 0.0   },
      { name: 'Waxing Crescent', emoji: '🌒', center: 0.125 },
      { name: 'First Quarter',   emoji: '🌓', center: 0.25  },
      { name: 'Waxing Gibbous',  emoji: '🌔', center: 0.375 },
      { name: 'Full Moon',       emoji: '🌕', center: 0.5   },
      { name: 'Waning Gibbous',  emoji: '🌖', center: 0.625 },
      { name: 'Last Quarter',    emoji: '🌗', center: 0.75  },
      { name: 'Waning Crescent', emoji: '🌘', center: 0.875 },
    ];
    // Wrap phase near 1.0 to also compare to 0.0 (New Moon)
    let best = phases[0];
    let bestDist = Infinity;
    for (const p of phases) {
      let dist = Math.abs(phase - p.center);
      if (dist > 0.5) dist = 1 - dist; // wrap-around distance
      if (dist < bestDist) { bestDist = dist; best = p; }
    }
    return best;
  },

  // ── SunCalc wrappers ──────────────────────────────────────────────────────

  getSunTimes(date, lat, lng) {
    const t = SunCalc.getTimes(date, lat, lng);
    return {
      sunrise:    t.sunrise,
      sunset:     t.sunset,
      solarNoon:  t.solarNoon,
      civilDawn:  t.dawn,
      civilDusk:  t.dusk,
      nauticalDawn: t.nauticalDawn,
      nauticalDusk: t.nauticalDusk,
      astronomicalDawn: t.nightEnd,
      astronomicalDusk: t.night,
    };
  },

  getMoonData(date, lat, lng) {
    const illum = SunCalc.getMoonIllumination(date);
    const pos   = SunCalc.getMoonPosition(date, lat, lng);
    const times = SunCalc.getMoonTimes(date, lat, lng);
    const phase = this.getMoonPhaseName(illum.phase);
    return {
      phase:       illum.phase,
      fraction:    illum.fraction,
      phaseName:   phase.name,
      phaseEmoji:  phase.emoji,
      altitude:    pos.altitude * 180 / Math.PI,
      azimuth:     ((pos.azimuth * 180 / Math.PI) + 180 + 360) % 360,
      moonrise:    times.rise || null,
      moonset:     times.set  || null,
    };
  },

  // ── Skywatching score ─────────────────────────────────────────────────────

  calcScore(cloudCover, precipProb, moonIllumination) {
    let score = 10;
    score -= cloudCover / 20;         // max -5
    score -= precipProb / 20;         // max -5
    score -= moonIllumination * 2;    // max -2
    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  },

  getScoreColor(score) {
    if (score >= 7) return 'var(--score-good)';
    if (score >= 4) return 'var(--score-fair)';
    return 'var(--score-poor)';
  },

  getScoreLabel(score) {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    if (score >= 2) return 'Poor';
    return 'Very Poor';
  },

  // ── Time formatting ───────────────────────────────────────────────────────

  formatTime(date) {
    if (!date || isNaN(date)) return '—';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  },

  // ── Planet orbital elements (J2000 mean elements + secular rates) ─────────
  // Source: Standish et al., "Keplerian Elements for Approximate
  // Positions of the Major Planets" (JPL Solar System Dynamics)
  // Each element: [value_at_J2000, rate_per_Julian_century]
  // Units: a=AU, e=dimensionless, i/L/w/O=degrees

  PLANETS: {
    Mercury: {
      symbol: '☿',
      a:  [0.38709927,  0.00000037],
      e:  [0.20563593,  0.00001906],
      i:  [7.00497902, -0.00594749],
      L:  [252.25032350, 149472.67411175],
      w:  [77.45779628,  0.16047689],
      O:  [48.33076593, -0.12534081],
    },
    Venus: {
      symbol: '♀',
      a:  [0.72333566,  0.00000390],
      e:  [0.00677672, -0.00004107],
      i:  [3.39467605, -0.00078890],
      L:  [181.97909950, 58517.81538729],
      w:  [131.60246718,  0.00268329],
      O:  [76.67984255, -0.27769418],
    },
    Mars: {
      symbol: '♂',
      a:  [1.52371034,  0.00001847],
      e:  [0.09339410,  0.00007882],
      i:  [1.84969142, -0.00813131],
      L:  [355.44656790, 19140.30268499],
      w:  [-23.94362959,  0.44441088],
      O:  [49.55953891, -0.29257343],
    },
    Jupiter: {
      symbol: '♃',
      a:  [5.20288700, -0.00011607],
      e:  [0.04838624, -0.00013253],
      i:  [1.30439695, -0.00183714],
      L:  [34.39644051, 3034.74612775],
      w:  [14.72847983,  0.21252668],
      O:  [100.47390909,  0.20469106],
    },
    Saturn: {
      symbol: '♄',
      a:  [9.53667594, -0.00125060],
      e:  [0.05386179, -0.00050991],
      i:  [2.48599187,  0.00193609],
      L:  [49.95424423, 1222.49362201],
      w:  [92.59887831, -0.41897216],
      O:  [113.66242448, -0.28867794],
    },
    Uranus: {
      symbol: '⛢',
      a:  [19.18916464, -0.00196176],
      e:  [0.04725744, -0.00004397],
      i:  [0.77263783, -0.00242939],
      L:  [313.23810451, 428.48202785],
      w:  [170.95427630,  0.40805281],
      O:  [74.01692503,  0.04240589],
      note: 'Binoculars needed',
    },
    Neptune: {
      symbol: '♆',
      a:  [30.06992276,  0.00026291],
      e:  [0.00859048,  0.00005105],
      i:  [1.77004347,  0.00035372],
      L:  [-55.12002969, 218.45945325],
      w:  [44.96476227, -0.32241464],
      O:  [131.78422574, -0.00508664],
      note: 'Binoculars needed',
    },
  },

  // Earth's orbital elements for heliocentric position
  EARTH: {
    a:  [1.00000261,  0.00000562],
    e:  [0.01671123, -0.00004392],
    i:  [-0.00001531, -0.01294668],
    L:  [100.46457166, 35999.37244981],
    w:  [102.93768193,  0.32327364],
    O:  [0.0, 0.0],
  },

  // ── Core orbital mechanics ────────────────────────────────────────────────

  _julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  },

  _julianCenturies(date) {
    return (this._julianDate(date) - 2451545.0) / 36525;
  },

  _deg2rad(d) { return d * Math.PI / 180; },
  _rad2deg(r) { return r * 180 / Math.PI; },
  _mod360(d) { return ((d % 360) + 360) % 360; },

  _solveKepler(M_rad, e) {
    // Newton-Raphson to solve E - e*sin(E) = M
    let E = M_rad;
    for (let i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
    }
    return E;
  },

  _heliocentricEcliptic(elements, T) {
    // Compute element values at epoch T
    const a = elements.a[0] + elements.a[1] * T;
    const e = elements.e[0] + elements.e[1] * T;
    const i = this._deg2rad(elements.i[0] + elements.i[1] * T);
    const L = this._deg2rad(this._mod360(elements.L[0] + elements.L[1] * T));
    const w = this._deg2rad(this._mod360(elements.w[0] + elements.w[1] * T));
    const O = this._deg2rad(this._mod360(elements.O[0] + elements.O[1] * T));

    const M_rad = this._mod360(this._rad2deg(L - w)) * Math.PI / 180;
    const E = this._solveKepler(M_rad, e);

    // Position in orbital plane
    const x_orb = a * (Math.cos(E) - e);
    const y_orb = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // Argument of perihelion in ecliptic plane
    const wp = w - O;  // already in radians

    // Transform to ecliptic coordinates
    const cos_O = Math.cos(O), sin_O = Math.sin(O);
    const cos_wp = Math.cos(wp), sin_wp = Math.sin(wp);
    const cos_i = Math.cos(i), sin_i = Math.sin(i);

    const xecl = (cos_wp * cos_O - sin_wp * sin_O * cos_i) * x_orb
               + (-sin_wp * cos_O - cos_wp * sin_O * cos_i) * y_orb;
    const yecl = (cos_wp * sin_O + sin_wp * cos_O * cos_i) * x_orb
               + (-sin_wp * sin_O + cos_wp * cos_O * cos_i) * y_orb;
    const zecl = (sin_wp * sin_i) * x_orb
               + (cos_wp * sin_i) * y_orb;

    return { x: xecl, y: yecl, z: zecl };
  },

  _earthPosition(T) {
    return this._heliocentricEcliptic(this.EARTH, T);
  },

  _localSiderealTime(date, lng_deg) {
    const JD = this._julianDate(date);
    const T = (JD - 2451545.0) / 36525;
    // Greenwich Mean Sidereal Time in degrees
    let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
             + 0.000387933 * T * T;
    GMST = this._mod360(GMST);
    return this._mod360(GMST + lng_deg);
  },

  _altAzFromRaDec(ra_deg, dec_deg, lat_deg, lng_deg, date) {
    const LST = this._localSiderealTime(date, lng_deg);
    const HA_deg = this._mod360(LST - ra_deg);
    const HA = this._deg2rad(HA_deg);
    const dec = this._deg2rad(dec_deg);
    const lat = this._deg2rad(lat_deg);

    const sin_alt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(HA);
    const alt = Math.asin(Math.max(-1, Math.min(1, sin_alt)));

    const az_raw = Math.atan2(-Math.cos(dec) * Math.sin(HA),
                              Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(lat) * Math.sin(alt));
    const az = this._mod360(this._rad2deg(az_raw));

    return { altitude: this._rad2deg(alt), azimuth: az };
  },

  _planetAltitudeAt(planetElements, T_at, lat, lng, date) {
    const earth = this._earthPosition(T_at);
    const planet = this._heliocentricEcliptic(planetElements, T_at);

    // Geocentric ecliptic
    const dx = planet.x - earth.x;
    const dy = planet.y - earth.y;
    const dz = planet.z - earth.z;

    // Obliquity of ecliptic
    const eps = this._deg2rad(23.439 - 0.0000004 * T_at * 36525);
    const cos_eps = Math.cos(eps), sin_eps = Math.sin(eps);

    // Equatorial coordinates
    const ra_rad = Math.atan2(dy * cos_eps - dz * sin_eps, dx);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dec_rad = Math.asin(Math.max(-1, Math.min(1, (dy * sin_eps + dz * cos_eps) / dist)));

    const ra_deg  = this._mod360(this._rad2deg(ra_rad));
    const dec_deg = this._rad2deg(dec_rad);

    return this._altAzFromRaDec(ra_deg, dec_deg, lat, lng, date);
  },

  // ── Rise/set via 144-step altitude scan ───────────────────────────────────

  _findRiseSet(planetElements, date, lat, lng) {
    const STEPS = 144; // 10-minute intervals over 24h
    const start = new Date(date);
    start.setHours(0, 0, 0, 0); // Start from midnight so peak is never missed

    const points = [];
    for (let i = 0; i < STEPS; i++) {
      const t = new Date(start.getTime() + i * 10 * 60 * 1000);
      const T = this._julianCenturies(t);
      const { altitude } = this._planetAltitudeAt(planetElements, T, lat, lng, t);
      points.push({ time: t, altitude });
    }

    let rise = null, set = null;
    let peakAlt = -Infinity, peakTime = null;

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].altitude > peakAlt) {
        peakAlt = points[i].altitude;
        peakTime = points[i].time;
      }
      const a0 = points[i].altitude;
      const a1 = points[i + 1].altitude;

      if (a0 < 0 && a1 >= 0 && !rise) {
        const frac = -a0 / (a1 - a0);
        rise = new Date(points[i].time.getTime() + frac * 10 * 60 * 1000);
      }
      if (a0 >= 0 && a1 < 0) {
        const frac = a0 / (a0 - a1);
        set = new Date(points[i].time.getTime() + frac * 10 * 60 * 1000);
      }
    }

    return { rise, set, peak: { time: peakTime, altitude: peakAlt } };
  },

  // ── Visibility rating ─────────────────────────────────────────────────────

  _visibilityStars(maxAlt) {
    if (maxAlt < 0) return 0;
    if (maxAlt >= 45) return 3;
    if (maxAlt >= 20) return 2;
    return 1;
  },

  // ── Main planet data ──────────────────────────────────────────────────────

  getPlanetData(date, lat, lng) {
    const results = [];

    // Sample altitudes at key evening hours to determine evening visibility
    const eveningHours = [19, 20, 21, 22, 23];

    for (const [name, elements] of Object.entries(this.PLANETS)) {
      const { rise, set, peak } = this._findRiseSet(elements, date, lat, lng);

      // Find peak altitude specifically during evening hours (19:00–23:00)
      let eveningPeakAlt = -Infinity;
      for (const h of eveningHours) {
        const t = new Date(date);
        t.setHours(h, 0, 0, 0);
        const T = this._julianCenturies(t);
        const { altitude } = this._planetAltitudeAt(elements, T, lat, lng, t);
        if (altitude > eveningPeakAlt) eveningPeakAlt = altitude;
      }

      const visibleTonight = eveningPeakAlt > 0;
      const stars = this._visibilityStars(eveningPeakAlt);

      // Only show rise/set if the planet is actually up in the evening window
      const eveningRise = rise && rise.getTime() < new Date(date).setHours(23, 59, 59, 0) ? rise : null;
      const eveningSet  = set  && set.getTime()  > new Date(date).setHours(19, 0, 0, 0)   ? set  : null;
      const showTimes = visibleTonight || (eveningRise && eveningSet);

      results.push({
        name,
        symbol:      elements.symbol,
        note:        elements.note || null,
        rise:        showTimes ? rise : null,
        set:         showTimes ? set  : null,
        daytimeOnly: !visibleTonight && peak.altitude > 0,
        peak,
        eveningPeakAlt: Math.round(eveningPeakAlt),
        maxAltitude: Math.round(eveningPeakAlt > 0 ? eveningPeakAlt : peak.altitude),
        stars,
        isVisible:   peak.altitude > 0,
        visibleTonight,
      });
    }

    // Sort: visible tonight first (by max altitude desc), then others
    results.sort((a, b) => {
      if (a.visibleTonight !== b.visibleTonight) return a.visibleTonight ? -1 : 1;
      return b.maxAltitude - a.maxAltitude;
    });

    return results;
  },

  // Overlay AstronomyAPI data onto offline-calculated results
  getPlanetDataEnhanced(basePlanets, apiRows) {
    if (!apiRows || !apiRows.length) return basePlanets;
    // apiRows: array of { entry: { id, name }, cells: [{ position: { horizontal: { altitude, azimuth } } }] }
    const apiMap = {};
    for (const row of apiRows) {
      const id = row.entry && row.entry.id;
      if (id) apiMap[id.toLowerCase()] = row.cells[0];
    }

    return basePlanets.map(p => {
      const apiData = apiMap[p.name.toLowerCase()];
      if (!apiData || !apiData.position) return p;
      const alt = parseFloat(apiData.position.horizontal?.altitude?.degrees || p.maxAltitude);
      return { ...p, maxAltitude: Math.round(alt), enhanced: true };
    });
  },
};

// sensors.js — GPS, compass, accelerometer with cross-platform handling

const Sensors = {
  gps: { lat: null, lng: null, altitude: null, speed: null, heading: null, accuracy: null, altitudeAccuracy: null },
  orientation: { heading: null, beta: null, gamma: null },
  motion: { x: null, y: null, z: null },
  watchId: null,
  sensorsEnabled: false,
  _onUpdate: null,
  _smoothedHeading: null,  // smoothed heading in degrees (0-360)

  onUpdate(callback) {
    this._onUpdate = callback;
  },

  _notify() {
    if (this._onUpdate) this._onUpdate();
  },

  // ── GPS ──

  startGPS() {
    if (!('geolocation' in navigator)) return false;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const c = position.coords;
        this.gps = {
          lat: c.latitude,
          lng: c.longitude,
          altitude: c.altitude,
          speed: c.speed,
          heading: c.heading,
          accuracy: c.accuracy,
          altitudeAccuracy: c.altitudeAccuracy
        };
        this._notify();
      },
      (error) => {
        console.warn('GPS error:', error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return true;
  },

  stopGPS() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  // ── Compass / Orientation ──

  async startOrientation() {
    // iOS 13+ requires permission request from user gesture
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('Orientation permission denied');
          return false;
        }
      } catch (e) {
        console.warn('Orientation permission error:', e);
        return false;
      }
    }

    window.addEventListener('deviceorientation', (event) => {
      // iOS provides webkitCompassHeading (true north)
      // Android: use 360 - alpha for approximate compass heading
      let heading = null;
      if (event.webkitCompassHeading != null) {
        heading = event.webkitCompassHeading;
      } else if (event.alpha != null) {
        heading = (360 - event.alpha) % 360;
      }

      this.orientation = {
        heading: heading,
        beta: event.beta,   // Front-back tilt (-180 to 180)
        gamma: event.gamma  // Left-right tilt (-90 to 90)
      };
      this._notify();
    });

    return true;
  },

  // ── Accelerometer / Motion ──

  async startMotion() {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('Motion permission denied');
          return false;
        }
      } catch (e) {
        console.warn('Motion permission error:', e);
        return false;
      }
    }

    window.addEventListener('devicemotion', (event) => {
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (accel) {
        this.motion = {
          x: accel.x,
          y: accel.y,
          z: accel.z
        };
        this._notify();
      }
    });

    return true;
  },

  // ── Enable all device sensors (call from user gesture) ──

  async enableDeviceSensors() {
    const orientationOk = await this.startOrientation();
    const motionOk = await this.startMotion();
    this.sensorsEnabled = orientationOk || motionOk;
    return this.sensorsEnabled;
  },

  // ── Utility ──

  // Low-pass filter for compass heading that handles 360/0 wraparound
  smoothHeading(raw) {
    if (raw == null) return this._smoothedHeading;
    if (this._smoothedHeading == null) {
      this._smoothedHeading = raw;
      return raw;
    }

    // Calculate shortest angular difference (-180 to 180)
    let diff = raw - this._smoothedHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Smoothing factor: 0.15 = heavy smoothing, stable needle
    this._smoothedHeading = (this._smoothedHeading + diff * 0.15 + 360) % 360;
    return this._smoothedHeading;
  },

  getCardinal(degrees) {
    if (degrees == null) return '--';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return dirs[index];
  },

  formatCoord(value, isLat) {
    if (value == null) return '--';
    const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${Math.abs(value).toFixed(5)}° ${dir}`;
  }
};

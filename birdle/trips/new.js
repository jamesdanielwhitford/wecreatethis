// New Trip Form Handler
(async function() {
  await BirdDB.init();

  const tripNameInput = document.getElementById('trip-name');
  const startDateInput = document.getElementById('start-date');
  const startTimeInput = document.getElementById('start-time');
  const endDateInput = document.getElementById('end-date');
  const endTimeInput = document.getElementById('end-time');
  const includeTimeCheckbox = document.getElementById('include-time-checkbox');
  const ongoingCheckbox = document.getElementById('ongoing-checkbox');
  const createBtn = document.getElementById('create-trip-btn');
  const spinner = document.getElementById('creating-spinner');

  const locationTypeRadios = document.querySelectorAll('input[name="location-type"]');
  const regionSelector = document.getElementById('region-selector');
  const mapPickerSection = document.getElementById('map-picker-section');
  const mapLabel = document.getElementById('map-label');

  const countrySelect = document.getElementById('country-select');
  const stateSelect = document.getElementById('state-select');

  const openMapPickerBtn = document.getElementById('open-map-picker-btn');
  const mapPickerModal = document.getElementById('map-picker-modal');
  const confirmAreaBtn = document.getElementById('confirm-area-btn');
  const cancelAreaBtn = document.getElementById('cancel-area-btn');
  const radiusSlider = document.getElementById('radius-slider');
  const radiusValue = document.getElementById('radius-value');
  const mapAreaInfo = document.getElementById('map-area-info');

  let selectedArea = null;
  let pickerMap = null;
  let pickerMarker = null;
  let pickerCircle = null;

  // Set default start date to today
  const now = new Date();
  startDateInput.value = now.toISOString().split('T')[0];

  // Handle include time checkbox
  includeTimeCheckbox.addEventListener('change', () => {
    if (includeTimeCheckbox.checked) {
      startTimeInput.style.display = 'block';
      endTimeInput.style.display = 'block';
      // Set default times
      startTimeInput.value = '09:00';
      endTimeInput.value = '17:00';
    } else {
      startTimeInput.style.display = 'none';
      endTimeInput.style.display = 'none';
      startTimeInput.value = '';
      endTimeInput.value = '';
    }
  });

  // Handle ongoing checkbox
  ongoingCheckbox.addEventListener('change', () => {
    endDateInput.disabled = ongoingCheckbox.checked;
    endTimeInput.disabled = ongoingCheckbox.checked;
    if (ongoingCheckbox.checked) {
      endDateInput.value = '';
      endTimeInput.value = '';
    }
  });

  // Handle location type selection
  locationTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const value = radio.value;

      // Hide all sections
      regionSelector.style.display = 'none';
      mapPickerSection.style.display = 'none';

      // Show relevant section
      if (value === 'region') {
        regionSelector.style.display = 'block';
      } else if (value === 'map') {
        mapPickerSection.style.display = 'block';
      }

      // Reset selected area when switching types
      if (value !== 'map') {
        selectedArea = null;
        mapAreaInfo.textContent = '';
      }
    });
  });

  // Disable map option if offline
  if (!navigator.onLine) {
    mapLabel.style.opacity = '0.5';
    mapLabel.querySelector('input').disabled = true;
    mapLabel.querySelector('span').textContent += ' (Requires internet)';
  }

  // Load countries for region selector
  await loadCountries();

  // Country/State selection logic
  countrySelect.addEventListener('change', async () => {
    const countryCode = countrySelect.value;
    if (!countryCode) {
      stateSelect.disabled = true;
      stateSelect.innerHTML = '<option value="">Select State/Province...</option>';
      return;
    }

    // Load states for selected country
    const states = await EBird.getStates(countryCode);
    if (states && states.length > 0) {
      stateSelect.disabled = false;
      stateSelect.innerHTML = '<option value="">Entire Country</option>' +
        states.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
    } else {
      stateSelect.disabled = true;
      stateSelect.innerHTML = '<option value="">No states available</option>';
    }
  });

  // Map picker
  openMapPickerBtn.addEventListener('click', async () => {
    mapPickerModal.style.display = 'flex';

    // Initialize map if not already done
    if (!pickerMap) {
      await initPickerMap();
    }
  });

  // Radius slider
  radiusSlider.addEventListener('input', () => {
    const radius = parseFloat(radiusSlider.value);
    // Display with 1 decimal place if less than 1km, otherwise no decimals
    radiusValue.textContent = radius < 1 ? radius.toFixed(1) : Math.round(radius);

    // Update circle if it exists
    if (pickerCircle) {
      pickerCircle.setRadius(radius * 1000); // Convert km to meters
    }
  });

  // Confirm area
  confirmAreaBtn.addEventListener('click', () => {
    if (pickerMarker) {
      const latlng = pickerMarker.getLatLng();
      const radius = parseFloat(radiusSlider.value);

      selectedArea = {
        type: 'map',
        lat: latlng.lat,
        lng: latlng.lng,
        radius: radius
      };

      const radiusDisplay = radius < 1 ? radius.toFixed(1) : Math.round(radius);
      mapAreaInfo.textContent = `Area selected: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)} · ${radiusDisplay}km radius`;
      mapPickerModal.style.display = 'none';
    }
  });

  // Cancel area
  cancelAreaBtn.addEventListener('click', () => {
    mapPickerModal.style.display = 'none';
  });

  // Close modal on outside click
  mapPickerModal.addEventListener('click', (e) => {
    if (e.target === mapPickerModal) {
      mapPickerModal.style.display = 'none';
    }
  });

  // Create trip button
  createBtn.addEventListener('click', async () => {
    const tripName = tripNameInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = ongoingCheckbox.checked ? null : endDateInput.value;

    // Validation
    if (!tripName) {
      alert('Please enter a trip name');
      return;
    }

    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    // Build datetime strings
    let startDateTime, endDateTime = null;

    if (includeTimeCheckbox.checked) {
      // Include time
      const startTime = startTimeInput.value || '00:00';
      startDateTime = `${startDate}T${startTime}:00`;

      if (!ongoingCheckbox.checked && endDate) {
        const endTime = endTimeInput.value || '23:59';
        endDateTime = `${endDate}T${endTime}:00`;
      }
    } else {
      // Date only - set to start/end of day
      startDateTime = `${startDate}T00:00:00`;

      if (!ongoingCheckbox.checked && endDate) {
        endDateTime = `${endDate}T23:59:59`;
      }
    }

    // Validate end is after start
    if (endDateTime && endDateTime < startDateTime) {
      alert('End date must be after start date');
      return;
    }

    // Get location filter
    const locationType = document.querySelector('input[name="location-type"]:checked').value;
    let area = null;

    if (locationType === 'region') {
      const country = countrySelect.value;
      const state = stateSelect.value;

      if (!country) {
        alert('Please select a country');
        return;
      }

      area = {
        type: 'region',
        country: country,
        region: state || null
      };
    } else if (locationType === 'map') {
      if (!selectedArea) {
        alert('Please choose an area on the map');
        return;
      }
      area = selectedArea;
    }

    // Create trip
    spinner.style.display = 'block';
    createBtn.disabled = true;

    try {
      const trip = await BirdDB.createTrip({
        name: tripName,
        startTime: new Date(startDateTime).toISOString(),
        endTime: endDateTime ? new Date(endDateTime).toISOString() : null,
        area: area
      });

      // Redirect to trip detail page
      window.location.href = `trip?id=${trip.id}`;
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
      spinner.style.display = 'none';
      createBtn.disabled = false;
    }
  });

  // ===== HELPER FUNCTIONS =====

  async function loadCountries() {
    try {
      const countries = await EBird.getCountries();
      if (countries && countries.length > 0) {
        countrySelect.innerHTML = '<option value="">Select Country...</option>' +
          countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  async function initPickerMap() {
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      // Load Leaflet dynamically
      await loadLeaflet();
    }

    // Get user's current location or use default
    let lat = 0, lng = 0;
    const cached = LocationService.getCached();
    if (cached && cached.lat && cached.lng) {
      lat = cached.lat;
      lng = cached.lng;
    }

    // Create map
    pickerMap = L.map('picker-map').setView([lat, lng], 9);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(pickerMap);

    // Add click handler to place marker
    pickerMap.on('click', (e) => {
      const latlng = e.latlng;

      // Remove existing marker and circle
      if (pickerMarker) {
        pickerMap.removeLayer(pickerMarker);
      }
      if (pickerCircle) {
        pickerMap.removeLayer(pickerCircle);
      }

      // Add new marker
      pickerMarker = L.marker(latlng).addTo(pickerMap);

      // Add radius circle
      const radius = parseFloat(radiusSlider.value);
      pickerCircle = L.circle(latlng, {
        radius: radius * 1000, // Convert km to meters
        color: '#4caf50',
        fillColor: '#4caf50',
        fillOpacity: 0.2
      }).addTo(pickerMap);
    });
  }

  async function loadLeaflet() {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
})();

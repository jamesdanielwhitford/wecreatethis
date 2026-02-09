// Trip Detail Page Handler
(async function() {
  await BirdDB.init();

  // Get trip ID from URL
  const params = new URLSearchParams(window.location.search);
  const tripId = parseInt(params.get('id'));

  if (!tripId) {
    showError('Invalid trip ID');
    return;
  }

  // Load trip data
  let currentTrip = null;
  let tripSightings = [];
  let speciesMap = new Map();

  const loading = document.getElementById('trip-loading');
  const error = document.getElementById('trip-error');
  const content = document.getElementById('trip-content');
  const errorMessage = document.getElementById('error-message');

  const titleEl = document.getElementById('trip-title');
  const dateRangeEl = document.getElementById('trip-date-range');
  const locationEl = document.getElementById('trip-location');
  const sightingCountEl = document.getElementById('trip-sighting-count');
  const birdsListEl = document.getElementById('birds-list');
  const emptyStateEl = document.getElementById('empty-state');

  // Menu elements
  const menuBtn = document.getElementById('menu-btn');
  const menuDropdown = document.getElementById('menu-dropdown');
  const menuEditBtn = document.getElementById('menu-edit-trip');
  const menuEndBtn = document.getElementById('menu-end-trip');
  const menuResumeBtn = document.getElementById('menu-resume-trip');
  const menuDeleteBtn = document.getElementById('menu-delete-trip');

  // Modal elements
  const editModal = document.getElementById('edit-modal');
  const editNameInput = document.getElementById('edit-name');
  const editStartDateInput = document.getElementById('edit-start-date');
  const editStartTimeInput = document.getElementById('edit-start-time');
  const editEndDateInput = document.getElementById('edit-end-date');
  const editEndTimeInput = document.getElementById('edit-end-time');
  const editIncludeTimeCheckbox = document.getElementById('edit-include-time-checkbox');
  const editOngoingCheckbox = document.getElementById('edit-ongoing-checkbox');
  const saveEditBtn = document.getElementById('save-edit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Load trip
  await loadTrip();

  // ===== MENU HANDLERS =====

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    menuDropdown.style.display = 'none';
  });

  menuEditBtn.addEventListener('click', () => {
    openEditModal();
    menuDropdown.style.display = 'none';
  });

  menuEndBtn.addEventListener('click', async () => {
    if (confirm('End this trip now?')) {
      await BirdDB.endTrip(tripId);
      await loadTrip();
    }
    menuDropdown.style.display = 'none';
  });

  menuResumeBtn.addEventListener('click', async () => {
    if (confirm('Resume this trip (clear end time)?')) {
      await BirdDB.updateTrip(tripId, { endTime: null, status: 'active' });
      await loadTrip();
    }
    menuDropdown.style.display = 'none';
  });

  menuDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'flex';
    menuDropdown.style.display = 'none';
  });

  // ===== EDIT MODAL =====

  editIncludeTimeCheckbox.addEventListener('change', () => {
    if (editIncludeTimeCheckbox.checked) {
      editStartTimeInput.style.display = 'block';
      editEndTimeInput.style.display = 'block';
    } else {
      editStartTimeInput.style.display = 'none';
      editEndTimeInput.style.display = 'none';
    }
  });

  editOngoingCheckbox.addEventListener('change', () => {
    editEndDateInput.disabled = editOngoingCheckbox.checked;
    editEndTimeInput.disabled = editOngoingCheckbox.checked;
    if (editOngoingCheckbox.checked) {
      editEndDateInput.value = '';
      editEndTimeInput.value = '';
    }
  });

  saveEditBtn.addEventListener('click', async () => {
    const name = editNameInput.value.trim();
    const startDate = editStartDateInput.value;
    const endDate = editOngoingCheckbox.checked ? null : editEndDateInput.value;

    if (!name) {
      alert('Please enter a trip name');
      return;
    }

    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    // Build datetime strings
    let startDateTime, endDateTime = null;

    if (editIncludeTimeCheckbox.checked) {
      const startTime = editStartTimeInput.value || '00:00';
      startDateTime = `${startDate}T${startTime}:00`;

      if (!editOngoingCheckbox.checked && endDate) {
        const endTime = editEndTimeInput.value || '23:59';
        endDateTime = `${endDate}T${endTime}:00`;
      }
    } else {
      startDateTime = `${startDate}T00:00:00`;

      if (!editOngoingCheckbox.checked && endDate) {
        endDateTime = `${endDate}T23:59:59`;
      }
    }

    if (endDateTime && endDateTime < startDateTime) {
      alert('End date must be after start date');
      return;
    }

    try {
      await BirdDB.updateTrip(tripId, {
        name: name,
        startTime: new Date(startDateTime).toISOString(),
        endTime: endDateTime ? new Date(endDateTime).toISOString() : null
      });

      editModal.style.display = 'none';
      await loadTrip();
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Failed to update trip');
    }
  });

  cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
  });

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.style.display = 'none';
    }
  });

  // ===== DELETE MODAL =====

  confirmDeleteBtn.addEventListener('click', async () => {
    try {
      await BirdDB.deleteTrip(tripId);
      window.location.href = 'index';
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = 'none';
    }
  });

  // ===== HELPER FUNCTIONS =====

  async function loadTrip() {
    loading.style.display = 'block';
    error.style.display = 'none';
    content.style.display = 'none';

    try {
      currentTrip = await BirdDB.getTrip(tripId);

      if (!currentTrip) {
        showError('Trip not found');
        return;
      }

      // Get trip sightings
      tripSightings = await BirdDB.getTripSightings(tripId);

      // Group sightings by species
      speciesMap = new Map();
      for (const sighting of tripSightings) {
        if (!speciesMap.has(sighting.speciesCode)) {
          speciesMap.set(sighting.speciesCode, {
            speciesCode: sighting.speciesCode,
            comName: sighting.comName,
            sciName: sighting.sciName,
            sightings: []
          });
        }
        speciesMap.get(sighting.speciesCode).sightings.push(sighting);
      }

      // Render trip header
      renderTripHeader();

      // Render birds list
      renderBirdsList();

      loading.style.display = 'none';
      content.style.display = 'block';

    } catch (err) {
      console.error('Error loading trip:', err);
      showError('Failed to load trip');
    }
  }

  function renderTripHeader() {
    // Title with status badge
    const statusBadge = currentTrip.status === 'active'
      ? '<span class="status-badge active">Active</span>'
      : '<span class="status-badge ended">Ended</span>';
    titleEl.innerHTML = `${currentTrip.name} ${statusBadge}`;

    // Date range
    const startDate = new Date(currentTrip.startTime);
    const formattedStart = formatDate(startDate);

    let dateRange;
    if (currentTrip.endTime) {
      const endDate = new Date(currentTrip.endTime);
      const formattedEnd = formatDate(endDate);
      dateRange = `${formattedStart} - ${formattedEnd}`;
    } else {
      dateRange = `${formattedStart} - Ongoing`;
    }
    dateRangeEl.textContent = dateRange;

    // Location
    let locationText = '';
    if (currentTrip.area) {
      if (currentTrip.area.type === 'region') {
        locationText = currentTrip.area.region || currentTrip.area.country;
      } else if (currentTrip.area.type === 'map' || currentTrip.area.type === 'precise') {
        const radiusDisplay = currentTrip.area.radius < 1 ? currentTrip.area.radius.toFixed(1) : Math.round(currentTrip.area.radius);
        locationText = `Custom Area (${radiusDisplay}km radius)`;
      }
    } else {
      locationText = 'All locations';
    }
    locationEl.textContent = locationText;

    // Sighting count
    const count = tripSightings.length;
    sightingCountEl.textContent = `${count} sighting${count !== 1 ? 's' : ''} · ${speciesMap.size} species`;

    // Update menu buttons
    if (currentTrip.status === 'active') {
      menuEndBtn.style.display = 'block';
      menuResumeBtn.style.display = 'none';
    } else {
      menuEndBtn.style.display = 'none';
      menuResumeBtn.style.display = 'block';
    }
  }

  function renderBirdsList() {
    if (speciesMap.size === 0) {
      birdsListEl.style.display = 'none';
      emptyStateEl.style.display = 'block';
      return;
    }

    birdsListEl.style.display = 'block';
    emptyStateEl.style.display = 'none';

    // Sort species by most recent sighting
    const speciesArray = Array.from(speciesMap.values());
    speciesArray.sort((a, b) => {
      const aLatest = Math.max(...a.sightings.map(s => new Date(s.date).getTime()));
      const bLatest = Math.max(...b.sightings.map(s => new Date(s.date).getTime()));
      return bLatest - aLatest;
    });

    // Render bird cards
    birdsListEl.innerHTML = speciesArray.map(species => {
      const count = species.sightings.length;
      return `
        <li class="bird-item" data-code="${species.speciesCode}">
          <a href="../bird?code=${species.speciesCode}&from=trip&tripId=${tripId}">
            <div class="bird-thumbnail loading" data-bird="${species.comName}" data-sci="${species.sciName || ''}"></div>
            <div class="bird-info">
              <span class="bird-name">${species.comName}</span>
            </div>
            <div class="bird-badges">
              <span class="sighting-count">${count}</span>
            </div>
          </a>
        </li>
      `;
    }).join('');

    // Load bird images
    loadBirdImages();
  }

  async function loadBirdImages() {
    const thumbnails = birdsListEl.querySelectorAll('.bird-thumbnail');
    for (const thumb of thumbnails) {
      const birdName = thumb.dataset.bird;
      const sciName = thumb.dataset.sci;

      // Try to get cached image
      const cachedUrl = localStorage.getItem(`wiki_img_${birdName}`);
      if (cachedUrl) {
        thumb.style.backgroundImage = `url(${cachedUrl})`;
        thumb.classList.remove('loading');
      } else if (navigator.onLine) {
        // Fetch from Wikipedia if online
        try {
          const imageUrl = await App.fetchWikipediaImage(birdName, sciName);
          if (imageUrl) {
            thumb.style.backgroundImage = `url(${imageUrl})`;
          }
          thumb.classList.remove('loading');
        } catch (error) {
          thumb.classList.remove('loading');
        }
      } else {
        thumb.classList.remove('loading');
      }
    }
  }

  function openEditModal() {
    editNameInput.value = currentTrip.name;

    // Parse start date/time
    const startDate = new Date(currentTrip.startTime);
    editStartDateInput.value = startDate.toISOString().split('T')[0];

    // Check if time component is meaningful (not midnight)
    const hasTime = startDate.getHours() !== 0 || startDate.getMinutes() !== 0;

    if (hasTime) {
      editIncludeTimeCheckbox.checked = true;
      editStartTimeInput.style.display = 'block';
      editEndTimeInput.style.display = 'block';
      editStartTimeInput.value = startDate.toTimeString().slice(0, 5);
    } else {
      editIncludeTimeCheckbox.checked = false;
      editStartTimeInput.style.display = 'none';
      editEndTimeInput.style.display = 'none';
    }

    // Parse end date/time
    if (currentTrip.endTime) {
      const endDate = new Date(currentTrip.endTime);
      editEndDateInput.value = endDate.toISOString().split('T')[0];

      if (hasTime) {
        editEndTimeInput.value = endDate.toTimeString().slice(0, 5);
      }

      editOngoingCheckbox.checked = false;
      editEndDateInput.disabled = false;
      editEndTimeInput.disabled = false;
    } else {
      editEndDateInput.value = '';
      editEndTimeInput.value = '';
      editOngoingCheckbox.checked = true;
      editEndDateInput.disabled = true;
      editEndTimeInput.disabled = true;
    }

    editModal.style.display = 'flex';
  }

  function showError(message) {
    loading.style.display = 'none';
    error.style.display = 'block';
    content.style.display = 'none';
    errorMessage.textContent = message;
  }

  function formatDate(date) {
    const now = new Date();
    const options = { month: 'short', day: 'numeric' };

    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
  }
})();

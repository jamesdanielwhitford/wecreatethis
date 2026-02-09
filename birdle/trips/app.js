// Trips App Module
const TripsApp = {
  currentStatusFilter: 'all',
  currentSort: 'newest',

  init() {
    this.loadPreferences();
    this.bindEvents();
    this.renderTripsList();
  },

  loadPreferences() {
    this.currentStatusFilter = localStorage.getItem('trips_status_filter') || 'all';
    this.currentSort = localStorage.getItem('trips_sort') || 'newest';

    // Apply to UI
    const statusFilter = document.getElementById('status-filter');
    const sortType = document.getElementById('sort-type');
    if (statusFilter) statusFilter.value = this.currentStatusFilter;
    if (sortType) sortType.value = this.currentSort;
  },

  bindEvents() {
    const statusFilter = document.getElementById('status-filter');
    const sortType = document.getElementById('sort-type');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentStatusFilter = statusFilter.value;
        localStorage.setItem('trips_status_filter', this.currentStatusFilter);
        this.renderTripsList();
      });
    }

    if (sortType) {
      sortType.addEventListener('change', () => {
        this.currentSort = sortType.value;
        localStorage.setItem('trips_sort', this.currentSort);
        this.renderTripsList();
      });
    }
  },

  // Render the trips list page
  async renderTripsList() {
    const list = document.getElementById('trips-list');
    if (!list) return;

    let trips = await BirdDB.getAllTrips();

    // Apply status filter
    if (this.currentStatusFilter !== 'all') {
      trips = trips.filter(trip => trip.status === this.currentStatusFilter);
    }

    if (trips.length === 0) {
      if (this.currentStatusFilter !== 'all') {
        list.innerHTML = `<li class="empty">No ${this.currentStatusFilter} trips found.</li>`;
      } else {
        list.innerHTML = '<li class="empty">No trips yet. Tap + to create one!</li>';
      }
      return;
    }

    // Get sighting counts for sorting
    const tripsWithCounts = await Promise.all(trips.map(async (trip) => {
      const sightings = await BirdDB.getTripSightings(trip.id);
      return {
        ...trip,
        sightingCount: sightings.length
      };
    }));

    // Apply sorting
    if (this.currentSort === 'newest') {
      tripsWithCounts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (this.currentSort === 'oldest') {
      tripsWithCounts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (this.currentSort === 'most-sightings') {
      tripsWithCounts.sort((a, b) => b.sightingCount - a.sightingCount);
    }

    // Render each trip as a card
    const tripCards = tripsWithCounts.map((trip) => {
      const sightingCount = trip.sightingCount;

      // Format date range
      const startDate = new Date(trip.startTime);
      const formattedStart = this.formatDate(startDate);

      let dateRange;
      if (trip.endTime) {
        const endDate = new Date(trip.endTime);
        const formattedEnd = this.formatDate(endDate);
        dateRange = `${formattedStart} - ${formattedEnd}`;
      } else {
        dateRange = `${formattedStart} - Ongoing`;
      }

      // Format location info
      let locationInfo = '';
      if (trip.area) {
        if (trip.area.type === 'region') {
          locationInfo = trip.area.region || trip.area.country;
        } else if (trip.area.type === 'map' || trip.area.type === 'precise') {
          const radiusDisplay = trip.area.radius < 1 ? trip.area.radius.toFixed(1) : Math.round(trip.area.radius);
          locationInfo = `Custom Area (${radiusDisplay}km)`;
        }
      } else {
        locationInfo = 'All locations';
      }

      // Status badge
      const statusBadge = trip.status === 'active'
        ? '<span class="status-badge active">Active</span>'
        : '<span class="status-badge ended">Ended</span>';

      return `
        <li>
          <a href="trip?id=${trip.id}">
            <span class="game-title">${trip.name} ${statusBadge}</span>
            <span class="game-info">${dateRange}</span>
            <span class="game-info">${locationInfo} · ${sightingCount} sighting${sightingCount !== 1 ? 's' : ''}</span>
          </a>
        </li>
      `;
    });

    list.innerHTML = tripCards.join('');
  },

  // Format date as "Jan 1" or "Jan 1, 2024" if not current year
  formatDate(date) {
    const now = new Date();
    const options = { month: 'short', day: 'numeric' };

    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
  }
};

// Export for global use
window.TripsApp = TripsApp;

// Birdle Life List Module

const LifeList = {
  async init() {
    await BirdDB.init();
    await this.renderLifeList();
    this.bindEvents();
  },

  async renderLifeList() {
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const sections = document.getElementById('life-sections');

    // Get all sightings
    const sightings = await BirdDB.getAllSightings();

    if (sightings.length === 0) {
      loading.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    // Group by species and collect sighting data
    const speciesMap = new Map();
    for (const sighting of sightings) {
      if (!speciesMap.has(sighting.speciesCode)) {
        speciesMap.set(sighting.speciesCode, {
          speciesCode: sighting.speciesCode,
          comName: sighting.comName,
          sciName: sighting.sciName,
          sightings: [],
          regions: new Set()
        });
      }
      const species = speciesMap.get(sighting.speciesCode);
      species.sightings.push(sighting);
      species.regions.add(sighting.regionCode);
    }

    // Group birds by continent and region
    const structure = {};

    for (const [code, data] of speciesMap) {
      const bird = await BirdDB.getBird(code);
      const continent = bird?.continent || BirdDB.getContinent([...data.regions][0]) || 'Other';

      if (!structure[continent]) {
        structure[continent] = {};
      }

      // Use the most recent sighting's region for grouping
      const sortedSightings = [...data.sightings].sort((a, b) => b.date.localeCompare(a.date));
      const primaryRegion = sortedSightings[0].regionName || sortedSightings[0].regionCode;

      if (!structure[continent][primaryRegion]) {
        structure[continent][primaryRegion] = [];
      }

      structure[continent][primaryRegion].push({
        speciesCode: code,
        comName: data.comName,
        sciName: data.sciName,
        count: data.sightings.length
      });
    }

    // Render
    loading.style.display = 'none';
    document.getElementById('life-total').textContent = `${speciesMap.size} species`;

    // Sort continents
    const continentOrder = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania', 'Other'];
    const sortedContinents = Object.keys(structure).sort((a, b) =>
      continentOrder.indexOf(a) - continentOrder.indexOf(b)
    );

    let html = '';
    for (const continent of sortedContinents) {
      const regions = structure[continent];
      let continentTotal = 0;
      Object.values(regions).forEach(birds => continentTotal += birds.length);

      html += `
        <div class="continent-section">
          <div class="continent-title" data-continent="${continent}">
            <span class="toggle-arrow">▼</span>
            <span class="continent-name">${continent}</span>
            <span class="continent-count">(${continentTotal})</span>
          </div>
          <div class="continent-content">
      `;

      // Sort regions alphabetically
      const sortedRegions = Object.keys(regions).sort();
      for (const region of sortedRegions) {
        const birds = regions[region];
        birds.sort((a, b) => a.comName.localeCompare(b.comName));

        html += `
          <div class="region-section">
            <div class="region-title" data-region="${region}">
              <span class="toggle-arrow">▼</span>
              <span class="region-name">${region}</span>
              <span class="region-count">(${birds.length})</span>
            </div>
            <ul class="bird-list region-content">
        `;

        for (const bird of birds) {
          html += `
            <li class="bird-item life-bird">
              <a href="bird?code=${bird.speciesCode}">
                <span class="bird-name">${bird.comName}</span>
                <span class="sighting-count">${bird.count}</span>
              </a>
            </li>
          `;
        }

        html += `</ul></div>`;
      }

      html += `</div></div>`;
    }

    sections.innerHTML = html;
    this.bindListEvents();
  },

  bindEvents() {
    // Modal close
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      document.getElementById('bird-modal').style.display = 'none';
    });

    // Close modal on backdrop click
    document.getElementById('bird-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'bird-modal') {
        document.getElementById('bird-modal').style.display = 'none';
      }
    });
  },

  bindListEvents() {
    // Continent collapse toggle
    document.querySelectorAll('.continent-title').forEach(title => {
      title.addEventListener('click', () => {
        title.classList.toggle('collapsed');
      });
    });

    // Region collapse toggle
    document.querySelectorAll('.region-title').forEach(title => {
      title.addEventListener('click', (e) => {
        e.stopPropagation();
        title.classList.toggle('collapsed');
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => LifeList.init());

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

    // Group birds by continent, country, and region
    const structure = {};

    // Fetch countries list once (not inside the loop)
    const countries = await EBird.getCountries();

    for (const [code, data] of speciesMap) {
      const bird = await BirdDB.getBird(code);
      const continent = bird?.continent || BirdDB.getContinent([...data.regions][0]) || 'Other';

      if (!structure[continent]) {
        structure[continent] = {};
      }

      // Use the most recent sighting's region for grouping
      const sortedSightings = [...data.sightings].sort((a, b) => b.date.localeCompare(a.date));
      const sighting = sortedSightings[0];

      // Extract country from regionCode (e.g., "ZA" from "ZA-GT", or just "ZA")
      const regionCode = sighting.regionCode || '';
      const countryCode = regionCode.includes('-') ? regionCode.split('-')[0] : regionCode;

      // Get country name - try to look it up or derive from sighting
      let countryName = countryCode;
      // Check if sighting has country info stored
      if (sighting.countryName) {
        countryName = sighting.countryName;
      } else {
        // Use pre-fetched countries list
        const country = countries.find(c => c.code === countryCode);
        if (country) countryName = country.name;
      }

      // Get subregion name (state/province) if it's a state-level code
      const subRegion = regionCode.includes('-')
        ? (sighting.regionName || regionCode)
        : null;

      if (!structure[continent][countryName]) {
        structure[continent][countryName] = {};
      }

      // If we have a subregion, nest under it; otherwise put directly under country
      const regionKey = subRegion || '_country';
      if (!structure[continent][countryName][regionKey]) {
        structure[continent][countryName][regionKey] = [];
      }

      structure[continent][countryName][regionKey].push({
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
      const countries = structure[continent];
      let continentTotal = 0;
      for (const country of Object.values(countries)) {
        for (const birds of Object.values(country)) {
          continentTotal += birds.length;
        }
      }

      html += `
        <div class="continent-section">
          <div class="continent-title" data-continent="${continent}">
            <span class="toggle-arrow">▼</span>
            <span class="continent-name">${continent}</span>
            <span class="continent-count">(${continentTotal})</span>
          </div>
          <div class="continent-content">
      `;

      // Sort countries alphabetically
      const sortedCountries = Object.keys(countries).sort();
      for (const country of sortedCountries) {
        const regions = countries[country];
        let countryTotal = 0;
        for (const birds of Object.values(regions)) {
          countryTotal += birds.length;
        }

        html += `
          <div class="country-section">
            <div class="country-title" data-country="${country}">
              <span class="toggle-arrow">▼</span>
              <span class="country-name">${country}</span>
              <span class="country-count">(${countryTotal})</span>
            </div>
            <div class="country-content">
        `;

        // Sort regions alphabetically, but put _country (country-level sightings) first
        const sortedRegions = Object.keys(regions).sort((a, b) => {
          if (a === '_country') return -1;
          if (b === '_country') return 1;
          return a.localeCompare(b);
        });

        for (const region of sortedRegions) {
          const birds = regions[region];
          birds.sort((a, b) => a.comName.localeCompare(b.comName));

          // For _country, show birds directly under country without sub-header
          if (region === '_country') {
            html += `<ul class="bird-list country-birds">`;
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
            html += `</ul>`;
          } else {
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
        }

        html += `</div></div>`;
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

    // Country collapse toggle
    document.querySelectorAll('.country-title').forEach(title => {
      title.addEventListener('click', (e) => {
        e.stopPropagation();
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

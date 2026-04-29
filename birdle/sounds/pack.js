const PackApp = {
  selected: new Set(),

  async init() {
    // Run App's DB setup then boot the search page logic directly
    if (typeof BirdDB !== 'undefined') {
      await BirdDB.init();
      await App.cleanupRemovedFeatures();
    }
    App.checkVersionAndReload();
    await App.initSearch();

    // Wrap renderBirdList so every re-render re-applies our selection layer
    const original = App.renderBirdList.bind(App);
    App.renderBirdList = async (...args) => {
      await original(...args);
      this.applySelectionLayer();
    };
    this.applySelectionLayer();

    this.bindCTA();
  },

  applySelectionLayer() {
    const list = document.getElementById('bird-list');
    if (!list) return;

    list.querySelectorAll('.bird-item').forEach(item => {
      const code = item.dataset.code;
      if (!code || item.dataset.packBound) return;
      item.dataset.packBound = '1';

      if (this.selected.has(code)) {
        item.classList.add('selected');
      }

      const check = document.createElement('div');
      check.className = 'bird-select-check';
      check.textContent = this.selected.has(code) ? '✓' : '';
      item.appendChild(check);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.selected.has(code)) {
          this.selected.delete(code);
          item.classList.remove('selected');
          check.textContent = '';
        } else {
          this.selected.add(code);
          item.classList.add('selected');
          check.textContent = '✓';
        }
        this.updateCTA();
      }, { capture: true });
    });
  },

  bindCTA() {
    document.getElementById('pack-start-btn').addEventListener('click', () => {
      if (this.selected.size === 0) return;
      const set = App.birds
        .filter(b => this.selected.has(b.speciesCode))
        .map(b => ({ speciesCode: b.speciesCode, comName: b.comName, sciName: b.sciName || '' }));
      localStorage.setItem('sounds-pack', JSON.stringify(set));
      window.location.href = 'index?mode=pack';
    });
  },

  updateCTA() {
    const btn = document.getElementById('pack-start-btn');
    const n = this.selected.size;
    if (n === 0) {
      btn.textContent = 'Select birds to start';
      btn.disabled = true;
    } else {
      btn.textContent = `Practice with ${n} bird${n === 1 ? '' : 's'}`;
      btn.disabled = false;
    }
  }
};

window.PackApp = PackApp;

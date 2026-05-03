const INAT_API_BASE_PV = 'https://api.inaturalist.org/v1';

const PackViewApp = {
  pack: null,
  currentAudio: null,
  currentBtn: null,

  async init() {
    App.checkVersionAndReload();

    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    if (!id) {
      document.getElementById('empty-msg').style.display = 'block';
      return;
    }

    this.pack = await BirdDB.getSoundPack(id);

    if (!this.pack || !this.pack.species || this.pack.species.length === 0) {
      document.getElementById('empty-msg').style.display = 'block';
      return;
    }

    document.title = `${this.pack.name} - Bird Sounds`;
    document.getElementById('pack-title').textContent = this.pack.name;
    document.getElementById('location-label').textContent =
      `${this.pack.species.length} species within 50 km · last 30 days`;

    this.render();
  },

  render() {
    const list = document.getElementById('sounds-list');

    list.innerHTML = this.pack.species.map((s, i) => `
      <li class="sound-item" data-index="${i}">
        <div class="sound-thumb loading" data-name="${this.escHtml(s.comName)}" data-sci="${this.escHtml(s.sciName)}"></div>
        <div class="sound-info">
          <div class="sound-name">${this.escHtml(s.comName)}</div>
          <div class="sound-sci">${this.escHtml(s.sciName)}</div>
          <div class="sound-count">${s.count} observation${s.count === 1 ? '' : 's'}</div>
        </div>
        <button class="play-sound-btn" data-index="${i}" aria-label="Play ${this.escHtml(s.comName)}">&#9654;</button>
      </li>
    `).join('');

    list.querySelectorAll('.play-sound-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleSound(parseInt(btn.dataset.index), btn));
    });

    this.loadThumbnails(list);
  },

  async toggleSound(index, btn) {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
      const prevBtn = this.currentBtn;
      this.currentBtn = null;
      if (prevBtn) {
        prevBtn.classList.remove('playing');
        prevBtn.innerHTML = '&#9654;';
      }
      if (prevBtn === btn) return;
    }

    const bird = this.pack.species[index];
    const audioUrl = bird.soundUrl || await this.fetchSoundUrl(bird);

    if (!audioUrl) {
      btn.title = 'No sound found';
      return;
    }

    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    this.currentBtn = btn;

    btn.classList.add('playing');
    btn.innerHTML = '&#9646;&#9646;';

    audio.play().catch(() => {
      btn.classList.remove('playing');
      btn.innerHTML = '&#9654;';
    });

    audio.onended = () => {
      btn.classList.remove('playing');
      btn.innerHTML = '&#9654;';
      if (this.currentAudio === audio) {
        this.currentAudio = null;
        this.currentBtn = null;
      }
    };
  },

  async fetchSoundUrl(bird) {
    const cacheKey = `inat-sound-url-${bird.taxonId || bird.sciName}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
      const name = encodeURIComponent(bird.sciName);
      const url = `${INAT_API_BASE_PV}/observations?taxon_name=${name}&sounds=true&quality_grade=research&per_page=5&order_by=votes&order=desc`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      for (const obs of (data.results || [])) {
        for (const sound of (obs.sounds || [])) {
          if (sound.file_url) {
            localStorage.setItem(cacheKey, sound.file_url);
            return sound.file_url;
          }
        }
      }
    } catch (e) {
      console.warn('[PackView] Sound fetch failed for:', bird.comName, e);
    }
    return null;
  },

  loadThumbnails(listEl) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        const thumb = entry.target;
        observer.unobserve(thumb);

        const comName = thumb.dataset.name;
        const sciName = thumb.dataset.sci;

        let imageUrl = await App.fetchWikipediaImage(comName);
        if (!imageUrl && sciName) imageUrl = await App.fetchWikipediaImage(sciName);

        thumb.classList.remove('loading');
        if (imageUrl) {
          const img = document.createElement('img');
          img.alt = comName;
          img.src = imageUrl;
          img.onerror = () => img.remove();
          thumb.appendChild(img);
        }
      });
    }, { rootMargin: '80px' });

    listEl.querySelectorAll('.sound-thumb').forEach(t => observer.observe(t));
  },

  escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.PackViewApp = PackViewApp;

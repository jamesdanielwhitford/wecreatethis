const SoundsIndex = {
  packs: [],
  renamingId: null,

  async init() {
    App.checkVersionAndReload();
    await this.render();
    this.bindRenameModal();
  },

  async render() {
    this.packs = await BirdDB.getAllSoundPacks();
    const list = document.getElementById('packs-list');
    const emptyState = document.getElementById('empty-state');

    if (this.packs.length === 0) {
      list.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    list.innerHTML = this.packs.map(pack => `
      <li class="pack-item">
        <a class="pack-main" href="pack-view?id=${pack.id}">
          <div class="pack-name">${this.escHtml(pack.name)}</div>
          <div class="pack-meta">${pack.species.length} birds &middot; ${this.formatDate(pack.createdAt)}</div>
        </a>
        <div class="pack-actions">
          <button class="icon-btn rename-btn" data-id="${pack.id}" data-name="${this.escHtml(pack.name)}" title="Rename">&#9998;</button>
          <button class="icon-btn danger delete-btn" data-id="${pack.id}" title="Delete">&#128465;</button>
        </div>
      </li>
    `).join('');

    list.querySelectorAll('.rename-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openRename(parseInt(btn.dataset.id), btn.dataset.name));
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deletePack(parseInt(btn.dataset.id)));
    });
  },

  async deletePack(id) {
    const pack = this.packs.find(p => p.id === id);
    if (!pack) return;
    if (!confirm(`Delete "${pack.name}"?`)) return;
    await BirdDB.deleteSoundPack(id);
    await this.render();
  },

  openRename(id, currentName) {
    this.renamingId = id;
    document.getElementById('rename-input').value = currentName;
    document.getElementById('rename-modal').classList.add('open');
    document.getElementById('rename-input').select();
  },

  bindRenameModal() {
    document.getElementById('rename-cancel').addEventListener('click', () => {
      document.getElementById('rename-modal').classList.remove('open');
    });

    document.getElementById('rename-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('rename-modal')) {
        document.getElementById('rename-modal').classList.remove('open');
      }
    });

    document.getElementById('rename-save').addEventListener('click', () => this.saveRename());

    document.getElementById('rename-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveRename();
      if (e.key === 'Escape') document.getElementById('rename-modal').classList.remove('open');
    });
  },

  async saveRename() {
    const name = document.getElementById('rename-input').value.trim();
    if (!name || !this.renamingId) return;
    await BirdDB.renameSoundPack(this.renamingId, name);
    document.getElementById('rename-modal').classList.remove('open');
    this.renamingId = null;
    await this.render();
  },

  formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  },

  escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.SoundsIndex = SoundsIndex;

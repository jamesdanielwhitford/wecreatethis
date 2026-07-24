// Shared header + settings menu modal, used by every page. Pages own their
// own menu body content; this just handles the header chrome and open/close.
const AppMenu = {
  open() {
    document.getElementById('app-menu-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('app-menu-overlay').classList.add('hidden');
  },
  // Injects the shared header (Home link + title + settings button) into
  // #app-header-slot, and the shared modal shell into #app-menu-slot. Pages
  // fill #app-menu-body with their own settings rows before calling this.
  mount(title) {
    const headerSlot = document.getElementById('app-header-slot');
    if (headerSlot) {
      headerSlot.innerHTML = `
        <div class="header-left">
          <a href="index" class="menu-btn" id="app-home-btn" aria-label="Go home">&#127968;</a>
          <h1>${title}</h1>
        </div>
        <button class="menu-btn" id="app-menu-btn" aria-label="Open settings">&#9776;</button>
      `;
      document.getElementById('app-menu-btn').addEventListener('click', () => this.open());
    }

    const menuSlot = document.getElementById('app-menu-slot');
    if (menuSlot) {
      menuSlot.innerHTML = `
        <div class="modal-overlay hidden" id="app-menu-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Settings</h2>
              <button class="modal-close-btn" id="app-menu-close-btn">&times;</button>
            </div>
            <div id="app-menu-body"></div>
          </div>
        </div>
      `;
      document.getElementById('app-menu-close-btn').addEventListener('click', () => this.close());
      document.getElementById('app-menu-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'app-menu-overlay') this.close();
      });
    }
  }
};

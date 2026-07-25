// Shared header + settings menu modal, used by every page. Pages own their
// own menu body content; this just handles the header chrome, theme toggle,
// and open/close.
const THEME_KEY = 'bird-bingo-theme';

const AppMenu = {
  // Explicit user choice, if any ('dark' | 'light' | null). Falls back to
  // the OS preference (and defaults to dark if that can't be read) until
  // the user picks a theme in Settings, at which point it's pinned.
  getExplicitTheme() {
    return localStorage.getItem(THEME_KEY);
  },

  getTheme() {
    const explicit = this.getExplicitTheme();
    if (explicit) return explicit;
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  },

  // Applies the effective theme to <html> immediately - called at the top of
  // every page's script, before AppMenu.mount(), so there's no flash of the
  // wrong theme while the rest of the page loads.
  applyStoredTheme() {
    document.documentElement.setAttribute('data-theme', this.getTheme());
  },

  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  open() {
    document.getElementById('app-menu-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('app-menu-overlay').classList.add('hidden');
  },

  renderThemeRow() {
    const row = document.getElementById('app-theme-row');
    if (!row) return;
    const isLight = this.getTheme() === 'light';
    row.innerHTML = `
      <div class="menu-section">
        <div class="menu-section-title">Appearance</div>
        <div class="toggle-group">
          <button class="toggle-btn${!isLight ? ' active' : ''}" id="theme-dark-btn">Dark</button>
          <button class="toggle-btn${isLight ? ' active' : ''}" id="theme-light-btn">Light</button>
        </div>
      </div>
    `;
    document.getElementById('theme-dark-btn').addEventListener('click', () => {
      this.setTheme('dark');
      this.renderThemeRow();
    });
    document.getElementById('theme-light-btn').addEventListener('click', () => {
      this.setTheme('light');
      this.renderThemeRow();
    });
  },

  // Injects the shared header (Home link + title + settings button) into
  // #app-header-slot, and the shared modal shell into #app-menu-slot. Pages
  // fill #app-menu-body with their own settings rows before calling this.
  // `homeHref` defaults to this app's own homepage ("index"); index.html
  // itself passes "https://wecreatethis.com" so tapping Home from the app's
  // own homepage leaves the app rather than reloading it.
  mount(title, homeHref) {
    const headerSlot = document.getElementById('app-header-slot');
    if (headerSlot) {
      headerSlot.innerHTML = `
        <div class="header-left">
          <a href="${homeHref || 'index'}" class="menu-btn" id="app-home-btn" aria-label="Go home">
            <img class="app-icon-img" src="icon-192.png" alt="">
          </a>
          <h1>${title}</h1>
        </div>
        <button class="menu-btn" id="app-menu-btn" aria-label="Open settings">${Icons.svg('menu')}</button>
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
              <button class="modal-close-btn" id="app-menu-close-btn">${Icons.svg('x')}</button>
            </div>
            <div id="app-menu-body"></div>
            <div id="app-theme-row"></div>
          </div>
        </div>
      `;
      document.getElementById('app-menu-close-btn').addEventListener('click', () => this.close());
      document.getElementById('app-menu-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'app-menu-overlay') this.close();
      });
      this.renderThemeRow();
    }
  }
};

// Inlined Lucide icons (ISC licensed, https://lucide.dev), stroke="currentColor"
// so every icon follows the surrounding text/button color automatically in
// both themes. No external requests, no icon font. Same convention as
// bird-bingo/icons.js.
const Icons = {
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',

  // Returns an inline <svg>. `cls` adds extra classes on top of the base "icon" class,
  // which styles size (width/height: 1em by default so it scales with font-size).
  svg(name, cls) {
    const paths = this[name];
    if (!paths) return '';
    const classAttr = cls ? `icon ${cls}` : 'icon';
    return `<svg class="${classAttr}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }
};

// Globe emoji, one per world region, standard Unicode convention (used for
// "location" style links). Same call shape as Icons.svg(name, cls) so bio
// links can mix emoji and inlined-SVG icons - sized via CSS font-size
// (.emoji-icon) rather than width/height, since an emoji glyph has no
// intrinsic box to set those on.
const Globes = {
  africaEurope: '🌍',
  americas: '🌎',
  asiaAustralia: '🌏',

  emoji(region, cls) {
    const glyph = this[region];
    if (!glyph) return '';
    const classAttr = cls ? `emoji-icon ${cls}` : 'emoji-icon';
    return `<span class="${classAttr}" aria-hidden="true">${glyph}</span>`;
  }
};

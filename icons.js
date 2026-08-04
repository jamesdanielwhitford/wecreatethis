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

  // Returns an inline <svg>. `cls` adds extra classes on top of the base "icon" class,
  // which styles size (width/height: 1em by default so it scales with font-size).
  svg(name, cls) {
    const paths = this[name];
    if (!paths) return '';
    const classAttr = cls ? `icon ${cls}` : 'icon';
    return `<svg class="${classAttr}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }
};

// Two-letter initials avatar, used as the profile-circle button content
// until a real photo is added.
function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

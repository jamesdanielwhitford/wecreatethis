// Generates icon-192.png and icon-512.png using canvas
// Run with: node make-icon.js (requires canvas package)
// Or just open icon.svg in a browser and export

const fs = require('fs');

// Generate SVG icon - dark background, white minimal open book / text lines
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#080808"/>
  <!-- Three text lines, slightly left-weighted to suggest a book page -->
  <rect x="22" y="30" width="56" height="5" rx="2" fill="#e8e8e8"/>
  <rect x="22" y="44" width="56" height="5" rx="2" fill="#e8e8e8"/>
  <rect x="22" y="58" width="40" height="5" rx="2" fill="#e8e8e8"/>
  <!-- Center spine line -->
  <rect x="49" y="26" width="2" height="48" rx="1" fill="#555"/>
</svg>`;

fs.writeFileSync('./icon.svg', svg(512));
console.log('icon.svg written. Convert to PNG using a tool like Inkscape, rsvg-convert, or sharp.');
console.log('  rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png');
console.log('  rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png');

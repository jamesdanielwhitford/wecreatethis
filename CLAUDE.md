# We Create This - Multi-Project Repository

This repository contains multiple offline-first web applications, each living in its own folder with dedicated documentation.

## Projects

- **birdle/** - Bird spotting game using eBird API (Bird Bingo). See [birdle/CLAUDE.md](birdle/CLAUDE.md) for details.
- **beautiful-mind/** - Offline notes app with text, image, video, and audio support. E-reader themed with dual storage (File System API/IndexedDB). See [beautiful-mind/CLAUDE.md](beautiful-mind/CLAUDE.md) for details.

## Shared Conventions

### Technology Stack
- **Vanilla JavaScript** - No frameworks, pure JS for all projects
- **Progressive Web Apps (PWA)** - All apps are installable and offline-capable
- **IndexedDB** - Local data storage for offline functionality
- **Service Workers** - Each project has its own `sw.js` for caching and offline support

### Project Structure
Each project folder contains:
- `sw.js` - Service worker with versioned cache strategy
- `manifest.json` - PWA manifest
- `icon-192.png` and `icon-512.png` - App icons
- `CLAUDE.md` - Project-specific documentation
- HTML/CSS/JS files for the app

### Offline-First Design
- **Network-first with cache fallback** for dynamic data
- **Cache-first for static assets** (HTML, CSS, JS, images)
- **User-controlled caching** where applicable
- **IndexedDB for persistent local data**
- All apps should work completely offline after first load

### Version Management
- Use `dev/bump-version.sh` to increment version numbers across cache names
- Service worker cache format: `projectname-vN`
- Keep versions synchronized across sw.js, manifest.json, and HTML files

### Code Style
- Simple, readable vanilla JS
- ES6+ features where appropriate
- Clear variable names and comments for complex logic
- Modular design with separate files for concerns (db.js, api.js, etc.)

---

For project-specific details, architecture, and features, see the CLAUDE.md file in each project folder.

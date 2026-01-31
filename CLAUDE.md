# We Create This - Multi-Project Repository

This repository contains multiple offline-first web applications, each living in its own folder with dedicated documentation.

## Projects

- **birdle/** - Bird spotting game using eBird API (Bird Bingo). See [birdle/CLAUDE.md](birdle/CLAUDE.md) for details.
- **beautiful-mind/** - Offline notes app with text, image, video, and audio support. E-reader themed with dual storage (File System API/IndexedDB). See [beautiful-mind/CLAUDE.md](beautiful-mind/CLAUDE.md) for details.
- **tarot/** - Tarot card reading app. See [tarot/CLAUDE.md](tarot/CLAUDE.md) for details.

## Adding New Apps to the Homepage

The root `index.html` displays all apps as rounded square icon buttons. To add a new app:

1. **Create the app directory** with required PWA files:
   - `manifest.json` - PWA manifest
   - `icon-192.png` and `icon-512.png` - App icons (preferably square)
   - `sw.js` - Service worker
   - `CLAUDE.md` - Project documentation

2. **Add a new app item to `index.html`** in the `.button-container` div:
   ```html
   <div class="app-item">
     <a href="/your-app/" class="app-btn" style="background-image: url('/your-app/icon-192.png');"></a>
     <span class="app-name">Your App Name</span>
   </div>
   ```

3. **Icon requirements:**
   - The icon should be square (1:1 aspect ratio)
   - Use `icon-192.png` as the background image source
   - If no icon exists, use an appropriate fallback image from the app

4. **Layout behavior:**
   - Buttons are 80x80px on mobile, 100x100px on larger screens
   - Buttons wrap automatically to multiple rows as needed
   - All buttons remain perfectly square regardless of screen size
   - Centered layout with responsive gaps (24px mobile, 32px desktop)

5. **Update this CLAUDE.md** to list the new project in the Projects section above.

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

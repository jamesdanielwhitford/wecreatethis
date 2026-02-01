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

### Offline-First Design Philosophy

**All apps in this repository MUST work completely offline after first load.** This is a core requirement, not optional.

### Service Worker Caching Strategy

All service workers use a simplified **canonical URL normalization** approach to handle caching and offline support:

**Canonical Format:** Extensionless URLs (e.g., `/tarot/reading` instead of `/tarot/reading.html`)

**How it works:**
1. **URL Normalization Function** - Strips `.html` extensions and normalizes `/index` → `/` before caching or matching
2. **Single Cache Entry** - Each page is cached once under its normalized URL
3. **Query Params Ignored** - `/tarot/reading?id=123` matches the same cache as `/tarot/reading`
4. **Works with All URL Formats** - Handles requests for `.html` URLs, extensionless URLs, and Cloudflare redirects transparently

**Example:**
```javascript
function normalizeUrl(url) {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove .html extension
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }

  // Normalize /app/index -> /app/
  if (path.endsWith('/index')) {
    path = path.slice(0, -5);
  }

  return urlObj.origin + path;
}
```

**Benefits:**
- Drastically simpler (~5 lines vs ~50 lines of matching logic)
- No cache misses on pages that are cached
- Works seamlessly with Cloudflare Pages redirects
- Consistent behavior across all apps

### Current Service Worker Versions
- **Birdle**: v107
- **Tarot**: v29
- **Beautiful Mind**: v8
- **Homepage**: v9

### Version Management
- Service worker cache format: `projectname-vN`
- **NO version numbers in HTML script tags** - Service workers handle all cache versioning
- Bump service worker `CACHE_NAME` version when making changes
- Service worker installation automatically caches all assets fresh

### Code Style
- Simple, readable vanilla JS
- ES6+ features where appropriate
- Clear variable names and comments for complex logic
- Modular design with separate files for concerns (db.js, api.js, etc.)

---

For project-specific details, architecture, and features, see the CLAUDE.md file in each project folder.

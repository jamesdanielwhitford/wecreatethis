# We Create This - Multi-Project Repository

This repository contains multiple offline-first web applications, each living in its own folder with dedicated documentation.

## Projects

- **birdle/** - Bird spotting game using eBird API (Bird Bingo). See [birdle/CLAUDE.md](birdle/CLAUDE.md) for details.
- **beautiful-mind/** - Offline notes app with text, image, video, and audio support. E-reader themed with dual storage (File System API/IndexedDB). See [beautiful-mind/CLAUDE.md](beautiful-mind/CLAUDE.md) for details.
- **tarot/** - Tarot card reading app. See [tarot/CLAUDE.md](tarot/CLAUDE.md) for details.
- **hardle/** - ⚠️ **IN TESTING** - Word guessing game (Hardle: daily word, Randle: random word). Vanilla JS rebuild of React version. See [hardle/CLAUDE.md](hardle/CLAUDE.md) for details and known issues.
- **pomodoro/** - Productivity timer with work and break sessions. Customizable durations, audio notifications, and session tracking. See [pomodoro/CLAUDE.md](pomodoro/CLAUDE.md) for details.
- **git-notes/** - Note-taking app with GitHub-inspired dark theme. Auto-save, grid layout, and offline-first design. See [git-notes/CLAUDE.md](git-notes/CLAUDE.md) for details.

## GitNotes Folder (Development Notes)

**⚠️ DO NOT CONFUSE WITH git-notes APP**

The **GitNotes/** folder (capital G, capital N) is a separate directory used for storing development notes, prompts, and task instructions. This is NOT the git-notes app.

**Purpose:**
- Contains user-written notes, feature requests, and development prompts for each project
- Organized by project subdirectories (e.g., `GitNotes/birdle/`, `GitNotes/Chessle/`)
- Files are plain text instructions for Claude to reference when working on features

**Usage:**
- When asked to check notes for a project, look in `GitNotes/[project-name]/`
- These notes contain feature ideas, bug reports, and implementation instructions
- Treat these as source material for understanding user requirements and planned work

**Example Structure:**
```
GitNotes/
├── birdle/
│   └── trips           # Feature request for trips functionality
├── Chessle/
│   └── Prompt.md      # Chess game feature notes
└── test/
    └── test           # Test notes
```

**Key Difference:**
- **GitNotes/** = Development notes and prompts (not part of any app)
- **git-notes/** = Actual deployed note-taking web app

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
- **Birdle**: v119
- **Tarot**: v31
- **Beautiful Mind**: v10
- **Pomodoro**: v1
- **Homepage**: v12

### Version Management
- Service worker cache format: `projectname-vN`
- **NO version numbers in HTML script tags** - Service workers handle all cache versioning
- Bump service worker `CACHE_NAME` version when making changes
- Service worker installation automatically caches all assets fresh

### IMPORTANT: Service Worker Cache Rules

**When adding ANY new HTML page or JS file to ANY project, you MUST also add it to the `ASSETS` array in that project's `sw.js`.** Otherwise the page will not be available offline.

- HTML pages go in as extensionless normalized paths (e.g., `/birdle/trips/new` not `/birdle/trips/new.html`)
- JS files go in with their extension (e.g., `/birdle/trips/app.js`)
- Always bump the `CACHE_NAME` version when changing cached assets
- This applies to all new pages, scripts, and static assets — no exceptions

### Code Style
- Simple, readable vanilla JS
- ES6+ features where appropriate
- Clear variable names and comments for complex logic
- Modular design with separate files for concerns (db.js, api.js, etc.)

## "Push to Prod" Workflow

When the user says **"push to prod"**, follow these steps in order:

1. **Update versions** — Bump `CACHE_NAME` in the relevant `sw.js` and `APP_VERSION` in `app.js` (if applicable). Make sure any new pages/assets are in the SW `ASSETS` array.
2. **Commit on `dev`** — Stage and commit all changes on the `dev` branch.
3. **Push `dev`** — `git push origin dev`
4. **Merge into `main`** — `git checkout main && git pull origin main && git merge dev`
5. **Push `main`** — `git push origin main`
6. **Switch back to `dev`** — `git checkout dev`

This deploys the latest `dev` changes to production (Cloudflare Pages serves from `main`).

---

## Cross-Domain Data Migration

The site migrated from `wecreatethis.pages.dev` to `wecreatethis.com`. Since IndexedDB is origin-specific, user data doesn't automatically transfer between domains.

### Manual Migration Page (⚠️ Still Debugging)

**Status:** Migration system is functional but experiencing some edge case issues with database initialization and data detection. Active debugging in progress.

**URL:** `wecreatethis.com/migrate.html` (hidden, not linked from apps)

**Purpose:** On-demand data transfer for users moving from old domain to new domain.

**Files:**
- `migrate.html` - Dual-purpose migration page deployed to both domains:
  - On `wecreatethis.com`: User-facing UI for importing data
  - On `wecreatethis.pages.dev`: Popup helper that exports data

**Recent Changes:**
- Removed all automatic migration triggers from apps (no more auto-popups)
- Added ability to re-run migration multiple times (button stays visible)
- Implemented proper database schema initialization with all indexes
- Fixed "object store not found" errors by handling `onupgradeneeded` properly

**How it works:**
1. Send user to `wecreatethis.com/migrate.html`
2. User clicks "Start Migration" button
3. Opens popup window to `wecreatethis.pages.dev/migrate.html`
4. Popup reads IndexedDB data from old domain
5. Popup sends data via `postMessage` to main window
6. Main window properly initializes database schemas if needed
7. Main window imports data into new domain's IndexedDB (uses `put()` to avoid duplicates)
8. Shows success/failure status per app
9. User can retry anytime if needed

**Features:**
- ✅ Zero automatic behavior - completely manual and opt-in
- ✅ Clear UI showing what will be migrated
- ✅ Real-time progress per app
- ✅ Can be run multiple times safely (no duplicates)
- ✅ Proper database initialization with all required indexes
- ✅ Works only when user explicitly visits the page
- ✅ No interruption for users who started on new domain
- ⚠️ Some edge cases still being debugged

### Why Popup Instead of Iframe?

**Storage Partitioning Issue:** Modern browsers implement storage partitioning for privacy. Third-party iframes get isolated storage even if same-origin, meaning an iframe from `pages.dev` loaded on `wecreatethis.com` cannot access the real `pages.dev` IndexedDB.

**Solution:** Popup windows are first-party contexts with full storage access. The popup can read the actual IndexedDB data and send it back via postMessage.

### Database Schemas

Migration properly initializes all databases with correct versions and indexes:

**Birdle (`birdle-db` v2):**
- `sightings` store: indexes on `speciesCode`, `date`, `regionCode`, `syncId` (unique)
- `bingo_games` store: indexes on `createdAt`, `completedAt`

**Tarot (`tarot-reader-db` v1):**
- `readings` store: indexes on `date`, `spreadType`

**Beautiful Mind (`notes-app` v1):**
- `notes` store: index on `folder`

### Data Migrated Per App

| App | Database | Version | Stores Migrated |
|-----|----------|---------|-----------------|
| Birdle | `birdle-db` | v2 | `sightings`, `bingo_games` |
| Tarot | `tarot-reader-db` | v1 | `readings` |
| Beautiful Mind | `notes-app` | v1 | `notes` (IndexedDB only, not File System handles) |

**Note:** Beautiful Mind's File System Access API handles are origin-bound and cannot be transferred. Desktop users will need to re-select their notes folder on the new domain (files remain on disk, just need re-authorization).

### Testing Migration

1. Ensure data exists on `wecreatethis.pages.dev` (check IndexedDB in DevTools)
2. Visit `wecreatethis.com/migrate.html` in browser
3. Click "Start Migration" and allow popup
4. Verify status updates and success messages
5. To test again, clear migration flags:
   ```javascript
   localStorage.removeItem('migration_completed_birdle-db');
   localStorage.removeItem('migration_completed_tarot-reader-db');
   localStorage.removeItem('migration_completed_notes-app');
   ```

### Requirements
- Old domain (`wecreatethis.pages.dev`) must remain accessible
- User must be online during migration
- User must allow popup window when prompted

---

For project-specific details, architecture, and features, see the CLAUDE.md file in each project folder.

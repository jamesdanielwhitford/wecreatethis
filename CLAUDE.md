# We Create This - Multi-Project Repository

This repository contains multiple offline-first web applications, each living in its own folder with dedicated documentation.

## Projects

- **birdle/** - Bird spotting game using eBird API (Bird Bingo). See [birdle/CLAUDE.md](birdle/CLAUDE.md) for details.
- **beautiful-mind/** - Offline notes app with text, image, video, and audio support. E-reader themed with dual storage (File System API/IndexedDB). See [beautiful-mind/CLAUDE.md](beautiful-mind/CLAUDE.md) for details.
- **tarot/** - Tarot card reading app. See [tarot/CLAUDE.md](tarot/CLAUDE.md) for details.
- **hardle/** - Word guessing game: daily puzzle plus unlimited Practice Mode, single-page vanilla JS. Live in prod on `main`; see [sessions/overview.md](sessions/overview.md) session 004 for detail.
- **pomodoro/** - Productivity timer with work and break sessions. Customizable durations, audio notifications, and session tracking. See [pomodoro/CLAUDE.md](pomodoro/CLAUDE.md) for details.
- **git-notes/** - Note-taking app with GitHub-inspired dark theme. Auto-save, grid layout, and offline-first design. See [git-notes/CLAUDE.md](git-notes/CLAUDE.md) for details.
- **perfectday/** - Offline-first hiking map with lazy tile caching, GPS, compass, and sensor data. Uses MapLibre GL JS + OpenFreeMap. See [perfectday/CLAUDE.md](perfectday/CLAUDE.md) for details.
- **starrynight/** - Skywatching conditions app (Starry Night). Cloud cover, moon phase, planet visibility, 7-day sky forecast. Uses Open-Meteo + SunCalc + AstronomyAPI. See [starrynight/CLAUDE.md](starrynight/CLAUDE.md) for details.
- **voice-notes/** - Offline-first voice recording app with AI transcription via Mistral Voxtral. See [voice-notes/CLAUDE.md](voice-notes/CLAUDE.md) for details.
- **blog/** - Blog with markdown-based posts and offline support. Folder-driven content with nested sections (`content/{section...}/{post}/index.md`), scroll-through post stack, hand-authored homepage (`content/home.md`), auto-generated manifest (CI regenerates on push). See [blog/CLAUDE.md](blog/CLAUDE.md) for details, including how its service worker deliberately differs from the repo-wide SW rules.
- **towersofhanoi/** - Tower of Hanoi agent benchmark. AI agents solve the puzzle via an MCP server (Pages Function + KV); live visualization, manual play, and leaderboard. See [towersofhanoi/CLAUDE.md](towersofhanoi/CLAUDE.md) for details.

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

Every service worker follows one canonical strategy, **network-first with timeout, cache fallback**. The root `sw.js` is the exemplar; all app SWs copy its structure.

**Behavior:**
1. **Online:** every same-origin GET goes to the network, so users always see the latest deploy immediately. Successful responses refresh the cache.
2. **Offline or slow:** if the network fails or takes longer than `NETWORK_TIMEOUT_MS` (3s, raced via `AbortController`), the cached copy is served instead.
3. **Offline navigation to an uncached page** falls back to the app shell (`APP_ROOT`).
4. **First visit:** `ASSETS` are pre-cached at install, so apps work fully offline from the first load.

**Canonical URLs:** Extensionless (e.g., `/tarot/reading` not `/tarot/reading.html`). Internal links must use extensionless absolute paths. Each SW keeps a `normalizeUrl()` helper (strips `.html`, normalizes `/index` → `/`, ignores query params) purely as a safety net for stray `.html` bookmarks, correctness must not depend on it.

**Per-app exceptions (preserve these when editing):**
- **blog**: content and manifest are network-first with URLs derived from `content-manifest.json`; shell is cache-first; never fetch `.html` URLs from that SW (see [blog/CLAUDE.md](blog/CLAUDE.md))
- **birdle / chessle**: cross-origin GETs (eBird API, external images) are also cached, network-first with exact-URL keys and no timeout
- **beautiful-mind**: marked.js CDN is cache-first (pre-cached at install)
- **starrynight**: jsdelivr CDN cache-first; weather/astronomy APIs pass through uncached
- **perfectday**: map tiles pass through (app handles them via IndexedDB); MapLibre CDN stale-while-revalidate
- **symbolicritual**: separate R2 media cache with LRU trim, cache-first
- **tarot**: `message` handler (CACHE_DECK/REMOVE_DECK) for deck image management

### Version Management
- Service worker cache format: `projectname-vN`
- **Routine changes need NO version bump**, network-first means deploys reach users immediately. Bump `CACHE_NAME` only to purge deleted/renamed files from users' caches.
- **NO version numbers in HTML script tags** - Service workers handle all cache versioning
- Current versions live in each app's `sw.js`, not here (check `grep CACHE_NAME <app>/sw.js`)

### IMPORTANT: Service Worker Cache Rules

**When adding ANY new HTML page or JS file to ANY project, you MUST also add it to the `ASSETS` array in that project's `sw.js`.** Otherwise the page will not be available offline on first visit.

- HTML pages go in as extensionless normalized paths (e.g., `/birdle/trips/new` not `/birdle/trips/new.html`)
- JS files go in with their extension (e.g., `/birdle/trips/app.js`)
- This applies to all new pages, scripts, and static assets — no exceptions
- **Exception: blog content.** The blog SW derives post URLs from `content-manifest.json` at install; new posts need no SW edits (see [blog/CLAUDE.md](blog/CLAUDE.md))

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

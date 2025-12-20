# Project: Local-First Browser File and Note App (PWA)

---

## Session Continuity Protocol

When the user says **"prepare for next session"**, Claude must:
1. Update the "Current Implementation Status" section with what was completed
2. Update the "Next Steps" section with remaining/new tasks
3. Document any bugs found or design decisions made
4. Commit changes with a descriptive message
5. Confirm the CLAUDE.md is ready for a fresh session

This ensures a new Claude session can pick up exactly where we left off.

---

## Current Implementation Status

### Completed (Session 4 - Dec 2024)

**Stage 7: File System Access API - COMPLETE**
- `fileSystem.js` - Full bidirectional sync with local filesystem
- "Open Folder" button in header (hidden on unsupported browsers)
- Import folder and all contents (files + subfolders) into IndexedDB
- Write files back to filesystem when created/edited in the app
- Rename handling: deletes old file, writes new file
- Subfolder creation syncs to filesystem
- Folder-to-handle mapping stored in memory for write-back
- Requests `readwrite` permission for full sync capability

**Files Modified:**
- `app.js` - Added Open Folder button handler
- `index.html` - Added Open Folder button
- `components/noteEditor.js` - Writes to filesystem on save, handles renames
- `components/folderTree.js` - Creates folders on filesystem
- `components/metadataEditor.js` - Syncs metadata changes (including renames) to filesystem
- `service-worker.js` - Added fileSystem.js to cache, bumped to v5

**Key Technical Decisions:**
- Filenames always stored WITH extension in IndexedDB to match filesystem (prevents duplicate files on rename)
- `ensureExtension()` helper adds default extension based on file type
- NotFoundError on delete handled silently (file may not exist on disk)
- Folder handles stored in Map for write-back capability
- Only folders imported via "Open Folder" are linked; root level doesn't sync

**Browser Support:**
- Chrome/Edge desktop: Full support
- Safari/Firefox: Button hidden (API not available)

---

### Completed (Session 3 - Dec 2024)

**Stage 6: PWA Integration - COMPLETE**
- `manifest.json` - PWA manifest with app name, icons, standalone display mode
- `service-worker.js` - Caches all app shell assets + Leaflet CDN for offline use
- `icons/icon-192.png` and `icons/icon-512.png` - Black square placeholder icons
- Service worker registration added to `app.js`
- Manifest link, theme-color meta, and apple-touch-icon added to `index.html`
- Cache-first strategy with network fallback
- Automatic cache cleanup on version update

---

### Completed (Session 2 - Dec 2024)

**Stage 5: Metadata Editor - COMPLETE**
- `components/metadataEditor.js` - Full metadata editor with location picker
- "i" button on each file in assetView opens metadata editor
- Edit: title/filename, description, location, tags (comma-separated)
- Read-only dates: created, modified, last accessed
- Interactive Leaflet map for location picking (click to place marker, drag to adjust)
- "Use My Location" button for GPS capture
- Reverse geocoding via OpenStreetMap Nominatim API
- Location stored as JSON: `{"lat": number, "lng": number, "name": string}`
- Auto-capture location when creating new notes (all file types)

**Dependencies Added:**
- Leaflet 1.9.4 via CDN (map library)

---

### Completed (Session 1 - Dec 2024)

**Core Infrastructure:**
- `index.html` - Main app shell with header, sidebar, content area, modal
- `style.css` - Minimal functional CSS (no polish, just layout)
- `utils.js` - UUID generation, date formatting, file type detection
- `db.js` - Full IndexedDB wrapper with CRUD for files and folders
- `app.js` - Main initialization, wires components together

**Components:**
- `components/folderTree.js` - Folder tree with breadcrumb navigation, create/delete folders
- `components/assetView.js` - Grid display of files with type-specific previews, delete button, metadata button
- `components/noteEditor.js` - Full editor for all file types with media capture and auto-location

**Features Working:**
- Create/navigate/delete folders (nested supported)
- Create/edit/delete files of all types (text, image, video, audio, SVG)
- Text: textarea editor
- Image: file upload OR camera capture
- Video: file upload OR camera recording
- Audio: file upload OR microphone recording
- SVG: freehand drawing canvas with stroke color/width
- All data persists in IndexedDB
- Files display with appropriate previews in grid
- Metadata editing with interactive map location picker
- Auto-location capture on new file creation

**Key Technical Decisions:**
- IndexedDB doesn't index `null` values - we filter manually for root folders/files
- SVG saves without `id` attribute to prevent duplicate ID conflicts in previews
- Media streams properly cleaned up on modal close
- ES modules require serving via HTTP (not file://)
- Location stored as JSON string for backward compatibility with plain text
- Leaflet map cleaned up on modal close to prevent memory leaks
- Reverse geocoding fails silently, coordinates still saved

**Known Limitations:**
- Minimal styling - functional but not pretty
- Nominatim API has usage limits (1 req/sec) - not an issue for single-user app
- PWA icons are placeholder black squares - replace with real icons later
- File System sync only works on Chrome/Edge desktop
- Folder handles are stored in memory only - re-import folder after page refresh to re-link

---

## Next Steps

### Stage 8: Polish
- LRU cache tracking in db.js
- Keyboard shortcuts (Escape to close, Ctrl+S to save)
- Loading states and error handling
- Better UI styling

### Future (Not Started)
- Stage 9: Cross-device sync via WebRTC
- Stage 10: Embeddings for AI features

---

## Overview

This app is a **local-first, browser-based PWA** using vanilla JavaScript, HTML, and IndexedDB. It provides:

* Folder-based navigation with a tree view of folders and files.
* Top-level assets display (text, image, video, audio, SVG) with preview and editing.
* Create and edit notes/files (text, image, video, audio, SVG).
* Metadata management: date created, accessed, modified; title/filename; file type; description; location; tags; embeddings (future).
* Offline-first behavior with IndexedDB caching and optional File System Access API support.
* Cross-device IndexedDB sync (future via WebRTC).

---

## Suggested File Structure

```
project-root/
│
├─ index.html             # Main HTML entry point
├─ style.css              # Minimal CSS (unstyled)
├─ app.js                 # Main JS, initializes app and handles routing
├─ db.js                  # IndexedDB wrapper for files, folders, metadata
├─ fileSystem.js          # File System Access API integration (desktop only)
├─ sync.js                # Cross-device sync logic (WebRTC or server relay)
├─ utils.js               # Utility functions (UUID generation, date formatting, etc.)
├─ components/
│   ├─ folderTree.js      # Render folder tree, handle navigation
│   ├─ assetView.js       # Render files in current folder (text, image, video, audio, SVG)
│   ├─ noteEditor.js      # Create/Edit note modal logic
│   └─ metadataEditor.js  # Edit file metadata modal logic
├─ icons/
│   ├─ icon-192.png       # PWA icon 192x192
│   └─ icon-512.png       # PWA icon 512x512
├─ manifest.json          # PWA manifest
└─ service-worker.js      # PWA service worker
```

---

## Architecture and Communication

### 1. IndexedDB (`db.js`)

* Stores:

  * Files (blob or text)
  * Folder tree structure
  * Metadata for each file

* Provides API functions:

  * `getFile(id)`, `getFolder(id)`
  * `saveFile(fileData)`
  * `updateMetadata(fileId, metadata)`
  * `deleteFile(fileId)`
  * `getRecentFiles()` (for LRU caching)

* Acts as **single source of truth for UI** and sync logic.

---

### 2. File System API (`fileSystem.js`)

* Optional integration for desktop browsers with FS access.

* Functions:

  * `readFolder(folderHandle)`
  * `readFile(fileHandle)`
  * `writeFile(fileHandle, content)`
  * `syncIndexedDBWithFS()`

* When a file is accessed via UI:

  * If not in IndexedDB, fetch from FS API and cache.
  * If edited, update IndexedDB metadata and optionally FS copy.

---

### 3. Sync Layer (`sync.js`)

* Handles cross-device sync for IndexedDB.
* Uses **WebRTC or server relay** for communication.
* Maintains **change logs** for conflict resolution (last-write-wins by timestamp).
* Functions:

  * `syncWithPeer(peerId)`
  * `mergeChanges(remoteChanges)`
  * Updates folder tree and file content in IndexedDB after sync.

---

### 4. UI Components

#### `folderTree.js`

* Renders the folder tree.
* Supports:

  * Clicking a folder to open sub-tree view
  * Showing which files are cached vs remote-only references
  * Navigation breadcrumbs

#### `assetView.js`

* Displays top-level assets for the current folder:

  * Text → editable text preview
  * Image → `<img>` preview, editable
  * Video → `<video>` player
  * Audio → `<audio>` player
  * SVG → interactive `<svg>` canvas for drawing

* Clicking an asset opens `noteEditor.js` modal for editing content & metadata.

#### `noteEditor.js`

* Handles creation and editing of assets.
* For new notes: allows selection of type (text, image, video, audio, SVG).
* For existing notes: allows replacing content and updating metadata.
* Communicates with `db.js` for saving files and metadata updates.

#### `metadataEditor.js`

* Edits:

  * Filename/title
  * Description
  * Location data
  * Tags
  * Future: embeddings
* Updates IndexedDB and triggers FS sync if available.

---

### 5. PWA Integration

* `manifest.json` defines:

  * `name`, `short_name`, `start_url`
  * `icons`, `display: standalone`
* `service-worker.js` caches essential files for offline support.
* IndexedDB ensures full offline functionality even without network or FS API access.

---

### 6. Data Flow Summary

1. **File Access**: UI → check IndexedDB → if missing, fetch from FS API → update cache → display.
2. **File Edit**: UI → edit content → update IndexedDB → optionally update FS API.
3. **Metadata Update**: UI → metadata editor → update IndexedDB → optionally update FS API.
4. **Cross-Device Sync**: DB changes → WebRTC relay → merge remote changes → update IndexedDB → UI refresh.
5. **New Note Creation**: UI → note type selection → content creation → save to IndexedDB → optionally FS API.

---

### 7. Notes on Features

* **LRU Cache**: Keep recently accessed files in IndexedDB; evict least recently used if storage exceeds browser limits.
* **Offline-First**: Full UI works without FS or network; changes are synced later.
* **Conflict Resolution**: Last-write-wins by timestamp; optional advanced merge with change logs.
* **Supported Assets**: Text, Image, Video, Audio, SVG.
* **Expandable Metadata**: Supports embeddings for future AI integrations.

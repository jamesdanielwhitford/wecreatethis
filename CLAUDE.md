# Project: Local-First Browser File and Note App (PWA)

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

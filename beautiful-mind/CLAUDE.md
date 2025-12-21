# Simple Offline Notes App

## Overview
A vanilla JS/HTML/CSS offline notes app supporting text, image, video, and audio notes. Uses File System Access API on desktop browsers and IndexedDB fallback for mobile browsers (Safari/iOS).

## Features
- **Four note types:** Text (markdown), Image, Video, Audio
- **Dual storage:** File System API (desktop) / IndexedDB (mobile)
- **Content-first UX:** Write/capture first, add metadata after
- **E-reader theme:** Paper grain texture, serif fonts, system dark/light mode
- **Export/Import:** Transfer notes between devices via JSON
- **Folder organization:** Create and manage folders for notes
- **Media capture:** Camera/microphone recording for image/video/audio notes

---

## File Structure

```
wecreatethis/
├── CLAUDE.md           # This documentation
├── index.html          # App shell with canvas for grain effect
├── app.js              # All JavaScript logic (~1700 lines)
└── styles.css          # All styles (~880 lines)
```

## User's Notes Structure (Desktop - File System)

```
selected-folder/
├── Work/
│   ├── Meeting Notes.md              # Text note with YAML frontmatter
│   ├── Whiteboard.jpg                # Image note
│   ├── Whiteboard.jpg.meta.json      # Image metadata sidecar
│   ├── Demo.mp4                       # Video note
│   └── Demo.mp4.meta.json            # Video metadata sidecar
└── Personal/
    ├── Voice Memo.webm               # Audio note
    ├── Voice Memo.webm.meta.json     # Audio metadata sidecar
    └── Journal.md                    # Text note
```

---

## Storage Architecture

### Desktop (Chrome, Edge, Opera)
- Uses **File System Access API** for real folder/file storage
- Directory handle persisted in IndexedDB
- Notes are actual files on disk (portable, accessible via Finder/Explorer)

### Mobile (Safari, iOS Chrome, Firefox)
- Uses **IndexedDB** as full storage backend
- Binary data stored as ArrayBuffer (iOS Safari compatibility)
- All notes contained within browser storage

### Storage Abstraction
```javascript
const USE_FILESYSTEM = 'showDirectoryPicker' in window;
const storage = USE_FILESYSTEM ? fsStorage : idbStorage;
```

Both backends implement the same interface:
- `init()` - Initialize storage
- `selectFolder()` - Select storage location (desktop only)
- `getAllNotes()` - Get all notes
- `saveTextNote(folder, filename, content, meta)` - Save text note
- `saveBinaryNote(folder, filename, blob, meta)` - Save binary note
- `readNote(note)` - Read note content
- `deleteNote(note)` - Delete note
- `deleteFolder(folderPath)` - Delete folder and contents
- `updateMeta(note, meta)` - Update note metadata
- `exportAll()` - Export all notes as JSON
- `importAll(data)` - Import notes from JSON
- `getStorageName()` - Get storage display name

---

## Data Models

### Text Notes (Markdown with YAML Frontmatter)
```markdown
---
title: My Meeting Notes
tags: work, important
description: Q1 Planning Session
createdAt: 2025-01-15T10:30:00Z
---

# Meeting Notes

Content here...
```

### Binary Notes (Sidecar .meta.json)
```json
{
  "title": "Whiteboard Photo",
  "tags": ["meeting", "diagrams"],
  "description": "Architecture diagram",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### IndexedDB Note Object (Mobile)
```javascript
{
  id: "folder/filename.jpg",
  name: "filename.jpg",
  folder: "folder",
  type: "image",
  data: ArrayBuffer,        // Binary data (not Blob - iOS Safari fix)
  mimeType: "image/jpeg",
  meta: { title, tags, description },
  createdAt: "...",
  updatedAt: "..."
}
```

### Supported File Types
- **Text:** `.md`, `.txt`
- **Image:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- **Video:** `.mp4`, `.webm`, `.mov`
- **Audio:** `.mp3`, `.m4a`, `.webm`, `.wav`, `.ogg`

---

## Views & Routes

### Navigation View (`#/` or `#/notes`)
- Folder tree with expand/collapse
- Notes listed with type icons
- "+ New" button with type selector menu
- Settings gear icon (storage location, export/import)
- Delete folder capability (trash icon on hover)

### View Note (`#/view/{path}`)
- Note title and metadata display
- Content rendering by type:
  - Text: Rendered markdown (using marked.js)
  - Image: `<img>` element
  - Video: `<video controls>`
  - Audio: `<audio controls>`
- Edit and Delete buttons

### Add Note (`#/new?type={type}`)
**Content-first UX:**
- **Text:** Full-page distraction-free editor, save bar at bottom
- **Image:** Camera capture or file picker, then preview with save options
- **Video:** Record or select file, then preview with save options
- **Audio:** Record or select file, then preview with save options

Expandable metadata panel (title, tags, description) via "More" button.

### Edit Note (`#/edit/{path}`)
- Pre-filled form with existing content/metadata
- Binary notes: option to replace file

---

## Theme System

### E-Reader Theme
- Paper grain texture via canvas (intensity: 12)
- Serif fonts (Georgia, Times New Roman)
- System dark/light mode detection via `prefers-color-scheme`

### CSS Variables
```css
:root {
  --bg: #e8e6e0;
  --text: #2a2826;
  --text-muted: #5a5855;
  --surface: rgba(255, 255, 255, 0.7);
  --accent: #5a4a3a;
  --danger: #8b3a3a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #d4d4d4;
    --accent: #a89a8a;
    /* etc. */
  }
}
```

### Grain Effect
- Generated on canvas element covering viewport
- Regenerates on resize and theme change
- Uses `clientWidth`/`clientHeight` to avoid scrollbar issues

---

## Export/Import

### Export Format (JSON)
```javascript
[
  {
    id: "folder/note.md",
    name: "note.md",
    folder: "folder",
    type: "text",
    content: "---\ntitle: ...\n---\nContent..."  // Full file with frontmatter
  },
  {
    id: "folder/image.jpg",
    name: "image.jpg",
    folder: "folder",
    type: "image",
    data: "data:image/jpeg;base64,...",  // Base64 encoded
    meta: { title, tags, description, ... }
  }
]
```

### Workflow
1. **Export:** Settings → Export → Downloads `notes-export-YYYY-MM-DD.json`
2. **Transfer:** Share file via email/cloud/AirDrop
3. **Import:** Settings → Import → Select JSON file → Notes saved to storage

---

## Technical Decisions

### ArrayBuffer vs Blob (iOS Safari Fix)
iOS Safari has issues storing Blob objects in IndexedDB. Solution:
- Convert Blob to ArrayBuffer before storing
- Store mimeType separately
- Reconstruct Blob when reading

### Defensive Database Initialization
All IndexedDB methods call `await openDB()` first:
- `openDB()` is idempotent (returns immediately if already open)
- Prevents null reference errors
- Safe even if called multiple times

### Why Sidecar Files?
- Can't embed metadata in binary files
- Keeps original files unmodified
- Simple to read/write
- Standard pattern

### Why Hash Routing?
- No server required
- Works offline
- Simple implementation
- Native browser support

---

## Browser Compatibility

### Full Support (File System API)
- Chrome 86+ (desktop)
- Edge 86+ (desktop)
- Opera 72+ (desktop)

### IndexedDB Fallback
- Safari (macOS & iOS)
- Chrome (Android & iOS)
- Firefox (all platforms)

---

## Known Limitations

1. **No sync between devices** - IndexedDB is local to each browser
2. **Mobile storage is browser-only** - Can't access files in system file manager
3. **Export required for backup** - Mobile notes exist only in IndexedDB

---

## Future Enhancements (Not Implemented)
- Search functionality
- Tag filtering
- Sort options
- Service Worker for true offline
- PWA manifest for installation
- Cloud sync (Firebase, Supabase)
- End-to-end encryption

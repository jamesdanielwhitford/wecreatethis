# Voice Notes — Technical Specification

## Overview

Voice Notes is an offline-first progressive web app for recording voice notes with live AI transcription. It has two modes: a local-only user mode and an admin mode that syncs note metadata with a Cloudflare D1 remote database. Audio is never stored remotely — only text and metadata sync.

---

## File Structure

```
voice-notes/
├── index.html          Main app: recording UI + notes list
├── note.html           Single note detail: editable transcript, audio controls
├── admin.html          Login page for admin mode
├── db.js               IndexedDB module (metadata + audio blobs)
├── api.js              HTTP client for the Cloudflare Worker
├── sw.js               Service worker (cache-first, v11)
├── manifest.json       PWA manifest
├── icon-192.png
├── icon-512.png
└── worker/
    ├── index.js        Cloudflare Worker — REST API over D1
    ├── schema.sql       D1 table definition
    └── wrangler.toml   Wrangler deployment config
```

---

## Data Model

### Note object (in-memory and IndexedDB)

```js
{
  id:               string,   // Date.now().toString() — Unix ms as string
  createdAt:        string,   // ISO 8601 e.g. "2026-05-30T14:22:00.000Z"
  transcript:       string | null,
  transcriptStatus: 'done' | 'error' | 'transcribing',
  transcriptError:  string | null,
  duration:         number | null,  // seconds
  audioMime:        string | null,  // e.g. "audio/webm;codecs=opus"
  isRemote:         boolean,        // true if synced from D1, not locally recorded
}
```

### D1 schema (snake_case, Cloudflare Worker side)

```sql
CREATE TABLE IF NOT EXISTS notes (
  id                TEXT    PRIMARY KEY,
  created_at        TEXT    NOT NULL,
  transcript        TEXT,
  transcript_status TEXT    NOT NULL DEFAULT 'done',
  transcript_error  TEXT,
  duration          INTEGER,
  audio_mime        TEXT
);
```

Field names are snake_case in D1 and camelCase in the browser. `api.js` sends snake_case to the worker; `syncFromRemote()` in `index.html` normalises incoming snake_case to camelCase before writing to IndexedDB.

---

## Local Storage

### IndexedDB — `voice-notes-v2` (metadata)

- Object store: `notes`, keyPath `id`
- Index: `created_at` (non-unique) — used for `ORDER BY` cursor traversal newest-first
- Accessed via `db.js` exports: `getNotes`, `getNote`, `putNote`, `putNotes`, `deleteNote`

### IndexedDB — `voice-notes-audio` (blobs)

- Object store: `blobs`, keyPath `id`
- Stores `{ id, blob, mimeType }` — the raw `Blob` object from `MediaRecorder`
- Kept until transcription succeeds, then deleted
- Never synced remotely
- Accessed via `db.js` exports: `saveAudioBlob`, `getAudioBlob`, `deleteAudioBlob`

### localStorage keys

| Key | Value | Purpose |
|-----|-------|---------|
| `voice-notes-mistral-key` | Mistral API key string | Persists across sessions |
| `vn-admin-creds` | `JSON {username, password}` | Cached admin credentials (if "stay signed in") |
| `voice-notes-v1` | Old format note array | Legacy — migrated to IndexedDB on first run, then removed |

### sessionStorage keys

| Key | Value | Purpose |
|-----|-------|---------|
| `vn-auth-token` | `btoa(username:password)` | Admin session token — cleared on tab close |

---

## Authentication

Admin auth uses HTTP Basic Auth encoded as a Bearer token.

**Token format:** `btoa(username + ':' + password)`

**Flow:**
1. User visits `/voice-notes/admin`
2. If `localStorage['vn-admin-creds']` exists, silently call `POST /api/auth/verify` with cached credentials
   - On 200: set `sessionStorage['vn-auth-token']`, redirect to `/voice-notes/`
   - On 401: clear cached creds, show login form
   - On network error: set token from cache anyway and redirect (offline tolerance)
3. If no cached creds, show login form
4. On form submit: call `verifyCredentials(username, password)` → `POST /api/auth/verify`
   - On success: store token in sessionStorage, optionally cache creds in localStorage, redirect
   - On failure: clear password field, show error

**Worker auth check** (`authed` function in `worker/index.js`):
- Reads `Authorization: Bearer <token>` header
- Base64-decodes the token, splits on first `:`, compares against `env.AUTH_USERNAME` and `env.AUTH_PASSWORD`
- Returns `false` if malformed, missing, or wrong
- All routes except OPTIONS require auth

**Secrets** (set via `wrangler secret put`):
- `AUTH_USERNAME`
- `AUTH_PASSWORD`

---

## Recording Flow

### Start recording

1. Check `localStorage['voice-notes-mistral-key']` — if absent, open API key modal and abort
2. `navigator.mediaDevices.getUserMedia({ audio: true })` — request mic permission
3. Initialise `pendingChunks = []` and `allChunks = []`
4. Create `MediaRecorder` with preferred MIME type:
   - Try `audio/webm;codecs=opus` → `audio/webm` → browser default
5. `mediaRecorder.start(1000)` — emits `dataavailable` every 1 second
6. `ondataavailable`: push each chunk to both `allChunks` and `pendingChunks`
7. Acquire wake lock: `navigator.wakeLock.request('screen')` — keeps screen on
   - Re-acquired on `visibilitychange` if recording and page becomes visible again
8. Show live transcript box (`#liveWrap`), smooth-scroll it into view
9. Start 1-second display timer (`#recordTimer`)
10. Start 10-second chunk dispatch interval

### 10-second chunk dispatch (live transcription)

Every 10 seconds while recording:
1. Snapshot `pendingChunks` (splice to empty it)
2. If snapshot is empty, skip
3. Build `Blob` from snapshot chunks with the recording MIME type
4. Call `transcribeBlob(blob, mimeType)` → `POST https://api.mistral.ai/v1/audio/transcriptions`
   - FormData: `file = Blob as "rec.webm"`, `model = "voxtral-mini-latest"`
   - Auth: `Authorization: Bearer <mistral-api-key>`
5. On success: append returned text to `liveText`, re-render `#liveTranscript` with blinking cursor
6. On failure: silently skip (no error shown during recording)

### Stop recording

1. `mediaRecorder.stop()` — triggers `onstop` after final `dataavailable`
2. Clear chunk interval
3. Reset UI: remove `.recording` class, restore mic icon, clear timer, release wake lock

### `onstop` handler (`onRecordingDone`)

1. Transcribe any remaining `pendingChunks` that weren't sent yet
2. Append any returned text to `liveText`
3. Set `finalTranscript = liveText || null`
4. Build note object with `id = Date.now().toString()`, `createdAt = new Date().toISOString()`
5. `notes.unshift(note)` — add to top of in-memory array
6. `putNote(note)` — write to IndexedDB
7. Re-render notes list
8. Save full blob: `new Blob(allChunks, { type: mimeType })` → `saveAudioBlob(note.id, blob, mimeType)`
9. Hide live transcript box, clear `liveText`
10. If admin: `syncNoteUp(note)` — push to D1 (best-effort, logs failure silently)

---

## Transcription API

**Endpoint:** `POST https://api.mistral.ai/v1/audio/transcriptions`

**Model:** `voxtral-mini-latest`

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer <mistral-api-key>

file:  <Blob>  named "rec.webm" (or .ogg / .mp4 based on MIME)
model: "voxtral-mini-latest"
```

**Response:**
```json
{ "text": "transcribed text here" }
```

**Error handling:** Any non-OK response or network failure returns `null` from `transcribeBlob()`. During recording this is silently skipped. On retry (from note detail page) the error is surfaced in a toast.

**File extension mapping:**
- `audio/webm*` → `.webm`
- `audio/ogg*` → `.ogg`
- `audio/mp4*` → `.mp4`
- Fallback → `.webm`

---

## Sync (Admin Mode Only)

### On page load — pull from remote

`syncFromRemote()` in `index.html`:
1. Show sync banner with spinner
2. `fetchNotes()` → `GET /api/notes?limit=200` (auth required)
3. Normalise response: snake_case D1 fields → camelCase, add `isRemote: true`
4. `putNotes(normalized)` — batch upsert into IndexedDB (remote always wins on conflict)
5. Reload `notes = await getNotes()`, re-render
6. Hide banner after 2.5s (or 3s on error)

### After recording — push to remote

`syncNoteUp(note)` in `index.html`:
1. `pushNote({ id, created_at, transcript, transcript_status, transcript_error, duration, audio_mime })`
   → `POST /api/notes` with auth header
2. Worker does `INSERT ... ON CONFLICT(id) DO UPDATE` — safe to call multiple times
3. Failure is caught and logged to console only; local note is already saved

### Transcript edit — patch remote

In `note.html` on `contenteditable` blur (800ms debounce):
1. `putNote(note)` — save locally
2. If admin: `remoteUpdateNote(id, { transcript })` → `PUT /api/notes/:id`

### Delete — remove from remote

In `index.html` and `note.html`:
1. `deleteNote(id)` + `deleteAudioBlob(id)` — local removal
2. If admin: `removeNote(id)` → `DELETE /api/notes/:id` (failure silently caught)

### Conflict resolution

No timestamp-based conflict resolution. The sync strategy is:
- **Remote → local:** D1 always overwrites local on pull (remote is authoritative for admin's synced notes)
- **Local → remote:** new recordings are pushed immediately after save
- There is no two-way merge; admin should use one primary device for recording

---

## Worker API Reference

All routes require `Authorization: Bearer <token>` except OPTIONS.

### `POST /api/auth/verify`
Verify credentials. Returns `200 { ok: true }` or `401 { error: "Unauthorized" }`.

### `GET /api/notes?limit=N&before=<created_at>`
List notes ordered by `created_at DESC`. Max `limit` is 200. `before` is an ISO timestamp for cursor pagination.

**Response:** Array of note rows in D1 snake_case format.

### `POST /api/notes`
Create or upsert a note. Uses `INSERT ... ON CONFLICT(id) DO UPDATE`.

**Body:** `{ id, created_at, transcript, transcript_status, transcript_error, duration, audio_mime }`

Required: `id`, `created_at`. Returns `201` with full row.

### `PUT /api/notes/:id`
Partial update. Any field in the body overwrites the stored value; omitted fields are preserved.

**Body:** Any subset of `{ transcript, transcript_status, transcript_error, duration, audio_mime }`

Returns `200` with updated row, or `404` if not found.

### `DELETE /api/notes/:id`
Delete a note by ID. Returns `204` or `404`.

### CORS
All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
```
OPTIONS preflight returns `204`.

---

## Pages

### `index.html`

Single-page app structure. All JS is a single `<script type="module">`.

**On load:**
1. `getNotes()` from IndexedDB → render
2. Migrate old `localStorage['voice-notes-v1']` array if present → `putNote` each, remove key
3. Show/hide no-API-key banner
4. Show/hide admin badge
5. If admin: `syncFromRemote()`

**Admin visual indicators:**
- `#adminBadge` — "Admin" pill in navbar (purple, shown when `sessionStorage` token present)
- `.note-card.remote` — left purple border (2px solid `rgba(168,85,247,0.4)`) on notes with `isRemote: true`
- `#syncBanner` — spinner + status text, shown during sync

### `note.html?id=<id>`

**On load:** `getNote(id)` from IndexedDB. Renders:
- Date in navbar title
- Meta row: formatted date, duration pill, "Remote" pill if `isRemote`
- Editable transcript (`contentEditable` div)
  - `border: 1px solid transparent` → `border-color: var(--accent)` on focus
  - 800ms debounce autosave on `input` event
  - "Saved" indicator fades in/out on save
  - Edit hint ("Tap to edit transcript") hidden on focus
- Action buttons:
  - **Copy text** — `navigator.clipboard.writeText(note.transcript)` (shown if transcript exists)
  - **Retranscribe** — sends stored audio blob to Mistral, replaces transcript (shown only if audio blob in IndexedDB AND API key set)
  - **Delete audio** — `deleteAudioBlob(id)`, keeps transcript (shown if audio exists AND transcript exists)
  - **Delete note** — deletes locally + remote, navigates back to `/voice-notes/`

### `admin.html`

Standalone login page. No notes rendered here — on success it redirects to `index.html` which handles the admin UI.

---

## Service Worker (`sw.js`, `voice-notes-v11`)

**Cached assets:**
```
/voice-notes/
/voice-notes/index
/voice-notes/note
/voice-notes/admin
/voice-notes/manifest.json
/voice-notes/icon-192.png
/voice-notes/icon-512.png
/voice-notes/db.js
/voice-notes/api.js
```

**Strategy:** Cache-first with background network update. On a cache miss, falls back to network. On navigation miss, returns the index page.

**Cross-origin passthrough:** If `url.hostname !== self.location.hostname`, the fetch event is not intercepted. This means Mistral API calls and Cloudflare Worker calls bypass the service worker entirely.

**URL normalisation:** `.html` extensions stripped, `/voice-notes/index` normalised to `/voice-notes/` before cache key storage.

---

## PWA Configuration

`manifest.json`:
```json
{
  "name": "Voice Notes",
  "short_name": "Voice Notes",
  "start_url": "/voice-notes/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#1a1a2e"
}
```

`<meta name="apple-mobile-web-app-capable" content="yes">` — iOS standalone mode.

---

## Design Tokens

```css
--bg:           #0f0f1a   /* page background */
--surface:      #1a1a2e   /* card/navbar background */
--surface2:     #16213e   /* input/secondary surface */
--accent:       #7c3aed   /* primary purple */
--accent-light: #a855f7   /* lighter purple, links */
--text:         #e2e8f0   /* primary text */
--text-muted:   #94a3b8   /* secondary text */
--border:       rgba(255,255,255,0.08)
--danger:       #ef4444
--success:      #22c55e
--warning:      #f59e0b
--record-red:   #ff3b30
```

---

## Deployment

### Frontend

Deployed as part of the `wecreatethis` Cloudflare Pages site from the `main` branch. Served at `wecreatethis.com/voice-notes/`.

### Worker

```bash
cd voice-notes/worker

# Create D1 database (once)
npx wrangler d1 create voice-notes
# Paste the returned database_id into wrangler.toml

# Create table
npx wrangler d1 execute voice-notes --file=schema.sql

# Set secrets
npx wrangler secret put AUTH_USERNAME
npx wrangler secret put AUTH_PASSWORD

# Deploy
npx wrangler deploy
# Copy the worker URL and update API_BASE in api.js
```

### After deploying worker

Update `API_BASE` in `voice-notes/api.js`:
```js
export const API_BASE = 'https://voice-notes.<your-subdomain>.workers.dev';
```

Then bump `sw.js` cache version and push to prod.

---

## Known Limitations

- **No audio stored remotely.** Admin syncing a second device will see transcript text but cannot replay audio.
- **Single admin user.** The worker supports one username/password pair only. No multi-user or per-user note segregation.
- **No pagination in sync pull.** `fetchNotes` fetches up to 200 notes in one call. No infinite scroll for remote notes.
- **Chunk transcription accuracy.** 10-second chunks fed to a batch transcription model may miss context at chunk boundaries. The final transcript is the concatenation of all chunk results; there is no post-processing pass over the full audio.
- **No conflict resolution.** Remote always wins on sync pull. If the same note is edited on two devices, the last sync pull overwrites local edits.
- **Wake lock not guaranteed on iOS.** Safari may release the wake lock when the app is backgrounded. The `visibilitychange` handler re-acquires it on return to foreground, but audio recording itself continues in the background regardless.

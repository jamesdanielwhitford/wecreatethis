# Inkwell — Architecture

## Overview

A local-first notes app with hierarchical folders and notes. Three ways to create a note: typing, voice transcription, or an AI conversation. Notes can also be edited by any of those three methods. Works fully offline using localStorage (unauthenticated) or IndexedDB with Cloudflare D1 sync (authenticated admin).

```
Browser
  └── index.html            (directory: folder + note listing)
        ├── note.html        (note view: inline editing, voice append, AI edit)
        ├── voice.html       (voice note creation: record, transcribe, save)
        ├── chat.html        (AI conversation: chat, then generate or edit a note)
        ├── settings.html    (API keys, admin login — hidden, not linked)
        ├── app.js           (directory UI, navigation, auth state)
        ├── note.js          (note editing, autosave, voice append, AI edit)
        ├── voice.js         (MediaRecorder, Mistral transcription, save flow)
        ├── chat.js          (Claude conversation, note generation/editing)
        ├── settings.js      (API key management, admin login/logout)
        ├── store.js         (localStorage adapter — unauthenticated mode)
        ├── db.js            (IndexedDB adapter — authenticated mode)
        ├── storage.js       (adapter: selects store.js or db.js by auth state)
        └── api.js           (HTTP client for Worker API — authenticated mode)
                                          |
                              Cloudflare Worker (worker/index.js)
                                          |
                                  D1 (folders + notes)
```

---

## Data model

### Node structure

Everything is a node. A node is either a folder or a note.

```
node {
  id:           string (UUID)
  parent_id:    string | null   (null = top-level)
  type:         'folder' | 'note'
  title:        string
  body:         string | null   (notes only, plain text)
  source:       'typed' | 'voice' | 'ai-chat' | null
  position:     integer         (display order within parent)
  created_at:   string          (ISO 8601)
  updated_at:   string          (ISO 8601)
}
```

The `source` field records how the note was originally created. It is informational only and does not affect any logic.

### Settings structure

Settings are stored separately from nodes. They are never synced to D1 — API keys stay local.

**Unauthenticated settings** — localStorage key `inkwell-settings`:

```json
{
  "mistral_key": "...",
  "anthropic_key": "..."
}
```

**Authenticated settings** — same localStorage key. API keys always stay in localStorage, even for admin. The Worker never sees them. The D1 `settings` table (Stage 7) stores only non-sensitive admin preferences.

### localStorage schema (unauthenticated)

- `inkwell-nodes` — JSON array of all node objects.
- `inkwell-settings` — JSON object with API keys.
- `inkwell-last-sync` — ISO 8601 timestamp of last successful D1 sync (used in authenticated mode).

### IndexedDB schema (authenticated)

Database: `inkwell-db` v1
Object store: `nodes`, keyPath `id`
Indexes:
- `parent_id` (non-unique) — fetch children of a folder
- `updated_at` (non-unique) — sync ordering

Mirrors D1 exactly. API keys are never stored in IndexedDB.

### D1 schema

```sql
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT    PRIMARY KEY,
  parent_id  TEXT,
  type       TEXT    NOT NULL CHECK(type IN ('folder','note')),
  title      TEXT    NOT NULL DEFAULT '',
  body       TEXT,
  source     TEXT    CHECK(source IN ('typed','voice','ai-chat',NULL)),
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_updated ON nodes(updated_at);
```

---

## Auth model

### Unauthenticated (default)

- No login required.
- All node data lives in localStorage under `inkwell-nodes`.
- API keys (Mistral, Anthropic) stored in localStorage under `inkwell-settings`.
- No network calls except direct API calls to Mistral and Anthropic from the browser.

### Authenticated (admin)

- Admin logs in with a token (stored in `sessionStorage` as `inkwell-auth-token`).
- On login: IndexedDB is populated from D1 via a full sync.
- Writes go to IndexedDB immediately (optimistic) and to D1 via the Worker in the background.
- On next load: renders from IndexedDB first, then syncs changed nodes from D1.
- On logout: `sessionStorage` token is cleared. App falls back to localStorage.
- API keys remain in localStorage in both modes. They are never sent to the Worker.

---

## Note creation methods

Three ways to create a note, accessible from the directory via a creation menu ("+").

### 1. Typed note

Standard creation: a new empty note node is written to storage, then the user is navigated to `note.html?id=<id>` where they edit inline.

### 2. Voice note

Flow:
1. User opens `voice.html` from the creation menu (or from within an existing note for appending).
2. `voice.js` uses `MediaRecorder` to record audio from the microphone.
3. On stop, the audio blob is sent to the Mistral Voxtral API (`https://api.mistral.ai/v1/audio/transcriptions`, model `voxtral-mini-latest`) using the Mistral key from settings.
4. The transcribed text is shown to the user for review before saving.
5. User confirms: a new note node is created with `source: 'voice'`, body is the transcription, and the user is navigated to `note.html?id=<id>`.
6. User can edit the transcribed text inline before or after saving.

Mistral key resolution:
- Check `inkwell-settings` in localStorage for `mistral_key`.
- If not present, show a prompt directing the user to settings.

### 3. AI chat note

Flow:
1. User opens `chat.html` from the creation menu with an optional `?parent=<id>` to set the destination folder.
2. `chat.js` renders a chat interface. User types or dictates (if mic is available) messages.
3. The conversation is sent to the Anthropic API (`claude-haiku-4-5-20251001` by default for cost, configurable) using the Anthropic key from settings.
4. The conversation continues as long as the user wants.
5. At any point, the user can press "Generate note from this conversation".
6. `chat.js` sends the full conversation to Claude with a system prompt asking it to produce a clean, well-titled note from the discussion.
7. The generated note is shown in a preview panel.
8. User accepts: note is saved with `source: 'ai-chat'`, user navigated to `note.html?id=<id>`.
9. User rejects: stays in chat, can continue talking and try again.

Anthropic key resolution:
- Check `inkwell-settings` in localStorage for `anthropic_key`.
- If not present, show a prompt directing the user to settings.

---

## Note editing methods

From `note.html`, three ways to update an existing note.

### 1. Inline editing (existing)

Tap text, type, autosave. As described in the inline editing design section.

### 2. Voice append

A microphone button in the note toolbar.

Flow:
1. User taps the mic button. Recording begins (same `MediaRecorder` logic as `voice.js`, inlined or imported).
2. On stop, audio is transcribed via Mistral.
3. The transcribed text is appended to the note body at the current cursor position, or at the end if no cursor.
4. Autosave fires immediately after append.
5. The user can continue editing inline.

This does not navigate away from the note. Everything happens in place.

### 3. AI edit

An "AI edit" button in the note toolbar.

Flow:
1. User taps the AI edit button. A slide-up panel opens (does not navigate away).
2. The panel shows a text input: "What would you like to change?"
3. The user types or dictates their instruction (e.g. "Make this more concise" / "Add a section about X").
4. `chat.js` (or an inline function in `note.js`) sends the current note body plus the user's instruction to Claude.
5. Claude returns a revised note body.
6. The panel shows a side-by-side or before/after diff view.
7. User accepts: the note body is replaced and autosave fires.
8. User rejects: the panel closes, the note is unchanged.
9. User can edit further inline after accepting.

The AI edit panel is non-destructive until the user explicitly accepts.

---

## Settings

`settings.html` — hidden, not linked from the directory. Accessible only if you know the URL (`/inkwell/settings`).

### Unauthenticated settings

- Mistral API key input (saved to `inkwell-settings.mistral_key` in localStorage)
- Anthropic API key input (saved to `inkwell-settings.anthropic_key` in localStorage)
- Keys are masked by default, toggle to reveal

### Admin settings (additional when logged in)

- Same API key inputs (stored in localStorage, not D1)
- Logout button
- Danger zone: clear all local data

`settings.js` reads and writes `inkwell-settings` in localStorage. It never contacts the Worker.

---

## Frontend files and responsibilities

**`store.js`**
- localStorage adapter.
- Exports: `getChildren(parentId)`, `getNode(id)`, `putNode(node)`, `deleteNode(id)`, `getAllDescendants(id)`
- `getChildren(null)` returns top-level nodes sorted by position.
- Deleting a folder recursively deletes all descendants.

**`db.js`**
- IndexedDB adapter (authenticated mode).
- Same export surface as `store.js`.
- Opens `inkwell-db` v1, `nodes` store, `parent_id` and `updated_at` indexes.

**`api.js`**
- All HTTP calls to the Worker.
- `API_BASE` constant at top.
- Auth: reads token from `sessionStorage`, attaches `Authorization: Bearer` header.
- Exports: `fetchChildren(parentId)`, `fetchNode(id)`, `createNode(data)`, `updateNode(id, data)`, `deleteNode(id)`, `syncSince(updatedAfter)`

**`storage.js`**
- Thin adapter. Checks `sessionStorage` for auth token.
- If authenticated: delegates to `db.js` + queues writes to `api.js` in background.
- If not: delegates to `store.js`.
- Sole import for data access in `app.js`, `note.js`, `voice.js`, `chat.js`.

**`app.js`**
- Renders directory: breadcrumb, folder/note list.
- "+" button opens creation menu: "New note", "Voice note", "AI chat".
- Create/rename/delete actions.
- Drag-to-reorder.
- URL: `/inkwell/` (top-level) or `/inkwell/?folder=<id>`.

**`note.js`**
- Renders note at `note.html?id=<id>`.
- Title and body are `contenteditable` divs.
- Autosave debounced 800ms.
- Mic button: voice append flow (records, transcribes, appends).
- AI edit button: opens slide-up edit panel.
- Save indicator dot.

**`voice.js`**
- Standalone voice recorder for new note creation.
- `MediaRecorder` API, audio captured as WebM/Opus.
- Sends to Mistral Voxtral on stop.
- Shows transcription for review, then saves and navigates to `note.html`.

**`chat.js`**
- AI chat interface for new note creation or note editing assistance.
- Maintains conversation history array.
- Sends to Anthropic Messages API.
- "Generate note" sends conversation + system prompt to produce a note.
- "Generate edit" sends note body + instruction + system prompt to produce a revised body.
- Both show a preview/diff before committing.

**`settings.js`**
- Reads/writes `inkwell-settings` in localStorage.
- Admin login form (token entry, stores to `sessionStorage`).
- Logout: clears token, reloads.

---

## AI integrations

### Mistral Voxtral (transcription)

- Endpoint: `https://api.mistral.ai/v1/audio/transcriptions`
- Model: `voxtral-mini-latest`
- Auth: `Authorization: Bearer <mistral_key>`
- Input: audio blob as `multipart/form-data`
- Output: `{ text: "..." }`
- Used in: voice note creation, voice append in note editing

### Anthropic Claude (note generation and editing)

- Endpoint: `https://api.anthropic.com/v1/messages`
- Default model: `claude-haiku-4-5-20251001` (fast, cheap for chat)
- Auth: `x-api-key: <anthropic_key>` + `anthropic-version: 2023-06-01`
- Used in: AI chat note creation, AI note editing

**System prompt for note generation from conversation:**

```
You are a note-writing assistant. The user has just had a conversation.
Your job is to produce a clean, well-organised note capturing the key ideas from that conversation.
Write in plain text, no markdown headers. Use short paragraphs.
Output format: first line is the note title, blank line, then the note body.
```

**System prompt for note editing:**

```
You are a note editor. The user has an existing note and wants to change it.
Apply their instruction precisely. Return only the revised note body — no explanation, no preamble.
Preserve the overall voice and structure unless the instruction asks you to change it.
```

---

## Backend (Cloudflare Worker)

### `worker/index.js`

**Auth middleware**
- Reads `Authorization: Bearer <token>`, compares to `AUTH_TOKEN` secret.
- Returns 401 on mutating routes if missing or wrong.

**Routes**

```
GET  /api/nodes?parent_id=<id>
  -> Children of folder, sorted by position ASC. parent_id absent = top-level (IS NULL).

GET  /api/nodes/:id
  -> Single node or 404.

GET  /api/nodes/sync?since=<iso-datetime>             (auth)
  -> Nodes WHERE updated_at > since, for incremental sync.

POST /api/nodes                                       (auth)
  -> Create node. Returns created node with server-assigned created_at/updated_at.

PUT  /api/nodes/:id                                   (auth)
  -> Update node fields. Returns updated node.

DELETE /api/nodes/:id                                 (auth)
  -> Delete node and all descendants (recursive CTE in D1).
  -> Returns 204.
```

**CORS:** `Access-Control-Allow-Origin: *`, preflight OPTIONS handled.

---

## Inline editing design

- `note.html` title and body are `div` elements with `contenteditable="true"`.
- No visible textarea, input border, or box shadow.
- On focus: cursor appears, very subtle background tint.
- On blur or 800ms after last keystroke: autosave.
- `Cmd/Ctrl+S`: immediate save.
- Undo/redo: native browser contenteditable history.

```css
[contenteditable] {
  outline: none;
  border: none;
  background: transparent;
  cursor: text;
}

[contenteditable]:focus {
  background: rgba(0,0,0,0.03);
}
```

---

## Navigation model

```
/inkwell/               -> top-level directory
/inkwell/?folder=<id>   -> folder contents
/inkwell/note?id=<id>   -> note view/edit
/inkwell/voice?parent=<id>  -> voice note creation (saves to parent folder)
/inkwell/chat?parent=<id>   -> AI chat note creation
/inkwell/chat?edit=<id>     -> AI chat in note-editing mode (loads note, returns to it)
/inkwell/settings       -> settings (hidden)
```

---

## Offline support

- Unauthenticated: localStorage always available offline.
- Authenticated: IndexedDB is the offline cache. API writes are fire-and-forget; local write is preserved on failure.
- Voice and AI features require network (Mistral and Anthropic APIs). When offline, mic and AI buttons are disabled with a "Requires connection" tooltip.
- Service worker caches all HTML and JS. App shell available offline after first load.

---

## Design constraints

- Vanilla JS, ES modules, no frameworks.
- System color keywords only (`Canvas`, `CanvasText`, `Field`, `FieldText`). No hardcoded hex.
- Font: system font stack, rem-based.
- Mobile-first. 44px minimum touch targets.
- `prefers-reduced-motion` respected for transitions and animations.
- API keys never leave the browser. Never sent to the Worker.

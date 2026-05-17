# Inkwell — Development Stages

Each stage is independently shippable. Later stages build on earlier ones without requiring rewrites.

**Legend:** DONE = complete and committed. PARTIAL = built but untested or blocked. TODO = not started.

---

## Stage 1 — Static scaffold `DONE`

**Goal:** A working directory page in the browser with hardcoded data. No JS, no storage. Establish the HTML structure and visual design.

**What gets built:**
- `index.html`: breadcrumb area, folder/note listing with hardcoded items (2 folders, 2 notes)
- `note.html`: note title and body rendered as static text
- `<style>` blocks: system color keywords, typography, list item sizing, touch targets
- `manifest.json`: minimal PWA manifest (name, display)

**Design decisions to lock in at this stage:**
- Folder items show a folder icon (unicode or SVG) + title
- Note items show a document icon + title + last-edited timestamp
- No visible borders or boxes — directory looks like a clean list
- Breadcrumb at top: "Inkwell / Folder Name / Subfolder Name"

**Done when:** Both pages render correctly in a browser. Light and dark mode look right. Touch targets are at least 44px tall on mobile.

---

## Stage 2 — localStorage data layer (unauthenticated) `DONE`

**Goal:** Replace hardcoded data with items read from and written to localStorage. App works fully offline with no backend.

**What gets built:**
- `store.js`: `getChildren(parentId)`, `getNode(id)`, `putNode(node)`, `deleteNode(id)`, `getAllDescendants(id)`
- `storage.js`: thin adapter (for now always delegates to `store.js` — authenticated path added in Stage 6)
- `app.js`: reads current folder from `?folder=<id>` URL param, calls `storage.getChildren`, renders the list
- `note.js`: reads `?id=<id>` URL param, calls `storage.getNode`, renders title and body

**Data seeding:** a small `seed()` in `app.js` (called once, guarded by a flag) populates 2 folders and 3 notes for development.

**Done when:** Seeded data renders correctly on both pages. Navigating into a folder shows only that folder's children. Navigating to a note shows the correct note. Turning off the network changes nothing.

---

## Stage 3 — Inline note editing and autosave `DONE`

**Goal:** Tapping any text in a note opens editing in place. No visible textarea. Autosave after typing stops.

**What gets built:**
- `note.html` title and body become `contenteditable="true"` divs
- CSS: `[contenteditable] { outline: none; border: none; background: transparent; cursor: text; }` with subtle focus tint
- `note.js`: `input` event listener on both fields, debounced 800ms autosave via `storage.putNode`
- `document.title` updates live as the title changes
- `Cmd/Ctrl+S` forces immediate save
- Save indicator: small status text/dot ("Saved" fades in after save)
- Back link: returns to `?folder=<parent_id>` or `/inkwell/` for top-level notes

**Done when:** Tapping note text on mobile brings up keyboard and editing begins immediately. Typing and pausing saves. Navigating away and back shows saved content. No visible textarea borders at any point.

---

## Stage 4 — Directory actions (create, rename, delete) `DONE`

**Goal:** Users can create new folders and notes, rename existing ones, and delete them.

**What gets built:**
- "+" button in `index.html` opens a creation menu: "New folder", "New note" (voice and AI chat options added in later stages)
- Tapping a folder name navigates into it
- Long-press or swipe on a list item reveals rename and delete actions
- Rename: inline edit of the item title, confirm on blur or Enter
- Delete: confirmation, recursively deletes descendants via `storage.deleteNode`
- `position` values assigned on create (append to end)

**Done when:** Full CRUD works from the directory. Creating a note then opening it shows an empty editable note. Deleting a folder removes it and all children. Renaming updates immediately.

---

## Stage 5 — Service worker and PWA `DONE`

**Goal:** App is installable and works offline after first load.

**What gets built:**
- `sw.js`: `normalizeUrl` function, `ASSETS` array listing all HTML/JS files, cache-first fetch handler
- Register service worker in all HTML files
- `manifest.json`: complete (icons, theme color, start URL, display mode)
- `icon-192.png` and `icon-512.png`

**Done when:** App installs as a PWA. Offline load after first visit works. DevTools Application tab shows service worker active and cache populated.

---

## Stage 6 — Admin auth and IndexedDB layer `DONE`

**Goal:** Admin can log in with a token. Authenticated mode uses IndexedDB and is ready for D1 sync.

**What gets built:**
- `db.js`: IndexedDB adapter with the same export surface as `store.js`. Opens `inkwell-db` v1, `nodes` store, `parent_id` and `updated_at` indexes.
- `storage.js` updated: checks `sessionStorage` for `inkwell-auth-token`. If present, delegates to `db.js`; otherwise `store.js`.
- `settings.html` + `settings.js`: admin token entry (stores to `sessionStorage`), logout button. Hidden path `/inkwell/settings`.
- On login: triggers a full sync from the API (stub for now, populated in Stage 7).
- On logout: clears token, reloads, falls back to localStorage.

**Done when:** Logging in with a valid token switches the storage backend. Logging out falls back to localStorage. Both modes look identical from the directory's perspective.

---

## Stage 7 — Cloudflare Worker API (read + write + sync) `PARTIAL — code written, Worker not deployed`

**Goal:** Authenticated mode syncs to and from Cloudflare D1 via a Worker.

**What gets built:**
- `worker/wrangler.toml`: D1 binding
- `worker/schema.sql`: nodes table with `source` column
- `worker/index.js`: all routes (GET children, GET node, GET sync, POST, PUT, DELETE with recursive descendant delete), auth middleware, CORS
- `api.js`: `fetchChildren`, `fetchNode`, `createNode`, `updateNode`, `deleteNode`, `syncSince`
- `storage.js` updated: authenticated writes go to IndexedDB first, then fire-and-forget to API; on load, syncs changes from D1 since `inkwell-last-sync`

**Sync strategy:**
- On login: full sync via `GET /api/nodes/sync` (no `since`), all nodes written to IndexedDB.
- On subsequent loads: `GET /api/nodes/sync?since=<inkwell-last-sync>`, write new/changed nodes to IndexedDB.
- Writes: IndexedDB write first, then API call. Failure preserves local write.

**Done when:** Creating a note while logged in appears in D1. Logging out and back in on a fresh device shows all notes. Deleting a folder removes it and all descendants from D1.

---

## Stage 8 — Settings and API key management `DONE`

**Goal:** Users can store Mistral and Anthropic API keys. Admin can manage them from the same settings page.

**What gets built:**
- `settings.html` expanded: Mistral API key field, Anthropic API key field (masked, toggle to reveal)
- `settings.js`: reads/writes `inkwell-settings` in localStorage (`mistral_key`, `anthropic_key`)
- A `getSettings()` helper exported from `settings.js` for use in `voice.js` and `chat.js`
- Keys are validated format-only (not verified against the API at save time)
- If a key is missing when a feature needs it: show a clear inline prompt with a link to settings

**Key storage rules:**
- API keys always go to localStorage, never IndexedDB, never D1, never the Worker.
- This is true for both unauthenticated and authenticated modes.

**Done when:** User can enter and save both API keys. Keys persist across sessions. Attempting a voice or AI feature without a key shows a helpful prompt pointing to settings.

---

## Stage 9 — Voice note creation `PARTIAL — code done, untested (blocked by Worker)`

**Goal:** User can record a voice note, get it transcribed by Mistral, review it, and save it as a note.

**What gets built:**
- `voice.html` + `voice.js`: standalone voice recorder page
- `MediaRecorder` API, audio captured as WebM/Opus
- "Record" / "Stop" toggle button with a live recording timer
- On stop: audio blob sent to `https://api.mistral.ai/v1/audio/transcriptions` with model `voxtral-mini-latest`
- Transcription shown in a review area — user can read and optionally edit it before saving
- "Save as note" button: creates a node with `source: 'voice'`, title auto-generated from first ~50 chars of transcription, navigates to `note.html?id=<id>`
- "Retake" button: discards and re-records
- `voice.html` accepts `?parent=<id>` to set the destination folder
- "+" creation menu in `index.html` now includes "Voice note" option

**Error handling:**
- No Mistral key: prompt directing to settings before recording starts
- Mic permission denied: clear message, no crash
- Transcription API error: show error, offer retry

**Done when:** Recording a voice note, transcribing it, and saving creates a readable note in the correct folder. The note is editable inline after saving.

---

## Stage 10 — Voice append to existing notes `PARTIAL — code done, untested (blocked by Worker)`

**Goal:** From within a note, the user can record a voice clip and have it appended to the note body.

**What gets built:**
- Microphone button in the `note.html` toolbar
- Tapping it starts recording (same `MediaRecorder` logic as Stage 9, inlined in `note.js`)
- Visual recording state: button pulses, timer shows
- On stop: transcribes via Mistral, appends transcribed text to the note body at the cursor (or at the end)
- Autosave fires immediately after append
- The user can continue editing inline straight away

**Done when:** Tapping the mic in a note, speaking, stopping, and seeing the transcribed text appear in the note body without navigating away.

---

## Stage 11 — AI chat note creation `PARTIAL — code done, untested (blocked by Worker)`

**Goal:** User can have a conversation with Claude, then generate a note from that conversation.

**What gets built:**
- `chat.html` + `chat.js`: chat interface page
- Message list (user and assistant turns), text input, send button
- Conversation history maintained as an array in memory
- Each user message + full history sent to Anthropic Messages API (`claude-haiku-4-5-20251001`)
- "Generate note from conversation" button always visible
- On click: sends conversation to Claude with a note-generation system prompt
- Claude returns a first line (title) and body
- Preview panel shows the generated note before saving
- "Save" creates the node with `source: 'ai-chat'`, navigates to `note.html?id=<id>`
- "Reject / Keep chatting" closes preview, returns to conversation
- `chat.html` accepts `?parent=<id>` to set destination folder
- "+" creation menu in `index.html` now includes "AI chat" option

**Error handling:**
- No Anthropic key: prompt directing to settings before chat starts
- API error: show error inline, user can retry

**Done when:** Having a multi-turn conversation, pressing "Generate note", previewing, saving, and landing on an editable note in the correct folder.

---

## Stage 12 — AI note editing `PARTIAL — code done, untested (blocked by Worker)`

**Goal:** From within a note, the user can give Claude an instruction and see a revised version of the note, which they can accept or reject.

**What gets built:**
- "AI edit" button in the `note.html` toolbar
- Tapping it opens a slide-up panel (does not navigate away)
- Panel shows the current note body (read-only) and a text input: "What would you like to change?"
- User types instruction, presses "Apply"
- `note.js` sends the note body + instruction to Anthropic with the note-editing system prompt
- Claude returns a revised body
- Panel shows a before/after view (old body on left/top, new body on right/bottom, or toggled)
- "Accept": replaces note body, closes panel, autosave fires
- "Reject": closes panel, note unchanged
- After accepting, user can continue editing inline or run another AI edit

**System prompt for editing:**

```
You are a note editor. Apply the user's instruction to the note below.
Return only the revised note body. No explanation, no preamble, no markdown code fences.
Preserve the voice and structure unless the instruction asks you to change it.
```

**Done when:** Opening the AI edit panel, giving an instruction like "make this shorter", seeing a revised version, accepting it, and seeing the note body update in place.

---

## Stage 13 — Reordering and position management `DONE`

**Goal:** Folders and notes in a directory can be reordered by drag (desktop) or long-press drag (mobile).

**What gets built:**
- Drag-and-drop via native HTML5 drag events or Pointer Events API (no library)
- On drop: recalculate `position` values for affected nodes, call `storage.putNode` for each
- Visual feedback: dragged item semi-transparent, drop target shows insertion line
- In authenticated mode: position changes sync to D1 via `PUT /api/nodes/:id`

**Done when:** Dragging a folder or note to a new position persists after reload. Works on touch and mouse.

---

## Stage 14 — Polish and edge cases `TODO`

**Goal:** Handle real-world usage edge cases. Smooth the experience on mobile.

**What gets built:**
- Empty state: "No notes yet" with "New note" prompt
- Very long titles: truncate with ellipsis in directory, wrap fully in note view
- Note with no title: "Untitled" placeholder (not stored), shown in grey in directory
- Back gesture on note.html goes to correct folder
- Keyboard shortcuts: `Cmd/Ctrl+S` save, `Escape` blur editing
- iOS tap delay: `touch-action: manipulation` on interactive elements
- Paste: strip rich text, paste plain text in body
- Large folders: warning if >200 children
- `?folder=<invalid-id>`: graceful fallback to top-level
- Voice and AI buttons disabled with "Requires connection" tooltip when offline
- API errors surfaced clearly, never silently swallowed

**Done when:** No console errors. All edge cases handled. iOS editing works without delay. Offline mode degrades gracefully with clear indicators.

---

## Stage 15 — Production deployment `TODO`

**Goal:** Live at `wecreatethis.com/inkwell`.

**Steps:**
1. Create D1 database via Cloudflare dashboard, run `worker/schema.sql`
2. Deploy Worker via `wrangler deploy`
3. Set `AUTH_TOKEN` via `wrangler secret put AUTH_TOKEN`
4. Add `inkwell` to root `index.html` app grid
5. Update root `CLAUDE.md` projects list
6. Push to `main` via the standard "push to prod" workflow

**Done when:** App is live. Admin can log in, create notes by all three methods, and see them persist across devices. Unauthenticated users can use all three creation methods with their own locally stored API keys.

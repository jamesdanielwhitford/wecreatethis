# Symbolic Ritual — Development Stages

Each stage is independently shippable. Later stages build on earlier ones without requiring rewrites.

---

## Stage 1 — Static scaffold

**Goal:** A working page in the browser with no data, no backend, no service worker. Establish the HTML structure, CSS layout rules, and visual design.

**What gets built:**
- `index.html` with correct semantic structure (`<main>`, `<article>`, `<figure>`, `<figcaption>`)
- Inline or `<style>` block covering: system color scheme, media sizing rules, quarter-screen gap, typography
- One hardcoded item (image or video) to verify layout
- `manifest.json` (minimal: name, icons, display)

**Done when:** Loading `index.html` locally shows a correctly laid-out item. Light and dark mode both look correct. Media stops growing at natural dimensions.

---

## Stage 2 — Local data layer (IndexedDB)

**Goal:** Replace the hardcoded item with data read from IndexedDB. App works fully offline with locally stored items.

**What gets built:**
- `db.js`: open `symbolic-ritual-db`, define `items` store, export `getItems`, `getItem`, `putItem`, `deleteItem`
- `app.js`: on load, call `db.getItems()`, render each item as a `<figure>` using a `renderItem(item)` function
- Seed script or browser console snippet to insert test items into IndexedDB

**Done when:** Seeding IndexedDB manually and reloading the page shows all items rendered in correct order. Turning off the network changes nothing.

---

## Stage 3 — Scroll behaviour and URL tracking

**Goal:** The URL updates as items scroll into view. Loading a URL with `?item=N` opens that item directly.

**What gets built:**
- `IntersectionObserver` on each `<figure>`, threshold 0.5, calls `history.replaceState({ id }, '', '?item=' + id)`
- On page load: parse `URLSearchParams` for `item`, call `db.getItem(id)`, render that item first, then load the rest
- Debounce: URL only updates when the active item ID actually changes (no replaceState spam)
- Infinite scroll: sentinel `<div>` at bottom of list, `IntersectionObserver` triggers `loadMore()` which calls `db.getItems({ before: lowestId })`

**Done when:** Scrolling through items updates the URL correctly. Copying the URL and pasting into a new tab opens the correct item. Scrolling to the bottom loads more items (from IndexedDB).

---

## Stage 4 — Service worker and PWA

**Goal:** App is installable and works offline after first load.

**What gets built:**
- `sw.js`: `normalizeUrl` function, `ASSETS` array listing all HTML and JS files, cache-first fetch handler
- Register service worker in `index.html`
- `manifest.json`: complete (icons, theme color, start URL, display mode)
- `icon-192.png` and `icon-512.png`

**Done when:** App installs as a PWA. Loading offline after first visit works. DevTools Application tab shows service worker active and cache populated.

---

## Stage 5 — Cloudflare Worker API (read-only)

**Goal:** Items are fetched from D1 via the Worker. The page syncs from the API in the background, writing results to IndexedDB.

**What gets built:**
- `worker/wrangler.toml`: D1 and R2 bindings
- `worker/index.js`: GET `/api/items` and GET `/api/items/:id` routes, CORS headers, D1 queries
- D1 schema applied via `wrangler d1 execute`
- `api.js`: `fetchItems(before, limit)` and `fetchItem(id)` functions, `API_BASE` constant
- `app.js` updated: after rendering from IndexedDB, call `api.fetchItems()`, write new items to IndexedDB, render any that weren't already shown

**Done when:** Items inserted directly into D1 (via Wrangler CLI) appear in the page on next load. IndexedDB is populated from the API. Turning off network after first load still works.

---

## Stage 6 — Admin UI (create and upload)

**Goal:** A hidden admin page for adding new items without touching the CLI.

**What gets built:**
- `admin.html`: token gate form (checks `sessionStorage`), upload form, item list
- `admin.js`: token auth flow, upload flow (presigned URL → R2 PUT → metadata POST), item list render
- `worker/index.js` updated: POST `/api/items`, POST `/api/upload` (presigned R2 URL generation), auth middleware
- `api.js` updated: `createItem`, `getUploadUrl`

**Form fields:**
- File picker (image or video)
- Alt text (required for images)
- Captured date and time
- Latitude and longitude
- Caption (optional)
- Language tag (optional, defaults to `en`)

**Done when:** Visiting `/symbolicritual/admin`, entering the token, filling the form, and submitting results in a new item appearing on the main page on next load.

---

## Stage 7 — Admin UI (edit and delete)

**Goal:** Existing items can be updated or removed from the admin page.

**What gets built:**
- Item list in `admin.html` with edit and delete buttons per item
- Edit: populates form with existing values, submits as PUT
- Delete: confirms, calls DELETE endpoint, removes from IndexedDB
- `worker/index.js` updated: PUT `/api/items/:id`, DELETE `/api/items/:id` (also deletes from R2)
- `api.js` updated: `updateItem`, `deleteItem`

**Done when:** Editing an item updates it on the main page. Deleting an item removes it from the page and from R2.

---

## Stage 8 — Accessibility and i18n pass

**Goal:** Every accessibility and internationalisation requirement from the spec is verified and complete.

**Checklist:**
- [ ] Each `<figcaption>` has correct `lang` and `dir` attributes derived from item's `lang` field
- [ ] RTL captions (Arabic, Hebrew, Urdu, Farsi, etc.) render right-aligned with correct flow
- [ ] All colors are CSS system color keywords, no hardcoded hex
- [ ] `prefers-reduced-motion` gates video autoplay
- [ ] All images have non-empty `alt` text
- [ ] `<video>` elements have a `<track kind="captions">` slot (even if `src` is empty)
- [ ] `font-size` is rem-based throughout, scales with browser default
- [ ] Page works at 200% browser zoom without horizontal scroll
- [ ] Keyboard navigation reaches all interactive elements
- [ ] Screen reader test: item date, coordinates, and caption are all announced

**Done when:** All checklist items pass. Tested in at least one RTL language (Arabic or Hebrew caption).

---

## Stage 9 — Polish and edge cases

**Goal:** Handle real-world usage edge cases.

**What gets built:**
- Loading state: skeleton placeholder shown while first items load
- Empty state: message shown if no items exist yet
- Error state: network failure shows cached content with a subtle offline indicator
- Video: poster frame shown before play, controls visible, no autoplay on `prefers-reduced-motion`
- Large media: lazy loading (`loading="lazy"` on images, `preload="metadata"` on video)
- `?item=N` where N doesn't exist: graceful fallback to top of feed
- Admin: validation errors shown inline (missing alt text, invalid coordinates, future capture date)

**Done when:** All edge cases handled gracefully. No console errors on a clean first load or offline load.

---

## Stage 10 — Production deployment

**Goal:** Live at `wecreatethis.com/symbolicritual`.

**Steps:**
1. Create D1 database via Cloudflare dashboard, run schema migration
2. Create R2 bucket, enable public access, set CORS policy
3. Deploy Worker via `wrangler deploy`
4. Set `AUTH_TOKEN` via `wrangler secret put AUTH_TOKEN`
5. Add `symbolicritual` to root `index.html` app grid
6. Update root `CLAUDE.md` projects list
7. Push to `main` via the standard "push to prod" workflow

**Done when:** App is live, accessible, and a first real item can be posted via the admin page.

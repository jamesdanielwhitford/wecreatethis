# Symbolic Ritual — Architecture

## Overview

A local-first media blog. The frontend reads from IndexedDB first and syncs with a Cloudflare Worker API in the background. The Worker is the only database-specific layer: swapping D1 for another database means rewriting only `worker/index.js`.

```
Browser
  └── index.html / admin.html
        ├── app.js / admin.js   (UI logic)
        ├── db.js               (IndexedDB, local cache)
        └── api.js              (HTTP client, Worker API)
                                      │
                          Cloudflare Worker (worker/index.js)
                                      │
                          ┌───────────┴───────────┐
                        D1 (metadata)          R2 (media files)
```

---

## Frontend

### Local-first data flow

1. On page load, `db.js` opens IndexedDB and reads the most recent items immediately.
2. `api.js` fetches the same range from the Worker in the background.
3. Any items in the API response not already in IndexedDB are written to IndexedDB and appended to the page.
4. Subsequent scroll pagination fetches from the API and writes through to IndexedDB.

This means the page renders instantly on repeat visits even with no network.

### Files and responsibilities

**`db.js`**
- Opens and upgrades `symbolic-ritual-db` (version 1)
- Exports: `getItems(before, limit)`, `getItem(id)`, `putItem(item)`, `deleteItem(id)`
- Schema mirrors D1 exactly so synced data can be stored without transformation

**`api.js`**
- Exports: `fetchItems(before, limit)`, `fetchItem(id)`, `createItem(data)`, `updateItem(id, data)`, `deleteItem(id)`, `getUploadUrl(filename, contentType)`
- `API_BASE` constant at the top — change this one value to point at any backend
- All auth handled here: reads token from `sessionStorage`, attaches `Authorization` header
- Database-agnostic: callers in `app.js` and `admin.js` know nothing about D1 or Cloudflare

**`app.js`**
- Renders the item feed from IndexedDB, then syncs from API
- `IntersectionObserver` on each `<figure>`: when the item crosses 50% viewport, calls `history.replaceState` to set `?item=N`
- On load: reads `?item=N` from URL, calls `db.getItem(N)` (falls back to `api.fetchItem(N)`), scrolls to it
- Infinite scroll: `IntersectionObserver` on a sentinel element at the bottom of the list triggers `loadMore()`
- `prefers-reduced-motion` check gates video autoplay

**`admin.js`**
- Token gate: checks `sessionStorage` for auth token, shows login form if absent
- Upload flow:
  1. User selects file and fills form
  2. `api.getUploadUrl(filename, contentType)` fetches a presigned R2 URL
  3. File is PUT directly to R2 (bypasses Worker for binary transfer)
  4. `api.createItem({ media_url, media_type, captured_at, lat, lng, caption, lang, alt })` posts metadata
- Edit: populates form with existing item data, calls `api.updateItem`
- Delete: calls `api.deleteItem`, removes from IndexedDB via `db.deleteItem`

---

## Backend (Cloudflare Worker)

### `worker/index.js`

Single Worker file. All D1 and R2 interaction is here. Replacing this file with a different implementation is the only change needed to move to a different database.

**Auth middleware**
- Reads `Authorization: Bearer <token>` header
- Compares to `AUTH_TOKEN` Worker secret (set via `wrangler secret put AUTH_TOKEN`)
- Returns 401 if missing or wrong on any mutating route

**Routes**

```
GET  /api/items?limit=20&before=<id>
  → SELECT * FROM items WHERE id < ? ORDER BY id DESC LIMIT ?
  → Returns array of item objects

GET  /api/items/:id
  → SELECT * FROM items WHERE id = ?
  → Returns single item object or 404

POST /api/items                         (auth)
  → INSERT INTO items (...) VALUES (...)
  → Returns created item with assigned id

PUT  /api/items/:id                     (auth)
  → UPDATE items SET ... WHERE id = ?
  → Returns updated item

DELETE /api/items/:id                   (auth)
  → DELETE FROM items WHERE id = ?
  → Also deletes media file from R2
  → Returns 204

POST /api/upload                        (auth)
  → Generates R2 presigned PUT URL for direct browser-to-R2 upload
  → Returns { uploadUrl, mediaUrl }
  → mediaUrl is the public R2 URL stored in the items table
```

**CORS**
- `Access-Control-Allow-Origin: *` on all responses (public read API)
- Preflight OPTIONS handled

### `worker/wrangler.toml`

```toml
name = "symbolic-ritual"
main = "index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "symbolic-ritual"
database_id = "<your-d1-id>"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "symbolic-ritual-media"
```

### D1 schema

```sql
CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  media_url    TEXT    NOT NULL,
  media_type   TEXT    NOT NULL CHECK(media_type IN ('image','video')),
  captured_at  TEXT    NOT NULL,
  lat          REAL,
  lng          REAL,
  caption      TEXT,
  lang         TEXT    DEFAULT 'en',
  alt          TEXT    NOT NULL DEFAULT ''
);
```

---

## Media storage (R2)

- Bucket: `symbolic-ritual-media`
- Public access enabled via R2 custom domain or `r2.dev` subdomain
- Upload flow: browser gets presigned URL from Worker, PUTs file directly to R2
- `media_url` in D1 is the full public URL of the R2 object
- On delete: Worker calls `MEDIA.delete(key)` to remove the file from R2

---

## Accessibility design

### Text direction per item

Each item's `lang` field holds a BCP 47 tag (e.g. `ar`, `he`, `zh-TW`). When rendering a caption:

```js
const rtlLangs = ['ar','he','fa','ur','yi','dv','ps','sd'];
const dir = rtlLangs.some(l => lang.startsWith(l)) ? 'rtl' : 'ltr';
captionEl.setAttribute('lang', lang);
captionEl.setAttribute('dir', dir);
```

`dir` is applied only to the `<figcaption>` element, not the whole page, so a Hebrew caption inside an otherwise English page renders correctly without disrupting surrounding layout.

### Color

All colors use CSS system color keywords:

```css
body {
  background-color: Canvas;
  color: CanvasText;
}
```

No hardcoded hex values in the main stylesheet. `prefers-color-scheme` is handled automatically by the browser via system colors.

### Motion

```js
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) video.setAttribute('autoplay', '');
```

---

## Offline support

Service worker uses the same `normalizeUrl` + cache-first strategy as all other apps in this repo. The IndexedDB cache means content viewed previously is available offline even after the service worker cache is cleared.

---

## Deployment

- Frontend: Cloudflare Pages, served from `main` branch under `/symbolicritual/`
- Worker: deployed separately via `wrangler deploy` from `worker/`
- D1 and R2 created once via Cloudflare dashboard or `wrangler` CLI
- `AUTH_TOKEN` set via `wrangler secret put AUTH_TOKEN`

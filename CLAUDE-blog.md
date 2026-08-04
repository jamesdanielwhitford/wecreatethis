# Blog

Folder-driven markdown blog. Adding a post is adding a folder; everything else follows automatically.

**This is now the site's homepage** (moved from `blog/` to the repo root on branch `blog-homepage`, see `sessions/overview.md`). The old app-hub grid is archived at `archive/app-hub/`, not deleted.

## Content model

- `content/{section...}/{post-slug}/index.md`. Any folder containing an `index.md` is a **post**; the folder holding post folders is a **section**. Sections nest to any depth (`content/game-dev/godot/my-post/index.md` → section `game-dev/godot`).
- Section URL: `/{section-path}`. All posts in a section render as one continuous scroll-through stack. Individual posts are addressed with a URL fragment: `/{section-path}#{post-slug}`.
- A section page also lists any sections nested below it, so intermediate paths work as index pages.
- Homepage is hand-authored at `content/home.md`, rendered at `/`. Which sections appear there, and how they're grouped, is edited by hand.
- Frontmatter: `title`, `date` (YYYY-MM-DD), `author`, `description`, optional `order` (overrides date sort), optional `draft: true` (excluded from the manifest, stays in the repo).
- Default post order: `order` ascending where set, then date descending (newest first). Readers can flip the order with the toggle on the section page.

## Build

`node build.js` (no dependencies) walks `content/` and writes `content-manifest.json` and `sitemap.xml`, which the pages fetch at runtime. A GitHub Action (`.github/workflows/blog-manifest.yml`) regenerates and commits the manifest automatically on pushes to `dev`/`main` that touch `content/`, so forgetting the manual step is harmless.

It also:

- **Records intrinsic image dimensions** per post (`images` key), read straight from the PNG/GIF/JPEG file header by hand. The renderer emits these as `width`/`height` on each `<img>` so the browser reserves the right box before the file loads. Remote (`http(s)://`) images can't be measured and are skipped.
- **Warns on bad frontmatter**: non-`YYYY-MM-DD` dates, non-numeric `order` (coerced to `null`, not `NaN`), and truthy-but-not-`"true"` `draft` values that would silently publish a post.

## Routing

`_redirects` needs **no changes for new content**: `/content/*` passes through to real files, `/` serves the homepage, and a final `/*` wildcard serves `section.html` for any section path at any depth (this now sits after every other app's own routing rules, e.g. `/tarot/*`, `/birdle/*`, so those still take priority; real files/folders for every other app are served natively by Cloudflare before `_redirects` is even consulted). Rule order matters (first match wins), and rules targeting `.../index.html` are silently ignored by Cloudflare's loop protection, so pass-throughs use self-rewrites (`/ / 200`).

## Pages and rendering

- `index.html` (home) + `section.html` (all sections) share `style.css` and a JS-rendered breadcrumb header: `wecreatethis.com / section / …`, every segment a link.
- `app.js` holds a minimal hand-rolled markdown renderer: headings, bold, italic, links, images, unordered **and ordered** lists, **tables**, blockquotes (recursive, so quoted fences work), fenced + inline code, paragraphs.
- Code blocks get a tiny language-agnostic highlighter (comments, strings, numbers, shared keyword set), no libraries. `//` preceded by `:` is not treated as a comment, so URLs survive.
- Renderer trick: fenced code, blockquotes, and tables are extracted behind NUL-delimited placeholders before other transforms, then restored at the end.
- **Paragraph wrapping skips only block-level tags.** Inline tags (`<strong>`, `<em>`, `<a>`, `<code>`) must still be wrapped, or a line starting with bold text silently loses its `<p>` and runs together with the next line. This was a real bug affecting 22 paragraphs in the published post.
- **Heading ids are prefixed `h-`** (`headingId()`), so they can never collide with a post slug, which shares the same URL fragment. Hand-written bare anchors (`#some-heading`) fall back to the prefixed id at scroll time.
- A post's leading `# H1` is dropped when it matches the frontmatter title, since the stack already renders the title from the manifest.
- **Known bug (not yet fixed): loose ordered lists.** A numbered list written with blank lines between items renders as N separate one-item `<ol>`s instead of one list, because the paragraph/blank-line split runs before list detection. Unordered lists likely have the same bug, invisibly (bullets don't number). Workaround: no blank lines between list items. See `sessions/session-014-2026-07-31.md` for the full repro; fix belongs in the list-handling regexes in `app.js`.

### Reveal frontier (do not replace with height reservation)

The stack paints in manifest order but posts render in **network-completion order**, so a slow post landing above already-painted siblings shoves them out of the viewport. That was CLS ~0.298 in prod.

`revealLoaded()` in `app.js` fixes it: a post gets `is-revealed` only once it **and every post above it** have rendered, so content is only ever appended below what is painted, never inserted above. `.post-entry:not(.is-revealed)` hides with **`visibility: hidden`, not `display: none`** - hidden posts keep their layout boxes, so the IntersectionObserver still fires and lazy loading keeps working, while invisible elements shuffle freely without counting as shifts.

Three things that must stay true:
- The failure branch in `loadEntry` also sets `is-loaded` and calls `revealLoaded()`. Without it one failed fetch leaves every post below it hidden forever.
- `revealLoaded` toggles `is-revealed` **both ways** and iterates the live DOM, because the reading-order toggle can move a revealed post below an unloaded one.
- **Height reservation cannot work here** and was tried four ways. Estimates are viewport-width-dependent (the same markdown is ~3700px at 412px wide) and wrong by hundreds of px. `content-visibility` is worse still: it never skips elements near the viewport, so the reservation never applies where it matters, and its initial unskip adds its own shift (measured 0.456, worse than the bug). Full write-up in `sessions/session-010-cls-diagnosis.md`.

## Theme

Light/dark follows the system setting via `prefers-color-scheme`, **no toggle** (unlike bird-bingo, which has one). All colours are CSS custom properties on `:root`, overridden in a single `@media (prefers-color-scheme: dark)` block. Muted greys are kept at or above 4.5:1 on their own background in both themes. Both pages carry paired `theme-color` meta tags.

## Service worker (`sw.js`)

This is now the site's only service worker (the old root app-hub `sw.js` is archived). Differs from the pre-move repo-wide SW convention that used to apply to the app-hub, deliberately:

- `ASSETS` is the app shell only, listed as canonical extensionless URLs (never `.html` URLs; fetching `/index.html` returns section.html via the redirect wildcard and would poison the cache). `/sw-toast.js` is in there too.
- Post/content URLs are derived from `content-manifest.json` at install; **do not add posts to `ASSETS` by hand**.
- Content + manifest are network-first with cache fallback, so new posts appear without a SW version bump.
- **Shell is stale-while-revalidate**: the cached copy is served instantly, a background fetch refreshes it, and when a shell asset actually changed (`responsesDiffer`) the SW posts `sw-updated` so `/sw-toast.js` offers a refresh. It used to be strictly cache-first with no revalidation, which pinned visitors to an old `app.js` while they picked up new CSS - new theme with old renderer, which reads as broken rendering rather than a stale cache.
- `cleanResponse()` strips redirect metadata on every `cache.put` (mandatory repo-wide; section paths are `_redirects` rewrites). Install fetches use `cache: 'reload'` so a `CACHE_NAME` bump can't pre-cache a stale shell.
- Offline navigation to an unvisited section falls back to the cached `section.html` shell.
- Current version: `wecreatethis-v26` (bumped from `blog-v12` on the move, since scope/ASSETS changed).

**Testing gotcha:** because the shell is cached, edits to `app.js`/`style.css` may not take effect on reload, and measurements can silently reflect old code. When testing, defeat the SW (`Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined, configurable: true })` as an init script) and confirm the code under test is really running.

## Known issues

- When debugging layout shift here, remember `LayoutShiftAttribution` rects are **clipped to the viewport** - a current rect of `0x0` means the element was pushed out of view, not that it collapsed. Misreading this cost three failed fix attempts.
- **SEO ceiling.** Posts are `#fragment`s on a section page, so every post in a section shares one URL and one `<title>`. Search results and social cards can only ever point at a section. Fixing this means emitting static per-post HTML from `build.js` (viable - it already parses every post - but not done).
- `content/test/` is **published, not draft**, and linked from the homepage. It's renderer/navigation test content, kept live deliberately for testing on the real site; flip to `draft: true` when done.
- **Loose ordered lists break** - see the list-rendering note above.
- `archive/app-hub/index.html`'s internal links (styles.css, icon-192.png, its own service-worker registration at scope `/`) are stale now that it no longer lives at the actual root - harmless since nothing links to it and it isn't in the sitemap, but don't load it directly expecting it to render or behave correctly.

## Adding a post (the whole workflow)

1. Create `content/{section}/{post-slug}/index.md` with frontmatter.
2. Run `node build.js` (or let CI do it on push).
3. Done. No `_redirects` change, no SW change, no version bump.

## Local preview

Plain static servers 404 on clean URLs; use Cloudflare's emulator from the repo root:

```
npx wrangler pages dev . --port 8080
```

# Blog

Folder-driven markdown blog. Adding a post is adding a folder; everything else follows automatically.

**This is now the site's homepage** (moved from `blog/` to the repo root on branch `blog-homepage`, see `sessions/overview.md`). The old app-hub grid is archived at `archive/app-hub/`, not deleted.

## Content model

- `content/{section...}/{post-slug}/index.md`. Any folder containing an `index.md` is a **post**; the folder holding post folders is a **section**. Sections nest to any depth (`content/game-dev/godot/my-post/index.md` → section `game-dev/godot`).
- Section URL: `/{section-path}`, a table of contents listing that section's own posts. Post URL: `/{section-path}/{post-slug}`, a real route rendering that one post standalone - **every folder and every post is its own route**, there is no shared multi-post stack.
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
- **Heading ids are prefixed `h-`** (`headingId()`). The prefix predates the routing change (it used to avoid colliding with a post slug sharing the same URL fragment) but is kept: it's a harmless, cheap guarantee that a heading id can never collide with anything else on the page.
- A post's leading `# H1` is dropped when it matches the frontmatter title, since the post page already renders the title in the header (`#section-title`) from the manifest.
- **Known bug (not yet fixed): loose ordered lists.** A numbered list written with blank lines between items renders as N separate one-item `<ol>`s instead of one list, because the paragraph/blank-line split runs before list detection. Unordered lists likely have the same bug, invisibly (bullets don't number). Workaround: no blank lines between list items. See `sessions/session-014-2026-07-31.md` for the full repro; fix belongs in the list-handling regexes in `app.js`.

### Routing: every folder and post is its own route (no more shared stack)

Originally all posts in a section rendered as one continuous scroll-through stack, addressed by URL fragment (`/{section}#{post-slug}`), with lazy loading and a "reveal frontier" mechanism to keep CLS at zero as posts rendered out of order. That model is gone: `/{section...}/{post-slug}` is now a real path, and a post page renders **only that one post**, standalone, with nothing else in the DOM to load, sequence, or scroll into.

`parseBlogPath()` in `app.js` splits the URL into section + post by checking the manifest: everything but the last path segment is tried as a section path, and if that section has a post whose slug matches the last segment, it's a post page; otherwise the whole path is the section (a table of contents). This means it needs the manifest loaded first, unlike the old fragment-based version.

Because there's only ever one post on a post page, the old reveal-frontier/lazy-load/reading-order-toggle machinery (`revealLoaded()`, the `IntersectionObserver`, `is-loaded`/`is-revealed` bookkeeping, `#sort-toggle`) no longer exists - there's nothing to sequence against. In-page heading anchors (`#h-...`) still work, natively, since they're just ids on the single page that's already loaded.

`content/test/` still exercises this: `navigation-modes` covers cross-post and cross-section links, `ordering-and-dates` covers section-TOC sort order, and the two nested posts cover multi-segment path parsing (3 and 4 segments deep).

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
- Current version: `wecreatethis-v30`. Check `grep CACHE_NAME sw.js` for the live figure - this note lags behind routine bumps and isn't kept in sync every session.

**Testing gotcha:** because the shell is cached, edits to `app.js`/`style.css` may not take effect on reload, and measurements can silently reflect old code. When testing, defeat the SW (`Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined, configurable: true })` as an init script) and confirm the code under test is really running.

## Known issues

- When debugging layout shift here, remember `LayoutShiftAttribution` rects are **clipped to the viewport** - a current rect of `0x0` means the element was pushed out of view, not that it collapsed. Misreading this cost three failed fix attempts. This applied to the old scroll-stack model; with one post per page there is much less surface for CLS bugs to hide in, but the gotcha is worth keeping in mind for any future multi-element layout.
- **SEO ceiling, mostly resolved.** Posts now have their own URL and their own `<title>`/meta description (set client-side in `app.js`), and the sitemap lists every post individually. What's still missing is static HTML: content is still rendered client-side from markdown fetched at runtime, so a crawler that doesn't run JS sees an empty shell. Fixing that means emitting static per-post HTML from `build.js` (viable - it already parses every post - but not done).
- `content/test/` is **published, not draft**, and linked from the homepage. It's renderer/navigation test content, kept live deliberately for testing on the real site; flip to `draft: true` when done.
- **Loose ordered lists break** - see the list-rendering note above.
- `archive/app-hub/index.html`'s internal links (styles.css, icon-192.png, its own service-worker registration at scope `/`) are stale now that it no longer lives at the actual root - harmless since nothing links to it and it isn't in the sitemap, but don't load it directly expecting it to render or behave correctly.

## Adding a post (the whole workflow)

1. Create `content/{section}/{post-slug}/index.md` with frontmatter.
2. **Compress any images before adding them** - see Image sizing below. `build.js` does not
   do this for you.
3. Run `node build.js` (or let CI do it on push).
4. Done. No `_redirects` change, no SW change, no version bump.

## Image sizing (do this manually, every time)

`build.js` reads each image's intrinsic width/height from its file header and the renderer emits
them as `width`/`height` attributes plus `loading="lazy" decoding="async"` automatically - so
layout shift and lazy-loading are already handled for any image you add, no extra work needed
there.

**What is not automatic: file size.** Nothing in the pipeline compresses or resizes images.
Screenshots dropped straight into a post folder stay at their raw screen-capture resolution and
size - `content/misc/agent-starts-taking-screenshots-on-auto-mode/` has one at 204KB, uncompressed,
because this step was skipped when that post was written. Compare `profile.jpeg` (compressed via
the `/tinypng` skill, session 021) as the pattern that was actually followed correctly.

Before adding an image to a post folder:
- Run it through the `/tinypng` skill (TinyPNG API, handles PNG and JPG).
- If it's a full-resolution screenshot (e.g. a 2x/Retina capture), consider whether the post
  actually needs it at native size, or whether a smaller crop/scale would do - `build.js` has no
  responsive-image/srcset support, so whatever dimensions you save are what every viewport
  downloads.

This doesn't move the Lighthouse Performance score (session 026 measured LCP 134-187ms and
Performance is already excellent site-wide even with uncompressed test images in play), but it's
real bytes over the wire on every visit to that post, worth doing on principle and before it
compounds across more posts with more/larger images.

## Routing gotcha for new top-level file types

`_redirects` is a hand-maintained allowlist for anything at the repo root that isn't under
`/content/*` - `robots.txt`, `llms.txt`, `sitemap.xml`, `sw-toast.js`, etc. **A file that exists in
the repo root but is missing from `_redirects` silently falls through to the final `/* /section 200`
catch-all** and gets served as the SPA shell instead of itself (wrong content-type, wrong body).
This bit `robots.txt`, `llms.txt`, and `sw-toast.js` all at once (session 026 - cost SEO, Agentic
Browsing, and Best Practices points on every single Lighthouse run until caught). If you add a new
root-level static file that needs to be fetched directly (not through `/content/`), add a
pass-through line for it in `_redirects` in the same change.

## Local preview

Plain static servers 404 on clean URLs; use Cloudflare's emulator from the repo root:

```
npx wrangler pages dev . --port 8080
```

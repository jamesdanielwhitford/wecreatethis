# Blog

Folder-organized, flat-URL markdown blog with a tag-filterable homepage. Adding a post is adding a folder; everything else follows automatically.

**This is the site's homepage** (moved from `blog/` to the repo root, see `sessions/overview.md`). The old app-hub grid is archived at `archive/app-hub/`, not deleted.

## Content model

- `content/{group...}/{post-folder}/index.md`. Any folder containing an `index.md` is a **post**. The folder path above it (`group` in the manifest) is purely an authoring/organizing convenience now - it groups related posts together on disk, but has **no effect on routing or URLs**. Nest folders however makes sense for keeping a project's posts together.
- **Every post is served flat at `/{slug}`** - no group/section segment in the URL. The slug is the post's `slug:` frontmatter if set, otherwise its folder name. Give a post an explicit `slug:` only when its folder name collides with another post's folder name elsewhere in the tree (e.g. two different projects each having a `stub` placeholder post).
- The homepage (`/`) is a generated tag-filter hub, not a hand-authored index page: a short intro (from `content/home.md`, still hand-written), a curated grid of "featured" project tiles (`homepage.json`), a full tag chip row, and the flat list of every published post below. Clicking a tile or chip filters the list via `?tag=x` in the URL (`pushState`, no real navigation), so filtered views are shareable/bookmarkable and step correctly through browser back/forward.
- There is no section/index page anymore - a folder is not itself a route. The nearest equivalent to "browse everything in this group" is filtering the homepage to that group's tag (every post's `tags:` seed included its old group name during the flat-URL migration, so this still works for existing content).
- Frontmatter: `title`, `date` (YYYY-MM-DD), `author`, `description`, `tags` (comma-separated, lowercased/hyphenated, used for homepage filtering), optional `slug` (URL override, only needed to resolve a folder-name collision), optional `order` (overrides date sort), optional `draft: true` (excluded from the manifest, stays in the repo).
- Default post order (homepage list, and post-to-post prev/next): `order` ascending where set, then date descending (newest first) - one single global order now, not per-section.
- `content/test/` and `content/demo/` are **excluded from the manifest entirely** at build time (not `draft: true` - a folder-name skip in `build.js`). They're renderer regression fixtures, kept in the repo, never routable/published/in the sitemap.

## Featured homepage tiles (`homepage.json`)

Root-level JSON, read and validated by `build.js`, copied into the manifest:

```json
{ "featured": [ { "tag": "heat", "label": "HEAT", "icon": "flame", "description": "…" } ] }
```

This is the only mechanism for "which tags get a tile on the homepage" - a tag isn't a post, so it can't be a per-post frontmatter flag, and the set is curated by hand rather than inferred from popularity. `icon` must be a key defined in `icons.js` (Lucide-style inline SVGs); `build.js` warns (doesn't fail) if a featured tag matches zero posts or an icon key doesn't exist. Edit this file directly to add/remove/reorder featured tiles - no other change needed, `node build.js` picks it up.

## Build

`node build.js` (no dependencies) walks `content/` and writes `content-manifest.json` and `sitemap.xml`, which the pages fetch at runtime. A GitHub Action (`.github/workflows/blog-manifest.yml`) regenerates and commits the manifest automatically on pushes to `dev`/`main` that touch `content/`, `build.js`, or `homepage.json`.

Manifest shape: `{ posts: [...], tags: [{tag, count}], featured: [...] }` - flat, no `sections` anymore. Each post carries `slug`, `title`, `date`, `order`, `description`, `author`, `tags`, `group` (internal-only, the old folder path, never used for routing), `source` (the real on-disk path, e.g. `heat/stub` - this is how the flat-URL post page still knows which file to fetch), `images`.

It also:

- **Hard-fails the build (`process.exit(1)`) on slug collisions**, unlike every other frontmatter problem below which only warns. Two collision classes, both checked and reported in full before exiting: (1) two posts resolving to the same slug, (2) a post's slug matching a reserved top-level name - derived live from `fs.readdirSync(__dirname)`, so it always reflects the real set of app folders/static files at the repo root and never goes stale like a hard-coded list would. Both mean a post would be silently unreachable, which is why this is a hard failure and not a warning - contrast the frontmatter warnings below, which only cost sort order or a leaked draft.
- **Records intrinsic image dimensions** per post (`images` key), read straight from the PNG/GIF/JPEG file header by hand. The renderer emits these as `width`/`height` on each `<img>` so the browser reserves the right box before the file loads. Remote (`http(s)://`) images can't be measured and are skipped.
- **Warns on bad frontmatter**: non-`YYYY-MM-DD` dates, non-numeric `order` (coerced to `null`, not `NaN`), truthy-but-not-`"true"` `draft` values that would silently publish a post, and tags that needed normalizing (mixed case / internal whitespace).

## Routing

`_redirects` needs **no changes for new content** as long as its slug doesn't collide with a reserved name (`build.js` catches that at build time before it ever reaches `_redirects`). `/content/*` passes through to real files, `/` serves the homepage, and a final `/*` wildcard serves `post.html` (renamed from `section.html` - there is no section page anymore) for any unmatched path. This sits after every other app's own routing rules (e.g. `/tarot/*`, `/birdle/*`), so those still take priority; real files/folders for every other app are served natively by Cloudflare before `_redirects` is even consulted. Rule order matters (first match wins), and rules targeting `.../index.html` are silently ignored by Cloudflare's loop protection, so pass-throughs use self-rewrites (`/ / 200`).

**Legacy URL redirects.** Every post/section URL that was ever live under the old `/{section}/{slug}` scheme has an explicit 301 in `_redirects` to its new flat `/{slug}`, and every old section-index URL 301s to the nearest equivalent, `/?tag={that-section's-name}`. These are hand-maintained, one line per URL, not generated - re-derive the list (diff `content-manifest.json`'s `source` against `slug` per post) if a post's folder or slug changes after it's already been published somewhere.

## Pages and rendering

- `index.html` (home) + `post.html` (every post) share `style.css`. Home renders a wordmark header; post pages render a back-to-home arrow + TOC button, with the post's own title revealed in the header once scrolled past.
- The homepage additionally renders, all client-side from the manifest: an intro blurb (`content/home.md` through the normal markdown renderer), a `.tile-grid` of featured project tiles, a `.chip-row` of every tag, and the post list (`.post-toc`, same markup section pages used to use). Filtering is single-select, `?tag=x`, applied via `pushState`/`popstate` - no full navigation on click.
- `app.js` holds a minimal hand-rolled markdown renderer: headings, bold, italic, links, images, unordered **and ordered** lists, **tables**, blockquotes (recursive, so quoted fences work), fenced + inline code, paragraphs, plus a custom ` ```link:/url ` fenced-block syntax for a whole title+description clickable "link card" (used inside post bodies now, not the homepage - the homepage generates its own tiles/chips instead).
- Code blocks get a tiny language-agnostic highlighter (comments, strings, numbers, shared keyword set), no libraries. `//` preceded by `:` is not treated as a comment, so URLs survive.
- Renderer trick: fenced code, blockquotes, tables, and link cards are extracted behind NUL-delimited placeholders before other transforms, then restored at the end.
- **Paragraph wrapping skips only block-level tags.** Inline tags (`<strong>`, `<em>`, `<a>`, `<code>`) must still be wrapped, or a line starting with bold text silently loses its `<p>` and runs together with the next line.
- **Heading ids are prefixed `h-`** (`headingId()`) so they can never collide with a post slug sharing the same URL fragment.
- A post's leading `# H1` is dropped when it matches the frontmatter title, since the post page already renders the title in the header (`#section-title`) from the manifest.
- Post pages show the post's own tags as clickable chips (linking to `/?tag=x`) beneath the date/author line - this is how a reader discovers the filter mechanism from inside a post, not just from the homepage.
- **Known bug (not yet fixed): loose ordered lists.** A numbered list written with blank lines between items renders as N separate one-item `<ol>`s instead of one list, because the paragraph/blank-line split runs before list detection. Unordered lists likely have the same bug, invisibly (bullets don't number). Workaround: no blank lines between list items. See `sessions/session-014-2026-07-31.md` for the full repro; fix belongs in the list-handling regexes in `app.js`.

### Routing: flat URLs, no section concept (session: flat URLs + tag homepage)

Originally routing was folder-driven: `/{section...}/{post-slug}`, with `parseBlogPath()` checking the manifest to disambiguate whether the last path segment was a post or another section level, and a section page rendering a table of contents for that folder. **That's gone.** Routing is now trivial - `parseRoute()` reads `location.pathname`: zero segments is home, one segment is a post slug, anything else is treated as unknown (a real multi-segment path should already have been caught by a legacy 301 in `_redirects`). There's no more manifest-lookup disambiguation needed, because there's no more ambiguity - folders never appear in a URL at all.

Post-to-post prev/next (`renderPostBottomNav`) is now global reverse-chronological across every published post, not scoped to a section - sections no longer exist to scope it to, and this way the answer for a given post doesn't depend on how the reader arrived there.

`content/test/` still exercises the renderer (still fetchable directly, just excluded from routing/manifest/sitemap): `navigation-modes` covers cross-post links, `ordering-and-dates` covers list sort order, `kitchen-sink` and `renderer-edge-cases` cover markdown syntax edge cases.

## Theme

Light/dark follows the system setting via `prefers-color-scheme`, **no toggle** (unlike bird-bingo, which has one). All colours are CSS custom properties on `:root`, overridden in a single `@media (prefers-color-scheme: dark)` block. Muted greys are kept at or above 4.5:1 on their own background in both themes. Both pages carry paired `theme-color` meta tags.

## Service worker (`sw.js`)

This is now the site's only service worker (the old root app-hub `sw.js` is archived). Differs from the pre-move repo-wide SW convention that used to apply to the app-hub, deliberately:

- `ASSETS` is the app shell only, listed as canonical extensionless URLs (never `.html` URLs; fetching `/index.html` returns section.html via the redirect wildcard and would poison the cache). `/sw-toast.js` is in there too.
- Post/content URLs are derived from `content-manifest.json` at install; **do not add posts to `ASSETS` by hand**.
- Content + manifest are network-first with cache fallback, so new posts appear without a SW version bump.
- **Shell is stale-while-revalidate**: the cached copy is served instantly, a background fetch refreshes it, and when a shell asset actually changed (`responsesDiffer`) the SW posts `sw-updated` so `/sw-toast.js` offers a refresh. It used to be strictly cache-first with no revalidation, which pinned visitors to an old `app.js` while they picked up new CSS - new theme with old renderer, which reads as broken rendering rather than a stale cache.
- `cleanResponse()` strips redirect metadata on every `cache.put` (mandatory repo-wide; section paths are `_redirects` rewrites). Install fetches use `cache: 'reload'` so a `CACHE_NAME` bump can't pre-cache a stale shell.
- Offline navigation to an unvisited post falls back to the cached `post.html` shell.
- Current version: `wecreatethis-v30`. Check `grep CACHE_NAME sw.js` for the live figure - this note lags behind routine bumps and isn't kept in sync every session.

**Testing gotcha:** because the shell is cached, edits to `app.js`/`style.css` may not take effect on reload, and measurements can silently reflect old code. When testing, defeat the SW (`Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined, configurable: true })` as an init script) and confirm the code under test is really running.

## Known issues

- When debugging layout shift here, remember `LayoutShiftAttribution` rects are **clipped to the viewport** - a current rect of `0x0` means the element was pushed out of view, not that it collapsed. Misreading this cost three failed fix attempts. This applied to the old scroll-stack model; with one post per page there is much less surface for CLS bugs to hide in, but the gotcha is worth keeping in mind for any future multi-element layout.
- **SEO ceiling, mostly resolved.** Posts now have their own URL and their own `<title>`/meta description (set client-side in `app.js`), and the sitemap lists every post individually. What's still missing is static HTML: content is still rendered client-side from markdown fetched at runtime, so a crawler that doesn't run JS sees an empty shell. Fixing that means emitting static per-post HTML from `build.js` (viable - it already parses every post - but not done).
- **Loose ordered lists break** - see the list-rendering note above.
- **No static HTML per post yet** - a crawler that doesn't run JS still sees an empty shell (see SEO note above), and no per-post real-time Open Graph preview exists for the same reason (site-wide OG tags only).
- `archive/app-hub/index.html`'s internal links (styles.css, icon-192.png, its own service-worker registration at scope `/`) are stale now that it no longer lives at the actual root - harmless since nothing links to it and it isn't in the sitemap, but don't load it directly expecting it to render or behave correctly.

## Adding a post (the whole workflow)

1. Create `content/{any-folder-path-that-organizes-it}/{post-folder}/index.md` with frontmatter,
   including `tags:` (comma-separated) if it should be filterable/discoverable from the homepage.
   The folder path is yours to choose for organization - it never becomes part of the URL.
2. If the post's folder name would collide with another post's folder name anywhere else in
   `content/`, add an explicit `slug:` to one of them. `build.js` hard-fails the build if it
   doesn't catch this itself.
3. **Compress any images before adding them** - see Image sizing below. `build.js` does not
   do this for you.
4. Run `node build.js` (or let CI do it on push).
5. Optionally add the post's tag to `homepage.json`'s `featured` list if it should get its own
   tile on the homepage.
6. Done. No `_redirects` change needed unless the post was previously published under a different
   URL (then add a legacy 301, see Routing above). No SW change, no version bump.

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
the repo root but is missing from `_redirects` silently falls through to the final `/* /post 200`
catch-all** and gets served as the SPA shell instead of itself (wrong content-type, wrong body).
This bit `robots.txt`, `llms.txt`, and `sw-toast.js` all at once (session 026 - cost SEO, Agentic
Browsing, and Best Practices points on every single Lighthouse run until caught). If you add a new
root-level static file that needs to be fetched directly (not through `/content/`), add a
pass-through line for it in `_redirects` in the same change.

**The same gotcha applies to every app folder, and it's worse there because it can fail silently
even with a rule present.** Session 027 found every single app/CV/portfolio folder (`/tarot/`,
`/hardle/`, `/cv`, etc.) had been serving the blog shell instead of itself since the homepage
move, for two stacked reasons:

1. Same missing-pass-through issue as above, at folder scale - Cloudflare Pages redirects always
   win over a matching real file/folder ("redirects are always followed, regardless of whether or
   not an asset matches the incoming request" - Cloudflare's own docs), so every app folder needs
   its own explicit rule.
2. **A rule whose destination is a literal `.../index.html` path gets silently dropped at deploy
   time.** Cloudflare's build-time validator detects that normalizing `index.html` back off the
   path would re-match the rule's own source pattern, flags it as an infinite loop, and drops the
   rule entirely - with only a build-log warning, no runtime error, invisible to normal `curl`
   testing. This is why `/tarot/*  /tarot/index.html  200` looked fine in the file but never
   actually worked.

**The correct pattern for a new app folder** (two lines, matching what every existing app rule
now uses):
```
/app-name  /app-name/  301
/app-name/*  /app-name/:splat  200
```
Self-rewriting via `:splat` avoids the loop-detector entirely (same pattern `/content/*` already
used successfully). The bare-path redirect is needed because a lone `/app-name/*` splat requires
something after the slash to match - `/app-name` alone would still fall through without it.

**Verify locally before pushing, not just live**: `npx wrangler pages dev . --port <N>` from the
repo root runs Cloudflare's actual redirect engine, including the loop detector, and logs
`✨ Parsed N valid redirect rules` - compare that count against the number of rules actually
written in the file. A silent drop shows up as a lower count with no other visible symptom.

## Local preview

Plain static servers 404 on clean URLs; use Cloudflare's emulator from the repo root:

```
npx wrangler pages dev . --port 8080
```

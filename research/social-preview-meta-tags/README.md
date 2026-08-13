# Social preview meta tags + iOS icons: checklist

Grounded in the Open Graph spec, MDN, and web.dev. Twitter/X's own developer
docs (`developer.x.com`) redirected to a generic marketing shell on every URL
tried and had no real markup content to extract — Twitter Card tag names below
are included as commonly-known, stable markup (unchanged for years, and X's
own parser falls back to Open Graph tags per the search snippet from
`developer.x.com/en/docs/x-for-websites/cards/guides/getting-started`), but
that specific claim is not independently verified against a live X source
today.

## 1. Open Graph (drives iMessage, Slack, Discord, Facebook, LinkedIn previews)

Four required properties per the spec
([local](sources/the-open-graph-protocol.md) ·
[source](https://ogp.me/)):

- `og:title`
- `og:type` (e.g. `website` or `article`)
- `og:image`
- `og:url` — the canonical URL

Recommended optional:
- `og:description`
- `og:image:width` / `og:image:height` / `og:image:alt` / `og:image:type`

Recommended `og:image` size: **1200×630px (1.91:1 ratio)** for clarity across
devices/platforms
([local](sources/open-graph-meta-tags-everything-you-need-to-know.md) ·
[source](https://ahrefs.com/blog/open-graph-meta-tags/)).

```html
<meta property="og:title" content="wecreatethis.com" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://wecreatethis.com/" />
<meta property="og:description" content="Blog." />
<meta property="og:image" content="https://wecreatethis.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

Per-post pages should set their own `og:title`/`og:url`/`og:description` to
the post's title/URL/description (this site already does this client-side for
`<title>` and the meta description per `CLAUDE-blog.md`; OG tags should follow
the same pattern).

## 2. Twitter Card (X-specific rendering flavor, layered on top of OG)

Not independently verified today (see note above), but standard practice:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="wecreatethis.com" />
<meta name="twitter:description" content="Blog." />
<meta name="twitter:image" content="https://wecreatethis.com/og-image.png" />
```

X's parser falls back to Open Graph `property`/`content` tags if these
Twitter-specific `name`/`content` tags are absent, so this block is optional
but recommended for guaranteed correct rendering on X specifically.

## 3. Icons

### Favicon (browser tab)
Already correctly set up on this site: `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`.
SVG favicons are broadly supported in modern browsers. If not declared,
browsers fall back to requesting `/favicon.ico` from the root
([local](sources/document-structure-webdev.md) ·
[source](https://web.dev/learn/html/document-structure)).

### apple-touch-icon (iOS "Add to Home Screen")
**Not currently on this site — this is the real gap.** iOS Safari does **not**
use the regular `rel="icon"` favicon (even SVG) for the home-screen icon; it
specifically looks for `apple-touch-icon`, and if absent, will auto-request
`/apple-touch-icon.png` / `/apple-touch-icon-[size].png` from the root, or
fall back to an auto-generated screenshot of the page — never the SVG favicon
([local](sources/link-html-external-resource-link-element-html-mdn.md) ·
[source](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link)).

**Must be a PNG** — Apple does not support SVG for `apple-touch-icon`.

A single 180×180px PNG is sufficient for modern devices (MDN: "usually
sufficient to provide a large image, such as 192x192, and let the browser
scale it down as needed"):

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

### mask-icon (bonus: macOS Safari pinned tabs)
Optional, monochrome SVG, only used if the user pins the tab in desktop
Safari ([local](sources/document-structure-webdev.md) ·
[source](https://web.dev/learn/html/document-structure)):

```html
<link rel="mask-icon" href="/favicon.svg" color="#000000" />
```

### manifest.json icons
Currently point at `icon-192.png`/`icon-512.png`, the old pencil-glyph
app-hub icons — stale now that the brand icon is the "We" wordmark
(`favicon.svg`). Should be regenerated as PNGs matching the new mark if the
manifest icons are to stay visually consistent with the favicon/apple-touch-icon.

## Summary of what to add to `index.html` + `section.html`

1. `apple-touch-icon` PNG (180×180, generated from `favicon.svg`) — the actual
   missing piece for iOS home-screen icons.
2. Open Graph tags: `og:title`, `og:type`, `og:url`, `og:description`,
   `og:image` (+ width/height/alt), sized 1200×630.
3. Twitter Card tags (optional but cheap, matches OG values).
4. Optionally `mask-icon` for macOS Safari pinned tabs.
5. Optionally regenerate `manifest.json`'s `icon-192.png`/`icon-512.png` to
   match the new wordmark, since they're currently the old pencil glyph.

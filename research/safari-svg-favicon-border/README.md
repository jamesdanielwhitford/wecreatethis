# Why Safari (macOS) shows a white/light border box around wecreatethis.com's favicon

## The bug

In Safari on macOS, the tab favicon for wecreatethis.com (`/favicon.svg`: a solid `#000`
background with light-gray `#cccccc` "We" glyphs) renders inside a visible light/white bordered
box. Chrome does not show this. Confirmed live by reproducing it in Safari 26 on macOS 26 and
comparing directly against a Hacker News tab's favicon (an orange-filled square) in the same tab
bar screenshot — the HN icon sits flush with no border, ours does not.

## Root cause

This is a documented, long-standing Safari behavior, not a bug in the SVG or the markup. Safari
evaluates how dark a favicon's content is and **automatically adds a contrasting (white/light)
background box behind favicons it judges too dark to be visible against the tab bar** — most
visibly in dark browser chrome, where a very dark icon would otherwise disappear entirely.

From the accepted answer to the closest match for this exact symptom
([local](sources/html-favicon-has-unwanted-white-border-around-it-in-safari.md) ·
[source](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos)):

> Safari's original StackOverflow favicon (orange, ~19% pixel coverage) → transparent, no white
> border. The same StackOverflow favicon recolored to dark navy → white background added by
> Safari. Any dark-filled icon (dark circle/dark square) → white background, regardless of file
> format, transparency, encoding tool, or coverage.
>
> Safari appears to evaluate the darkness/color of the favicon content and adds a contrasting
> background when it deems the icon too dark for the tab bar (especially in Dark Mode, where a
> dark icon would be invisible).

A second, older and higher-voted thread on the same symptom
([local](sources/html-safari-favicon-incorrectly-rendering-with-white-background-stack-overflow.md) ·
[source](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background))
reaches the same conclusion independently: "The white background is only added to Favicons in
Safari when we use Dark Mode," confirmed by the reporter as contrast-triggered, and multiple
commenters confirm they were never able to find or control the exact threshold ("I gave up on
this and accepted it as a weirdness of safari").

Two things this rules out:

- **This is not a transparency bug.** wecreatethis.com's favicon is fully opaque, and the SO
  threads confirm the white box appears "regardless of file format, transparency, encoding tool,
  or coverage" — opacity doesn't change Safari's darkness heuristic.
- **`mask-icon` does not control this.** `mask-icon` is a separate, older Safari feature
  (originally for *pinned tabs*, a UI Safari has since removed) that takes a monochrome SVG and a
  single `color` attribute; it is unrelated to the regular tab favicon and does not expose any way
  to opt out of the auto-contrast box
  ([local](sources/html-safari-favicon-incorrectly-rendering-with-white-background-stack-overflow.md) ·
  [source](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background)).
- **There is no documented CSS/SVG/meta-tag override.** No `prefers-color-scheme` SVG trick,
  `theme-color`, or link attribute is reported anywhere as suppressing this specific behavior; per
  CSS-Tricks' explainer on dark-mode favicons
  ([local](sources/dark-mode-favicons-css-tricks.md) · [source](https://css-tricks.com/dark-mode-favicons/)),
  Safari's SVG favicon handling is limited and doesn't participate in the `prefers-color-scheme`
  trick that works in Chrome.

**Note on link provenance:** both Stack Overflow URLs cited above were fetched successfully via
Playwright (their full page content, including the quoted text, is saved in `sources/` and was
read directly) but return `403` to plain header-only requests (`curl`, `requests`) — this is Stack
Overflow's bot-detection on non-browser clients, not a dead link. Both pages are live; the CSS-Tricks
link resolves cleanly under either method.

wecreatethis.com's favicon is close to a worst-case trigger for this heuristic: a solid black
(`#000`) fill is the darkest possible background, so Safari reliably classifies it as "would be
invisible" and boxes it — independent of browser theme, independent of format (this affects PNG
favicons too, per the first thread), independent of the `apple-touch-icon.png` already in place
(that's for iOS home-screen icons only and isn't involved in the desktop tab favicon).

## The fix

No configuration flag suppresses this — the only lever that actually changes Safari's decision is
raising the icon's apparent brightness/contrast so Safari's own heuristic no longer classifies it
as "too dark." Two viable options, in order of how much the icon changes:

1. **Lighten the favicon's background fill** (e.g. a mid-gray or the site's `#bcbcbe` light-theme
   background instead of pure black) so Safari's contrast heuristic no longer trips. This is the
   most reliable fix per the evidence above, but changes the appearance of the icon itself.
2. **Accept Safari's white box as an unavoidable platform quirk** and leave the favicon as is —
   several long threads on this exact issue end in the reporter giving up on finding a fix, since
   Safari doesn't expose an override.

This is a background-color change to `favicon.svg`, which falls under the "don't change site
colors without asking first" constraint from the active `/goal` — flagging for the user's decision
rather than applying unilaterally.

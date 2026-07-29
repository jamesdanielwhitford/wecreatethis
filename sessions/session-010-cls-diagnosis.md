# Blog CLS diagnosis (Fable subagent report, 2026-07-29)

Companion to `session-010-2026-07-29.md`. This is the diagnosis of the
unresolved layout-shift bug, to be implemented in the next session.

**Status: diagnosed and empirically verified, NOT yet implemented.**

---

## Root cause

The stack is painted in **manifest order, but posts render in
network-completion order**.

All four articles start collapsed (~230px of meta each), so the whole stack
fits inside the IntersectionObserver's 600px `rootMargin` band and **all four
fetches fire near-simultaneously on load**. On a slow connection
`kitchen-sink` (the longest post, and first in the stack) is the slowest to
fetch and render. By the time its ~3700px of content lands,
`navigation-modes` and `ordering-and-dates` have already rendered and been
*painted inside the viewport*. Kitchen-sink's arrival inserts thousands of
pixels **above already-painted content**, shoving it out of the viewport.

That displacement of painted siblings is the CLS. It is **not** any article
growing in place: an element growing doesn't count, painted elements *moving*
does. Scroll anchoring can't help because the user is at scrollTop 0, where
anchoring is disabled.

### Why my diagnostic misled me

My observer reported `{pt:547, ct:0, ph:276, ch:0}` and I read
"height 276 → 0" as the article *collapsing*. Wrong:
**`LayoutShiftAttribution` rects are clipped to the viewport.** A current rect
of `0x0` means the element was pushed entirely *out of view* by kitchen-sink
landing above it. I spent three attempts fixing a collapse that was never
happening.

On fast connections all fetches complete within a frame or two of first paint,
so there is no painted "before" frame to shift, hence ~0.001 locally.

---

## Measured baseline

Current `dev` code (with my unverified `content-visibility` attempt active) is
**worse than what is in prod**: CLS **0.456**, in exactly two shifts.

1. **t=1879, 0.228** — my attempt 4 backfiring. `content-visibility: auto`
   elements start life *skipped* (so the 600px `contain-intrinsic-size`
   stand-in applies on the first frame), then Chrome decides they are
   viewport-proximate, unskips them, and the still-empty `.md-content`
   collapses 600px → 0, yanking everything below upward.
2. **t=2531, 0.228** — the original bug: the same two articles pushed out of
   the viewport when kitchen-sink's markdown lands.

---

## Why each of my four attempts failed

1. **`min-height` guess on placeholders.** Two failure modes: a post shorter
   than the guess collapses (painted content below moves up), and kitchen-sink
   is far *taller* than any sane guess, so its landing still pushes painted
   content down by (real − guess).
2. **No reservation at all.** Later posts' meta stubs are painted in the
   viewport at collapsed positions; the earlier, slower post's arrival
   displaces them. This is the pure form of the bug.
3. **Inline `min-height:70vh` cleared on render.** Same as (1), plus the
   reservation is cleared *per post independently*, so once posts 2 and 3
   clear theirs they are painted content sitting below a still-pending post 1
   with no reservation at all (I only reserved after the first). The ordering
   race is untouched.
4. **`content-visibility: auto` + `contain-intrinsic-size`.** Wrong tool, for
   two reasons. (a) `contain-intrinsic-size` only applies while the element is
   *skipped*, and content-visibility never skips elements at or near the
   viewport — which, in the collapsed initial stack, is all of them. So there
   is no reservation where it matters. (b) The initial skipped → unskipped
   transition on first paint adds its own 0.228 shift. content-visibility is
   designed for content far below the viewport, where its size corrections
   happen offscreen and are CLS-free; it cannot protect the first screenful.

---

## Can a height-reservation strategy ever work?

**No, and it should not be pursued.**

A build-time estimate (chars/blocks → px) is viewport-width-dependent: the same
markdown is ~3700px at 412px wide and far less at 640px, and code blocks,
tables, and line-wrap make any linear model wrong by hundreds of px. An error
only becomes CLS when the correction happens while painted content sits below
it in the viewport, which is precisely the top-of-page load case being fixed.
Reserving would *reduce* the score, not reliably get under 0.1.

The ordering fix below makes the true height irrelevant.

---

## The fix: reveal posts in order, only once sized ("reveal frontier")

**Invariant:** the painted portion of the stack is always a contiguous, fully
sized prefix. A post becomes visible only when it *and every post above it*
have rendered. Content is then only ever appended below painted content, never
inserted above it. Zero shifts by construction.

Hide with `visibility: hidden`, **not** `display: none`. Hidden articles keep
their layout boxes, so the IntersectionObserver still fires and lazy loading
keeps working; and invisible elements are excluded from CLS, so all the racing
and reflow happens unpainted.

### `blog/style.css`

Replace the `content-visibility` block (currently lines 139-146) with:

```css
/* A post is revealed only once it and every post above it have rendered
   (see revealLoaded in app.js). visibility (not display) so hidden posts
   keep their boxes: the IntersectionObserver still sees them, and invisible
   elements can shuffle freely without counting as layout shifts. */
.post-entry:not(.is-revealed) {
  visibility: hidden;
}
```

### `blog/app.js`

Three small changes.

**1.** After `const entries = Array.from(stack.querySelectorAll('.post-entry'));`:

```js
// Reveal the contiguous prefix of rendered posts. Painted content is only
// ever appended below, never displaced, which is what keeps CLS at zero.
function revealLoaded() {
  for (const e of stack.querySelectorAll('.post-entry')) {
    if (!e.classList.contains('is-loaded')) break;
    e.classList.add('is-revealed');
  }
}
```

**2.** In `loadEntry`, call it after render **and on failure**. Without the
failure branch a failed fetch stalls the frontier and everything below stays
hidden forever:

```js
          entry.classList.add('is-loaded');
          revealLoaded();
        })
        .catch(() => {
          entry.querySelector('.md-content').textContent = 'Failed to load post.';
          entry.classList.add('is-loaded');   // error message is this post's final size
          revealLoaded();
        });
```

**3.** In the sort-toggle click handler, after
`entries.forEach(e => stack.appendChild(e))`, add `revealLoaded();`. The
frontier must be recomputed against the new DOM order. Note `revealLoaded`
iterates the live DOM, not the `entries` array.

### What does not change

- The deep-link path already loads everything above the target before
  scrolling, so all gain `is-loaded`, all get revealed, and the scroll lands
  correctly.
- Offline behaviour is untouched.
- The SW needs no change, though shipping with a `CACHE_NAME` bump will purge
  users' stale cache-first shells promptly.
- The `is-loaded` class from my content-visibility attempt is reused as-is.

### UX tradeoff

On a slow connection, later posts' titles are not visible until their turn.
They are below the fold anyway.

---

## Empirical evidence

Slow 4G, 412x823 mobile, fresh browser context, service worker verified
inactive via a `navigator.serviceWorker` override, against localhost:8080.

| Scenario | CLS |
|---|---|
| Current `dev` code (content-visibility attempt active), cold load | **0.456** (0.228 c-v unskip collapse + 0.228 kitchen-sink landing) |
| Fix injected via init script, cold load | **0.000**, all 4 posts loaded and revealed (lazy load confirmed working through `visibility: hidden`) |
| Fix + deep link `#ordering-and-dates` | **0.000**, target at top of viewport (64px), posts above loaded |
| Fix + reading-order toggle after load | **0.000** residual, order reversed, nothing stuck hidden, scrolled to top |

The injected fix was byte-equivalent to the recommendation above (CSS rule plus
ordered reveal loop); a MutationObserver was used only because the agent could
not edit `app.js`.

**Harness note:** the first injection attempt hung the page because
`classList.add()` of an already-present class still queues a mutation record,
looping the observer. Irrelevant to the real fix, which has no
MutationObserver, but worth knowing if testing that way.

---

## Implementation checklist for next session

- [ ] Revert or replace the uncommitted `content-visibility` changes in
      `blog/app.js` and `blog/style.css` (they measurably make things worse)
- [ ] Apply the CSS rule and the three `app.js` changes above
- [ ] Bump `CACHE_NAME` (currently `blog-v11`)
- [ ] Verify under **Slow 4G**, not just a fast local connection, and defeat
      the service worker when measuring
- [ ] Check all four routes: section load, deep link to a post, deep link to a
      heading anchor, and the reading-order toggle
- [ ] Confirm a failed post fetch does not stall the reveal frontier
- [ ] Re-run Lighthouse on live `/blog/test` and confirm Agentic Browsing
      reaches 100

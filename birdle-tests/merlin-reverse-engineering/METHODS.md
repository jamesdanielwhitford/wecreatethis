# Candidate ranking methods: cost, quality, and how to make them affordable

Reference for what each method actually costs in eBird API calls, which ones James rated
best from the bird lists, and options for cutting the call count later.

**James's picks, judged from the bird lists rather than the scores:**

1. **Hotspot frequency (nearest)** - "this one seems very good"
2. **Nearest, distance-weighted** - "this one also seems very good"
3. **Region checklists** - added to the sweep at his request

His read was right ahead of the metrics: nearest scored 9/9 on top-9 and distance-weighted
scored the highest tau (+0.52) of anything tested, both of which only became visible once a
top-9 metric was added. **Judge the lists, not the aggregate scores.**

## API call cost, broken down

Every checklist-based method has the same three-stage shape:

```
1. discovery      1 call    -> which hotspots / which checklists exist
2. checklist ids  N calls   -> product/lists/{locId} per hotspot (or 1 for a region)
3. species        M calls   -> product/checklist/view/{subId}, ONE PER CHECKLIST  <-- the cost
4. names          1-2 calls -> ref/taxonomy/ebird, batched 200 at a time
```

Stage 3 dominates. It is one call per checklist and there is no batch endpoint.

| Method | Discovery | Lists | Checklists | Names | **Total** | Time |
|---|---|---|---|---|---|---|
| Hotspot nearest (14x14) | 1 | 14 | ~195 | 2 | **~212** | ~10s |
| Nearest, distance-weighted | 1 | 14 | ~195 | 2 | **~212** | ~11s |
| Hotspot richest | 1 | 14 | ~195 | 2 | **~212** | ~11-19s |
| Region checklists | 0 | 1 | ~199 | 2 | **~202** | ~9s |
| Bar chart (SSO) | 0 | 0 | 0 | 0 | **1** | ~1s |
| Current app | 1 | 0 | 0 | 0 | **1** | ~0.6s |

## Rate limiting: the binding constraint

eBird returns **HTTP 429** after roughly 1,000-2,000 calls in a session. We hit it **twice**
in one afternoon from a single developer doing a handful of runs.

All Bird Bingo users share one embedded API key (`ebird.js`). At ~212 calls per card, a
handful of simultaneous users would exhaust the budget for everyone.

**Conclusion: no ~200-call method can run live per card in the shipped app.** This is a
hard architectural constraint, not a performance nicety. Caching is mandatory, not an
optimisation.

## Options for cutting API calls

Roughly in order of payoff per unit of effort.

### 1. Cache per location (mandatory, biggest win)

Frequency for an area barely changes day to day. Compute once, store in IndexedDB keyed by
rounded coordinates (~3dp, roughly 100m), reuse for weeks.

- Cost falls from ~212 calls *per card* to ~212 calls *per location, per refresh window*
- A returning daily player pays **zero** calls
- Reuses the app's existing rounding convention (`locationsAreClose`, `daily.html`)
- **Do this regardless of which method wins**

### 2. Shrink the sample (`budget.html` measures exactly this)

Halving hotspots and checklists-per-hotspot roughly quarters the cost. Untested at the time
of writing (rate limited); `budget.html` sweeps five budgets from 14x14 down to 4x3
(~212 -> ~12 calls) for all three methods.

Open question the sweep answers: **where does the bird list stop being good?**

### 3. Precompute server-side

A Cloudflare Pages Function + KV computes frequency per region on a schedule and serves it
as one small JSON. Users make **1 call**, no key exposure, no per-user rate limit.
Repo already uses Pages Functions + KV for `towersofhanoi`, so the pattern exists.

### 4. Ship static bar-chart tables

Best quality (21/24, tau +0.67) and **zero** runtime calls. Requires manual SSO capture per
region, so it does not scale globally. Good for a handful of regions you care about.

### 5. Hybrid (probably the real answer)

```
static bar-chart table for the region?  -> use it            (0 calls, best quality)
cached frequency for this location?     -> use it            (0 calls)
otherwise                               -> compute + cache   (~212 calls, once)
absolute fallback                       -> current geo/recent (1 call, poor)
```

All paths produce the same `{speciesCode, comName, sciName, score}` shape, so `bingo.js`
is written once against that contract and the source is swapped underneath.

## What is NOT worth pursuing

- **Multi-year historic sampling** - 516 calls for 16 usable checklists, tau **-0.09**
  (anti-correlated). Historic single-day hotspot queries are far too sparse.
- **Scraping `barchartData` on a schedule** - breaches eBird's terms. One-off manual
  capture for a personal app is defensible; automation is not.
- **Radius tuning on the current method** - the ranking is arbitrary regardless of radius,
  because `geo/recent` returns one de-duplicated row per species. Radius changes *which*
  birds appear, never their order.

## Caveats

- **n=1.** One location, one date, one hand-typed Merlin list.
- **Run-to-run variance is significant.** Hotspot-richest moved 17/24 -> 14/24 between
  identical runs as eBird's recent-checklist pool shifted. Ignore gaps smaller than ~3
  places; re-run before concluding anything.
- Bar-chart capture used all years (1900-2026); whether Merlin weights recent years more
  heavily is untested.

# Reverse-engineering Merlin's "Likely Birds"

Goal: reproduce the ordered species list Merlin shows for "Pretoria, Gauteng" / "Today",
so Bird Bingo cards reflect the birds a player is genuinely most likely to see.

Test location: 330 Sprokie Avenue, Faerie Glen, Pretoria (`-25.7834538, 28.2928576`).
Ground truth: 24 species, in order, hand-captured from Merlin (`merlin-expected.json`).

## Conclusion

**Merlin's "Likely Birds" is eBird bar-chart frequency for the region, sliced to the
current week of the year.** Confirmed at 88% recall / Kendall tau +0.667 against the
City of Tshwane (`ZA-GT-08`) bar chart at week bucket 27.

The data is **not available from the public eBird API**. It comes from
`https://ebird.org/barchartData`, a website endpoint behind Cornell SSO that ignores
API keys entirely.

## The bug this uncovered in bird-bingo

`bingo.js` `fetchCandidates()` ranks candidates by counting occurrences per
`speciesCode` in `/data/obs/geo/recent`, labelling the result `"N checklists"`.

**That endpoint returns one de-duplicated row per species.** Measured at 25km/back=30:
183 records, 183 distinct species, maximum count of 1 for every species.

So the counter always lands on 1, the `"N checklists"` metric is fictional, and the
resulting order is effectively eBird's arbitrary return order. Radius tuning changes
*which* species appear but never their ranking. Frequency was never in that response.

This is the root cause of the app not matching Merlin, and it is independent of radius.

## Scores

| Method | Recall @24 | Kendall tau | API calls | Notes |
|---|---|---|---|---|
| **Bar chart, ZA-GT-08 (Tshwane)** | **21/24 (88%)** | **+0.667** | 1 | Needs SSO. Best result. |
| Bar chart, ZA-GT (Gauteng) | 20/24 (83%) | +0.579 | 1 | Province too coarse |
| Hotspot blend (public API) | 17/24 (71%) | +0.382 | 213 | See below |
| `geo/recent` counting (current app) | 9/24 (38%) | +0.167 | 1 | Ranking is arbitrary |

Naming differs between eBird's regional taxonomy and Merlin's display names. These are
the same bird and are aliased in the scorers, not counted as misses:

| Merlin | eBird |
|---|---|
| Hadada Ibis | Hadeda Ibis |
| Common Bulbul | Dark-capped Bulbul |
| Ring-necked Dove | Cape Turtle (Ring-necked) Dove |
| Cape Starling | Cape (Glossy) Starling |
| Southern Gray-headed Sparrow | Southern Grey-headed Sparrow |

## Rate limiting is a hard constraint on live methods

eBird returns **HTTP 429** after roughly 1,000-2,000 calls in a session. Hit twice while
testing, from a single developer. Every checklist-based method costs ~200 calls per
location, and all app users would share one embedded API key.

**This rules out computing frequency live, per card, in the shipped app** regardless of
how good the results look. Any such method must be cached hard (per region, in IndexedDB
or KV) so the cost is paid once per area, not once per card.

## Corrected method comparison (clean run, no rate limiting)

Earlier timings in this document were inflated by rate-limiting. Under clean conditions:

| Method | Recall@24 | Top-9 | Tau | Time | Calls |
|---|---|---|---|---|---|
| **Bar chart (SSO)** | **21/24** | - | **+0.67** | ~1s | 1 |
| **Hotspot nearest** | 17/24 | **9/9** | +0.50 | **10s** | 212 |
| Nearest, distance-weighted | 16/24 | 7/9 | **+0.52** | 11s | 212 |
| Hotspot richest | 14-17/24 | 8/9 | +0.25..+0.49 | 11-19s | 212 |
| Region checklists | 18/24 | 8/9 | +0.29 | 9s | 202 |
| Current app, 25km | 9/24 | 3/9 | +0.17 | 0.5s | 1 |
| Current app, 8km | 8/24 | 4/9 | -0.14 | 0.6s | 1 |

**Top-9** = how many of the method's top 9 are anywhere on Merlin's list. For a 3x3 card
this matters more than recall@24, since the card only ever draws from the top.

**Hotspot-nearest is the best global option**: 9/9 top-9 and the joint-best tau, at half
the time I first reported. Distance-weighting (each checklist counts 1/(1+km)) scores the
single highest tau of any method. Both were identified by eye from the bird lists before
the top-9 metric existed, which is a good argument for judging the lists over the scores.

**Run-to-run variance is significant** (hotspot-richest moved 17/24 -> 14/24 between
identical runs) because eBird's recent-checklist pool shifts. Treat differences smaller
than ~3 places as noise, and re-run before concluding anything from a small gap.

## Hypothesis tested and rejected: hotspot blending

Three birds (Common Ostrich, Speckled Pigeon, African Stonechat) are on Merlin's list
but outside Tshwane's top 24. Hypothesis: Merlin blends region frequency with
hotspot-level data near the exact coordinates, and nearby Rietvlei NR (369 species,
has ostriches) would supply them.

**Rejected.** `hotspot-blend.html` computes true per-checklist frequency from the public
API (`ref/hotspot/geo` -> `product/lists/{locId}` -> `product/checklist/view/{subId}`)
and scored 17/24 / tau +0.382 over 100 checklists and 213 API calls. **None of the three
target species appeared in the top 24.**

Why it underperforms: 100 recent checklists is a small, habitat-biased sample dominated
by whoever last birded Rietvlei, so wetland species (Eurasian Moorhen, Reed Cormorant,
Grosbeak Weaver, Egyptian Goose) crowd out garden birds. Cape Sparrow fell to #19.
eBird's bar chart averages years of checklists; this averages one month.

The three missing birds remain unexplained.

## Endpoint reference

| Endpoint | Auth | Verdict |
|---|---|---|
| `ebird.org/barchartData?r=&bmo=&emo=&byr=&eyr=&fmt=json` | Cornell SSO cookie | The data we want. 48 buckets/year (4/month). Not usable client-side: no CORS, ~818KB/region. |
| `api.ebird.org/v2/data/obs/geo/recent` | API key | De-duplicated to one row/species. Cannot rank. |
| `api.ebird.org/v2/product/lists/{region}[/y/m/d]` | API key | Checklist metadata only, walks back through history. |
| `api.ebird.org/v2/product/checklist/view/{subId}` | API key | Species per checklist. Frequency is computable, but ~36k calls/region for full history. |
| `api.ebird.org/v2/ref/hotspot/geo` | API key | Works, CORS-friendly. |
| `api.ebird.org/v2/product/stats/...` | API key | 404, does not exist. |

Week bucket index: `(month - 1) * 4 + w`, where `w` is 0/1/2/3 for days 1-7, 8-14,
15-21, 22+. 2026-07-29 -> index 27.

## Options for global coverage

1. **eBird Basic Dataset (EBD)** - free bulk download, request at ebird.org/data/download,
   approval takes days. ~100GB+ TSV. Aggregate once into per-region frequency JSON.
   The only sanctioned route to genuine all-region coverage.
2. **Manual bar-chart capture** - repeat this session's capture for 10-20 regions of
   interest. Ships immediately, exact, does not scale globally.
3. **Compute from public API per region, lazily** - a few thousand calls per region if
   limited to recent years. Scales to regions users actually visit. Most code.

Both 1 and 2 produce the same `{speciesCode: [48 floats]}` shape, so `bingo.js` can be
written once against that contract and the source swapped later.

**Automated scraping of `barchartData` is not an option** - it would breach eBird's terms.
A one-off manual capture for a personal app is defensible; a scheduled job is not.

## Caveats

- **n=1.** One location, one date, one hand-typed list. Validate against a second region
  and season before building a pipeline.
- Bar-chart capture used all years (1900-2026). Whether Merlin weights recent years more
  heavily is untested.
- The three missing birds are unexplained; something in Merlin's model is still unaccounted for.

## Files

| File | What |
|---|---|
| `merlin-expected.json` | Ground truth: 24 species in order, coordinates, region codes |
| `barchart-frequencies.json` | Captured frequency data, ZA-GT-08 (485 spp) + ZA-GT (531 spp), 48 buckets each |
| `probe.py` | Public-API strategies. Demonstrates the de-dup problem. |
| `score_barchart.py` | Scores captured bar-chart data against ground truth |
| `hotspot-blend.html` | Interactive hotspot-blend test page (serve locally, adjustable radius/sample/weight) |

# Sessions Overview

## Session log
| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-05-16 | EXIF auto-fill, OSM coord links, formSetup bug fix, worker redeploy |
| 002 | 2026-05-17 | Diagnosed R2 NXDOMAIN — ISP DNS propagation delay, not a provisioning failure. Image confirmed loading via 8.8.8.8. |
| 003 | 2026-05-17 | Fixed slug update bug in worker, added in-browser MOV-to-WebM conversion, removed file input required for edits, bumped SW to v8, pushed to prod. |
| 004 | 2026-05-18 | Persistent login via localStorage, JS-measured item padding for viewport isolation, `?mock` mode for local testing without DevTools, bumped SW to v9, pushed to prod. |
| 005 | 2026-05-18 | Fixed items invisible on Safari iOS (visibility vs opacity), fixed 401 auth bug in api.js still reading sessionStorage, deferred padding to rAF, fade-in on ready, bumped SW to v14. |
| 006 | 2026-05-18 | Architecture optimisation pass: CSS-only layout (no JS measurement), `content-visibility: auto` virtualisation, SW now caches R2 media with LRU trim, batched IndexedDB sync, rAF-throttled URL observer, prefetch observer for fetchPriority. SW v15. Pushed to prod. |
| 007 | 2026-05-18 | Fixed Safari upload TypeError (ArrayBuffer fix), diagnosed R2 DNS failure (ISP/carrier), iterated image sizing to max-height/max-width, removed snap scroll, added 12.5dvh margin between posts. SW v23. |

## Current status

Layout stable. Images use `max-width: 100%` + `max-height: 100dvh` — capped at viewport, natural size below that. Posts separated by `margin-bottom: 12.5dvh`. Safari upload bug fixed. R2 images loading correctly once DNS resolves (workaround: set DNS to 8.8.8.8). SW at v23, deployed.

## Next session checklist

- [ ] Figure out what is happening with the DNS resolution — why home ISP and mobile carrier both fail to resolve the R2 domain persistently

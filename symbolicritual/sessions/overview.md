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

## Current status

Optimisation pass complete. Layout is now CSS-only (`min-height: 100dvh` + flex centering + `content-visibility: auto`) so items render correctly from first paint with no measurement-then-fade. Cross-origin R2 media is now cached by the service worker for real offline support. IndexedDB sync is one transaction instead of N. SW at v15, deployed. No known blockers.

## Next session checklist

- [ ] Verify on real devices (iOS Safari especially) that scroll is smooth and images don't shift on load
- [ ] Test MOV upload end-to-end on a real clip
- [ ] Fix MOV conversion on mobile: `captureStream()` and WebM `MediaRecorder` unsupported on iOS Safari. Show clear error instead of hanging silently.

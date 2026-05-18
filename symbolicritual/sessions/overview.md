# Sessions Overview

## Session log
| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-05-16 | EXIF auto-fill, OSM coord links, formSetup bug fix, worker redeploy |
| 002 | 2026-05-17 | Diagnosed R2 NXDOMAIN — ISP DNS propagation delay, not a provisioning failure. Image confirmed loading via 8.8.8.8. |
| 003 | 2026-05-17 | Fixed slug update bug in worker, added in-browser MOV-to-WebM conversion, removed file input required for edits, bumped SW to v8, pushed to prod. |
| 004 | 2026-05-18 | Persistent login via localStorage, JS-measured item padding for viewport isolation, `?mock` mode for local testing without DevTools, bumped SW to v9, pushed to prod. |
| 005 | 2026-05-18 | Fixed items invisible on Safari iOS (visibility vs opacity), fixed 401 auth bug in api.js still reading sessionStorage, deferred padding to rAF, fade-in on ready, bumped SW to v14. |

## Current status

Stages 1-9 complete. App deployed and fully functional. Auth works correctly via localStorage. Items fade in once padding is calculated. Mock mode available at `?mock` for local testing. No known blockers.

## Next session checklist

- [ ] Optimisations: review padding calculation performance, lazy loading behaviour, and render bottlenecks
- [ ] Test MOV upload end-to-end on a real clip
- [ ] Fix MOV conversion on mobile: `captureStream()` and WebM `MediaRecorder` unsupported on iOS Safari. Show clear error instead of hanging silently.

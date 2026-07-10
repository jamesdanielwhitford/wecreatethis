# Sessions Overview

## Session log

| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-05-30 | Voice Notes rebuilt: worker + D1 backend, admin login, live 10s chunked transcription, editable notes, wake lock |
| 002 | 2026-05-30 | Voice Notes: fix notes never loading (IndexedDB index key mismatch), remove live streaming, add mic-drop detection, push to prod |
| 003 | 2026-07-09 | Hardle: merged Hardle+Randle into one page (Practice Mode, no separate URL), removed Easy Mode, dot-based scoring, Zanagrams-style results screen + hamburger menu with in-modal feedback view. Branch `hardle-update` pushed, not merged. |
| 004 | 2026-07-09 | Hardle: merged `hardle-update` to `main` (live in prod). Fixed tile squashing on narrow screens, dead gap on tall screens (iPad Pro), daily puzzle resetting after switching to Practice Mode, and Enter/Backspace key shading. |

## Current status

- Voice Notes live in prod (SW v13, DB voice-notes-v3)
- Worker deployed at `https://voice-notes.james-052.workers.dev`, D1 has 2 remote notes
- Single post-recording transcription (no more live streaming)
- Mic-drop stops animation immediately
- Not yet tested: admin login + D1 sync on mobile
- Hardle: Hardle/Randle merge is live in prod on `main` (commit `b896181`), including follow-up fixes for tile sizing, layout centering, and a daily-puzzle-reset bug. See session-004 for full detail.

## Next session checklist

- [ ] Test admin login and D1 sync on mobile
- [ ] Verify notes load correctly after DB v3 fix in prod
- [ ] Hardle: continue live device testing (tile sizing/centering fixes were verified via Playwright, not yet confirmed on real devices)
- [ ] Hardle: watch for other state-bleed bugs between Hardle/Practice Mode (shared `game` object instance)
- [ ] Hardle: consider writing a dedicated `hardle/CLAUDE.md`

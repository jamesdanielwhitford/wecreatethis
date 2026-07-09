# Sessions Overview

## Session log

| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-05-30 | Voice Notes rebuilt: worker + D1 backend, admin login, live 10s chunked transcription, editable notes, wake lock |
| 002 | 2026-05-30 | Voice Notes: fix notes never loading (IndexedDB index key mismatch), remove live streaming, add mic-drop detection, push to prod |
| 003 | 2026-07-09 | Hardle: merged Hardle+Randle into one page (Practice Mode, no separate URL), removed Easy Mode, dot-based scoring, Zanagrams-style results screen + hamburger menu with in-modal feedback view. Branch `hardle-update` pushed, not merged. |

## Current status

- Voice Notes live in prod (SW v13, DB voice-notes-v3)
- Worker deployed at `https://voice-notes.james-052.workers.dev`, D1 has 2 remote notes
- Single post-recording transcription (no more live streaming)
- Mic-drop stops animation immediately
- Not yet tested: admin login + D1 sync on mobile
- Hardle: `hardle-update` branch has the Hardle/Randle merge, pushed but not yet merged to main/deployed. See session-003 for full detail.

## Next session checklist

- [ ] Test admin login and D1 sync on mobile
- [ ] Verify notes load correctly after DB v3 fix in prod
- [ ] Hardle: finish manual verification pass (offline reload, mid-game state restore in both variants)
- [ ] Hardle: merge `hardle-update` to main once verified (bump SW versions per "push to prod" workflow)

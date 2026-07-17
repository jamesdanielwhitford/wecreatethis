# Sessions Overview

## Session log

| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-05-30 | Voice Notes rebuilt: worker + D1 backend, admin login, live 10s chunked transcription, editable notes, wake lock |
| 002 | 2026-05-30 | Voice Notes: fix notes never loading (IndexedDB index key mismatch), remove live streaming, add mic-drop detection, push to prod |
| 003 | 2026-07-09 | Hardle: merged Hardle+Randle into one page (Practice Mode, no separate URL), removed Easy Mode, dot-based scoring, Zanagrams-style results screen + hamburger menu with in-modal feedback view. Branch `hardle-update` pushed, not merged. |
| 004 | 2026-07-09 | Hardle: merged `hardle-update` to `main` (live in prod). Fixed tile squashing on narrow screens, dead gap on tall screens (iPad Pro), daily puzzle resetting after switching to Practice Mode, and Enter/Backspace key shading. |
| 005 | 2026-07-14 | Blog: full rebuild to folder-driven content (`content/{section}/{post}/index.md` + `build.js` manifest generator), scroll-through post stack with `#fragment` URLs, hand-authored `content/home.md` homepage, `draft: true` frontmatter flag. Merged `blog-work` → `dev` → `main`, live in prod. |
| 006 | 2026-07-17 | Blog: nested sections (any folder depth), unified breadcrumb layout + shared `style.css`, zero-maintenance `_redirects` (content pass-through + wildcard), CI manifest regeneration (GitHub Action), reading-order toggle, code fences/inline code/blockquotes with a tiny no-dependency highlighter, SW v7 (manifest-derived assets, network-first content, cache-poisoning fix). Uncommitted on `dev`. |

## Current status

- Voice Notes live in prod (SW v13, DB voice-notes-v3)
- Worker deployed at `https://voice-notes.james-052.workers.dev`, D1 has 2 remote notes
- Single post-recording transcription (no more live streaming)
- Mic-drop stops animation immediately
- Not yet tested: admin login + D1 sync on mobile
- Hardle: Hardle/Randle merge is live in prod on `main` (commit `b896181`), including follow-up fixes for tile sizing, layout centering, and a daily-puzzle-reset bug. See session-004 for full detail.
- Blog: session-006 upgrade (nested sections, unified layout, CI manifest, sort toggle, code rendering, SW v7) is **uncommitted on `dev`**, verified locally via Playwright + wrangler but not yet deployed. Architecture is documented in `blog/CLAUDE.md`; the blog SW deliberately deviates from repo-wide SW rules (manifest-derived assets, network-first content, never fetch `.html` URLs from it). Prod still runs the session-005 version. See session-006 for full detail.

## Next session checklist

- [ ] Test admin login and D1 sync on mobile
- [ ] Verify notes load correctly after DB v3 fix in prod
- [ ] Hardle: continue live device testing (tile sizing/centering fixes were verified via Playwright, not yet confirmed on real devices)
- [ ] Hardle: watch for other state-bleed bugs between Hardle/Practice Mode (shared `game` object instance)
- [ ] Hardle: consider writing a dedicated `hardle/CLAUDE.md`
- [ ] Blog: commit session-006 work on `dev` and push to prod; watch first deploy to confirm the `/blog/ /blog/ 200` self-rewrite behaves on real Cloudflare Pages
- [ ] Blog: extend markdown renderer for tables (blockquotes/code blocks done in session 006)
- [ ] Blog: write real `home.md` content as more sections are added

# Chessle

A turn-based chess game played by sharing links between two players.

## Overview

Chessle is an offline-first Progressive Web App where two players take turns making chess moves and sharing game state via URL links. There is no server — all game data lives in each player's IndexedDB, and moves are communicated by encoding them into shareable URLs.

## Features

- **Turn-based chess via shared links** — make a move, share the URL, opponent opens it to see your move and respond
- **Play as white or black** — choose your color when creating a game
- **Invite flow for black** — when starting as black, a "Share Game to Start" button lets you invite an opponent to play as white
- **Taunts** — send a taunt message with each shared move
- **Planning mode** — after making your move, continue moving pieces to plan ahead (not shared)
- **Resend move** — if your opponent hasn't received your move, resend the same link
- **Game management** — rename and delete games from the games list
- **Random aliases** — auto-generated chess-piece-based aliases (e.g., "White Knight", "Black Queen")
- **Board flipping** — board automatically flips when playing as black
- **Offline support** — full PWA with service worker caching

## Technology Stack

- **Vanilla JavaScript** — no frameworks
- **IndexedDB** — local storage for game data
- **Service Workers** — offline functionality and caching
- **PWA** — installable progressive web app
- **Cinzel font** — chess-themed serif typography

## File Structure

```
chessle/
├── index.html       # Home page — games list with FAB to create new games
├── game.html        # Game page — chess board with move/share UI
├── styles.css       # All styles with dark theme and responsive layout
├── app.js           # Home page logic (game creation, list management)
├── game.js          # Game page logic (board, moves, sharing, UI state)
├── db.js            # IndexedDB wrapper (CRUD for games)
├── sw.js            # Service worker (v5)
├── manifest.json    # PWA manifest
├── icon-192.png     # App icon (192x192)
├── icon-512.png     # App icon (512x512)
└── CLAUDE.md        # This file
```

## Architecture

### Data Layer
- **db.js**: IndexedDB wrapper (`chessle-db` v2, `games` store with UUID string keys)
  - `initDB()` — initialize database
  - `saveGame(game)` — save new game
  - `getAllGames()` — get all games sorted by updatedAt descending
  - `getGame(id)` — get single game by UUID
  - `updateGame(game)` — update existing game
  - `deleteGame(id)` — delete game

### Application Layer
- **app.js**: Home page logic
  - Game creation modal with color selection, alias, title, and taunt inputs
  - Games list rendering with turn count and date
  - Three-dot menu with rename/delete per game
  - Random alias generation based on chess pieces and chosen color

- **game.js**: Game page logic
  - **Board rendering** — 8x8 grid with Unicode chess pieces, flippable for black
  - **Move handling** — click-to-select, click-to-move with color enforcement
  - **Move states**: `idle` (waiting for move), `moved` (move made, ready to share), `planning` (post-share exploration)
  - **Share flow** — builds URL with encoded move, opens share modal with taunt input, uses Web Share API or clipboard
  - **Invite flow** — when starting as black, builds invite URL (no move encoded) so opponent can join as white
  - **URL parsing** — handles both local (`?id=UUID`) and shared (`?g=UUID&t=turn&m=move...`) URLs
  - **Game receiving** — `receiveSharedMove()` creates or updates game from shared URL params, then redirects to clean local URL

### URL Scheme

**Local URL**: `/chessle/game?id=<UUID>`

**Shared URL**: `/chessle/game?g=<UUID>&t=<turn>&m=<move>&a=<alias>&ta=<taunt>&c=<color>&ti=<title>`
- `g` — game UUID
- `t` — turn number
- `m` — move as `fromRow,fromCol,toRow,toCol` (omitted for invite links)
- `a` — sender's alias
- `ta` — taunt message
- `c` — creator color (`w`/`b`, first share only)
- `ti` — game title (first share only)

### UI State Machine

The player section below the board changes based on `moveState`:

| State | Player's Turn | UI |
|-------|--------------|-----|
| `idle` | Yes | "Your move" prompt, board interactive |
| `idle` | No (shared) | "Awaiting opponent's turn" + Resend button |
| `idle` | No (invite needed) | "Share Game to Start" button |
| `moved` | — | Reset + Share Move buttons |
| `planning` | — | Reset button only, board in planning mode |

### Game Data Model

```javascript
{
  id: 'a1b2c3d4',                    // 8-char hex UUID
  title: 'Feb 6, 2026',              // Custom or auto-generated title
  createdAt: '2026-02-06T...',        // ISO timestamp
  updatedAt: '2026-02-06T...',        // ISO timestamp
  turnCount: 0,                       // Number of completed turns
  playerColor: 'white',              // This player's color
  playerWhiteAlias: 'White Knight',   // White player's display name
  playerBlackAlias: 'Waiting for opponent to join', // Black player's display name
  currentTaunt: 'Your move',         // Latest taunt message
  currentTurn: 'white',              // Whose turn it is
  boardState: [...],                  // 8x8 array of piece objects or null
  moveHistory: [...],                 // Array of {fromRow, fromCol, toRow, toCol}
  lastShareUrl: null                  // Last shared URL for resend
}
```

## Service Worker

- **Cache name**: `chessle-v5`
- **Strategy**: Network-first with cache fallback
- **URL normalization**: Strips `.html` extensions, normalizes `/index` to `/`
- Caches all app assets on install
- Falls back to cached content when offline

## Future Goals

### Auto-generated aliases (no user choice)
- Remove the "Your Alias" input from the create game modal in `index.html`
- Replace `generateRandomAlias(color)` in both `app.js` and `game.js` with a new version that picks from a long list of adjectives + a random chess piece (e.g. "Blazing Knight", "Cryptic Queen")
- Remove all `playerAliasInput` references from `app.js` (DOM element, placeholder updates, value reading)
- Alias is auto-generated on game creation and when opponents join — no user choice

### Shorter shared URLs after first exchange
- Only include `a` (alias) param in shared URLs on the first two turns (turnCount <= 1) — after that both players already have each other's alias stored locally
- Only include `ta` (taunt) param if the user actively types a new taunt in the share modal — don't pre-fill with the previous taunt, start the field empty with placeholder "Add a taunt..."
- `c` (creator color) and `ti` (title) are already first-share only
- After the first exchange, URLs should be minimal: just `g`, `t`, `m`
- Make sure `buildInviteUrl()` (for black-start games) always includes full params since it's the initial handshake
- Resend uses the stored `lastShareUrl` verbatim so it's unaffected by these changes
- Account for both white-start and black-start flows

## Development Notes

- Service worker cache version must be bumped when making changes
- Board state is always rebuilt from `moveHistory` via `replayMoves()` for consistency
- No move validation — players are trusted (it's a casual game between friends)
- The `currentTurn` alternates based on `turnCount % 2` (0 = white, 1 = black)

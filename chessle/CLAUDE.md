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

## Implementation Plan: Freeform Correspondence Chess

### Overview of Changes

Transform Chessle from a strict turn-based game into a freeform correspondence chess tool where:
- Players can move pieces freely without turn enforcement
- Each player names themselves and their opponent (no aliases)
- URLs encode the complete board state (piece positions that differ from starting positions)
- Each shared URL is a "move" that can optionally include a taunt
- Players can continue moving pieces after sharing (local planning mode that resets when receiving opponent's URL)
- Move history feature will be added later to review past board states

### Phase 1: Data Model & Name Management

**Changes to Game Object:**
```javascript
{
  id: 'a1b2c3d4',
  title: null,                        // REMOVED - title is now just opponent's name
  opponentName: 'Jane',               // NEW - opponent's display name
  playerName: 'John',                 // NEW - this player's display name
  createdAt: '2026-02-06T...',
  updatedAt: '2026-02-06T...',
  sharedMoveCount: 0,                 // RENAMED from turnCount - counts shared URLs
  playerColor: 'white',               // REMOVED - no longer needed
  playerWhiteAlias: null,             // REMOVED - replaced by playerName/opponentName
  playerBlackAlias: null,             // REMOVED
  currentTaunt: '',                   // Keep - last received/sent taunt
  currentTurn: null,                  // REMOVED - no turn enforcement
  boardState: [...],                  // Keep - current board state
  moveHistory: [],                    // KEEP for future feature - will store shared board states
  lastShareUrl: null,                 // Keep - for resend functionality
  lastSharedBoardState: null          // NEW - board state at last share (for reset)
}
```

**Create Game Flow Changes (index.html + app.js):**
1. Remove color selection toggle entirely
2. Update modal to have two name inputs:
   - "Your Name" (optional, placeholder: "Anonymous")
   - "Opponent's Name" (optional, placeholder: "Opponent")
3. Remove taunt input from create game modal (taunts are only sent when sharing)
4. Default game to white's starting position
5. Remove all alias generation code
6. Set `title` field to `opponentName` for games list display

**Name Editing (game.html + game.js):**
1. Make game title (opponent name) editable via three-dot menu
2. Add option to edit player's own name in three-dot menu
3. Update UI to show "You (PlayerName)" and opponent name clearly
4. Names are local only - never shared in URLs after initial creation

### Phase 2: Board State URL Encoding

**New URL Scheme:**
```
Shared URL: /chessle/game?g=<UUID>&n=<sharedMoveCount>&b=<boardDiff>&s=<senderName>&t=<taunt>
```

**Parameters:**
- `g` — game UUID
- `n` — shared move count (replaces turn number)
- `b` — board diff (encoded as comma-separated piece positions, only pieces NOT in starting positions)
- `s` — sender's name (only on first share to initialize opponent name)
- `t` — taunt message (optional, only if provided)

**Board Diff Encoding:**
Format: `colorTypeRowCol,colorTypeRowCol,...` (no separators between components)
- Color: `w` or `b`
- Type: `k` (king), `q` (queen), `r` (rook), `b` (bishop), `n` (knight), `p` (pawn)
- Row: `0-7`
- Col: `0-7`

Example: `wn55,bp44,wq33` = white knight at 5,5 + black pawn at 4,4 + white queen at 3,3

Empty squares (pieces captured/removed): `xRowCol`
Example: `x64` = square at row 6, col 4 is now empty (piece was captured)

Only include pieces that have moved from their starting positions. All other squares are assumed to be in starting positions.

**Encoding Logic (new function in game.js):**
```javascript
function encodeBoardState(boardState) {
  const diff = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      const startPiece = initialBoardState[row][col];

      // If piece differs from starting position, include it
      if (JSON.stringify(piece) !== JSON.stringify(startPiece)) {
        if (piece) {
          const colorCode = piece.color === 'white' ? 'w' : 'b';
          const typeCode = piece.type[0]; // k, q, r, b, n, p
          diff.push(`${colorCode}${typeCode}${row}${col}`);
        } else {
          // Piece removed from starting position - encode as empty
          diff.push(`x${row}${col}`);
        }
      }
    }
  }
  return diff.join(',');
}
```

**Decoding Logic:**
```javascript
function decodeBoardState(encodedDiff) {
  const board = cloneBoard(initialBoardState);
  if (!encodedDiff) return board;

  const pieces = encodedDiff.split(',');
  for (const piece of pieces) {
    if (piece.startsWith('x')) {
      // Empty square (captured piece)
      const row = parseInt(piece[1]);
      const col = parseInt(piece[2]);
      board[row][col] = null;
    } else {
      // Piece moved to new position
      const colorCode = piece[0];
      const typeCode = piece[1];
      const row = parseInt(piece[2]);
      const col = parseInt(piece[3]);

      const color = colorCode === 'w' ? 'white' : 'black';
      const typeMap = {k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn'};

      board[row][col] = { color, type: typeMap[typeCode] };
    }
  }
  return board;
}
```

**Example URLs:**
```
Starting position (no moves):
/chessle/game?g=abc123&n=1

After e4 (white pawn e2->e4):
/chessle/game?g=abc123&n=1&b=wp44,x64

Mid-game with several pieces moved:
/chessle/game?g=abc123&n=5&b=wn52,wn55,bp33,bp44,wq24,bk04,x60,x61,x70,x71&t=Check!
```
```

### Phase 3: Freeform Movement & Planning Mode

**Remove Turn Enforcement:**
1. Delete all `currentTurn` logic
2. Delete `getAllowedColor()` function
3. Players can select and move any piece at any time
4. Remove color-based move restrictions in `handleSquareClick()`
5. Remove player color assignment (everyone plays from white's perspective initially)

**New Movement States:**
- `idle` — no local changes since last received move
- `modified` — user has made changes to the board (can share or reset)

**Planning Mode (Local Changes):**
1. After sharing a URL, user can continue moving pieces
2. These changes are "planning" and stored separately
3. When receiving opponent's URL, local planning is discarded and board resets to opponent's state
4. Reset button discards local changes and reverts to `lastSharedBoardState`

**Modified UI States:**
```javascript
function updateMoveStateUI() {
  if (moveState === 'idle') {
    // Show opponent's name and taunt
    // "Share Position" button enabled
    // Reset button hidden (nothing to reset)
  } else if (moveState === 'modified') {
    // Show "You have unsaved changes"
    // "Share Position" button enabled
    // Reset button visible (revert to lastSharedBoardState)
  }
}
```

### Phase 4: Sharing & Receiving

**Share Flow (game.js):**
1. Click "Share Position" button
2. Open modal with taunt input (optional, empty by default)
3. Build URL with current board state
4. Save `lastSharedBoardState = cloneBoard(boardState)`
5. Use Web Share API or copy to clipboard
6. Return to `idle` state

**Receive Flow (game.js):**
1. Parse URL params (`g`, `n`, `b`, `s`, `t`)
2. Decode board state from `b` param
3. If new game, create with sender as opponent name
4. If existing game, discard local planning and apply received board state
5. Update `sharedMoveCount`, `currentTaunt`
6. Save to IndexedDB
7. Redirect to clean local URL

**First Share (Game Initialization):**
- Creator's first share includes `s` param with their name
- Receiver creates game with `opponentName = s` from URL
- Receiver's name is set locally (not from URL)
- Future shares don't include names (already stored locally)

### Phase 5: UI Updates

**Home Page (index.html + app.js):**
1. Update create game modal layout (remove color toggle, update name fields)
2. Games list shows opponent name as title
3. Remove turn count from list (replace with "X moves shared")

**Game Page (game.html + game.js):**
1. Update header to show: "vs [Opponent Name]"
2. Remove opponent status section (no more "awaiting turn")
3. Update player section to show player's name
4. Replace "Share Move" button with "Share Position"
5. Add "Your Name" and "Opponent Name" to three-dot menu for editing
6. Remove all turn/color display logic
7. Remove board flipping (always white at bottom)
8. Show taunt below opponent name if present

**Share Modal:**
1. Title: "Share Position"
2. Taunt input: placeholder "Add an optional message..."
3. Buttons: "Send" / "Copy Link"

### Phase 6: Move History (Future Feature)

**Data Structure:**
```javascript
moveHistory: [
  {
    boardState: [...],           // Full board state at this point
    taunt: 'Good move!',
    timestamp: '2026-02-06T...',
    sharedBy: 'white'            // which player shared this
  }
]
```

**UI (Future):**
- Button to open "Move History" modal
- List of all shared positions with timestamp
- Click to view board state in read-only mode
- Navigate forward/backward through history
- Return to current game

### Phase 7: Migration & Data Cleanup

**Database Migration (db.js):**
1. Bump DB_VERSION to 3
2. In upgrade handler, migrate existing games:
   - `title` → `opponentName`
   - `playerWhiteAlias` → `playerName` (for the player's color)
   - `playerBlackAlias` → `opponentName` (for opponent's color)
   - `turnCount` → `sharedMoveCount`
   - Remove `currentTurn`, `playerColor`
   - Add `lastSharedBoardState: null`

## Implementation Status

**⚠️ NEEDS REVIEW & TESTING**

Steps 1-20 have been implemented. The app has been transformed from a turn-based chess game into a freeform correspondence chess tool. **All changes need thorough testing and may require adjustments.**

### Completed Steps (1-20)

**STEP 1: Database Migration ✅**
- Bumped DB_VERSION from 2 to 3
- Added migration logic to transform existing games
- New fields: `playerName`, `opponentName`, `sharedMoveCount`, `lastSharedBoardState`
- Old fields kept temporarily for backwards compatibility

**STEP 2: Board Encoding/Decoding ✅**
- Added `encodeBoardState(boardState)` function
- Added `decodeBoardState(encodedDiff)` function
- Compact format: `wn55,bp44,wq33` (4 chars per piece)
- Empty squares: `x64` (3 chars)

**STEP 3: Create Game Modal HTML ✅**
- Added "Play As" color selection (White/Black)
- Added "Your Name" input field
- Added "Opponent's Name" input field
- Removed old "Game Title", "Your Alias", "Opening Taunt" fields

**STEP 4: Create Game Flow JavaScript ✅**
- Updated app.js to use new name fields
- Color selection logic restored
- Default names: "You" and "Opponent"
- Game title set to opponent's name

**STEP 5: Game Loading - Names ✅**
- Updated `loadGame()` to use `playerName` and `opponentName`
- Fallback to default names if fields don't exist
- Display names in UI correctly

**STEP 6: Remove Turn Enforcement ✅**
- Removed `getAllowedColor()` function
- Removed `opponentColor()` function
- Removed `playerMove` and `planningTurn` variables
- Players can now select and move any piece at any time
- Simplified move states to `'idle'` and `'modified'`

**STEP 7: Update Move State UI ✅**
- Simplified `updateMoveStateUI()` for two states:
  - `idle`: Reset button hidden, shows opponent taunt
  - `modified`: Reset button visible, shows "You have unsaved changes"

**STEP 8: Board Flipping (Restored) ✅**
- Players choose color (white/black) when creating game
- Board flips based on chosen color
- Players can still move any piece freely (freeform movement)
- Board orientation matches player's chosen side

**STEP 9: Update Share Flow ✅**
- Updated `buildShareUrl()` to use new encoding:
  - `g` param: game UUID
  - `n` param: sharedMoveCount
  - `b` param: board diff (compact encoding)
  - `s` param: sender name (first share only)
  - `c` param: creator color (first share only)
  - `t` param: taunt (optional)
- Removed old invite/move logic
- Everything is now "share position"

**STEP 10: Reset Functionality ✅**
- Removed `preMoveBoard` variable
- `resetBoard()` now uses `currentGame.lastSharedBoardState`
- Reset reverts to last shared position (or initial if no shares)
- `persistAndShare()` saves current board as `lastSharedBoardState`

**STEP 11: Update Receive Flow ✅**
- Updated `parseUrlParams()` to parse new URL format
- Updated `receiveSharedMove()` to:
  - Decode board state from `b` param
  - Create new game with sender's name as opponent
  - Update existing game with received board state
  - Discard local changes when receiving

**STEP 12: Verify Reset ✅**
- Cleaned up all references to removed variables
- Reset button only shows in 'modified' state
- Reset works correctly with new system

**STEP 13: Update UI Text ✅**
- Changed "Share Move" → "Share Position"
- Changed "Resend Move" → "Resend Position"
- Updated modal title to "Share Position"
- Changed label from "Taunt" → "Message (optional)"
- Placeholder: "Add an optional message..."
- Taunt input starts empty (not pre-filled)

**STEP 14: Name Editing ✅**
- Added "Edit Your Name" to game menu
- Added "Edit Opponent Name" to game menu
- Removed old "Rename Game" functionality
- Created two modals for editing names
- Event handlers save changes to IndexedDB and update UI
- Opponent name updates also update game title

**STEP 15: Name Editing Part 2 ✅**
- Combined with Step 14

**STEP 16: Update Games List ✅**
- Changed display from "Turn X" to "X positions shared"
- Proper singular/plural: "1 position shared" vs "2 positions shared"
- Uses `sharedMoveCount` field

**STEP 17: Clean Up Old Fields ✅**
- Removed `generateRandomAlias()` function
- Removed `chessPieces` array
- Removed old alias fields from new game creation
- Removed old alias fields from receiving shared games
- Simplified name loading (no old alias fallbacks)
- Kept `playerColor` (needed for board orientation)
- Kept backwards compatibility in database migration

**STEP 18: Share Modal Verification ✅**
- Confirmed all text updated correctly (from Step 13)
- Modal title: "Share Position"
- Label: "Message (optional)"
- Placeholder: "Add an optional message..."
- Input starts empty

**STEP 19: Database Cleanup ⏭️**
- Skipped - keeping old fields for backwards compatibility

**STEP 20: Bump Service Worker ✅**
- Updated `CACHE_NAME` from `chessle-v5` to `chessle-v6`
- Will force cache refresh on next load

### Remaining Steps

**STEP 21: Final Testing** - TODO

### Implementation Order (Step-by-Step)

**STEP 1: Database Migration (db.js)**
- Bump DB_VERSION from 2 to 3
- Add migration logic in `onupgradeneeded` to transform existing games:
  - Add `playerName` field (default: "You")
  - Add `opponentName` field (extract from `playerBlackAlias` or `playerWhiteAlias` based on player color)
  - Add `sharedMoveCount` field (copy from `turnCount`)
  - Add `lastSharedBoardState` field (set to null)
  - Keep old fields temporarily for compatibility
- Test: Open app, verify migration runs, check IndexedDB in DevTools

**STEP 2: Add Board Encoding/Decoding Functions (game.js)**
- Add `encodeBoardState(boardState)` function
- Add `decodeBoardState(encodedDiff)` function
- Don't use them yet, just add the functions
- Test: Call functions in console to verify they work

**STEP 3: Update Create Game Flow - Part 1 (index.html)**
- Remove color selection toggle HTML
- Add "Your Name" input field
- Add "Opponent's Name" input field
- Remove "Opening Taunt" input field
- Update modal title and button text
- Test: Open create modal, verify new fields appear

**STEP 4: Update Create Game Flow - Part 2 (app.js)**
- Remove color toggle event listeners
- Update create game function to use new name fields
- Set default names ("You" and "Opponent") if empty
- Create game with `playerName`, `opponentName`, and `sharedMoveCount: 0`
- Set `opponentName` as the game title for display
- Remove alias generation code
- Test: Create new game, verify it saves with correct fields

**STEP 5: Update Game Loading - Names (game.js)**
- Update `loadGame()` to read `playerName` and `opponentName` instead of aliases
- Update UI to display these names
- Keep all other logic the same for now
- Test: Load existing game, verify names display correctly

**STEP 6: Remove Turn Enforcement - Part 1 (game.js)**
- Remove `currentTurn` checks in `getAllowedColor()`
- Allow any piece to be selected regardless of color
- Remove `planningTurn` logic
- Test: Can now move any piece at any time

**STEP 7: Remove Turn Enforcement - Part 2 (game.js)**
- Simplify `moveState` to just `idle` and `modified`
- Update `performMove()` to use new state logic
- When any piece is moved, set state to `modified`
- Remove "planning mode" vs "real move" distinction
- Test: Move pieces, verify state changes correctly

**STEP 8: Remove Board Flipping (game.js)**
- Set `boardFlipped = false` always
- Remove board flip logic from `renderBoard()`
- Remove `playerColor` dependency for board orientation
- Test: Board always shows white at bottom

**STEP 9: Update Share Flow - Part 1 (game.js)**
- Update `buildShareUrl()` to use new encoding:
  - Use `encodeBoardState()` for `b` param
  - Use `sharedMoveCount` instead of `turnCount`
  - Use `playerName` for `s` param (only on first share)
  - Keep taunt as `t` param
- Don't change receive logic yet
- Test: Generate share URL, verify format is correct

**STEP 10: Update Share Flow - Part 2 (game.js)**
- Save `lastSharedBoardState` when sharing
- Increment `sharedMoveCount` when sharing
- Update state back to `idle` after sharing
- Test: Share position, verify board state is saved

**STEP 11: Update Receive Flow (game.js)**
- Update `receiveSharedMove()` to parse new URL params
- Use `decodeBoardState()` to rebuild board from `b` param
- Handle `s` param for opponent name on first share
- Discard local changes when receiving
- Test: Receive shared URL, verify board updates correctly

**STEP 12: Update Reset Functionality (game.js)**
- Update `resetBoard()` to revert to `lastSharedBoardState`
- Only show reset button when in `modified` state
- Test: Make changes, click reset, verify board reverts

**STEP 13: Update UI - Player Section (game.html + game.js)**
- Update opponent section to show opponent name (not alias)
- Remove "Awaiting opponent's turn" logic
- Update player section to show player name
- Change "Share Move" to "Share Position"
- Update `updateMoveStateUI()` for new states
- Test: UI reflects freeform chess tool, not turn-based game

**STEP 14: Add Name Editing - Part 1 (game.html)**
- Add "Edit Your Name" option to three-dot menu
- Add "Edit Opponent Name" option to three-dot menu
- Add modal for editing names
- Test: Menu options appear

**STEP 15: Add Name Editing - Part 2 (game.js)**
- Add event listeners for name editing menu items
- Add functions to save name changes to IndexedDB
- Update UI when names change
- Test: Edit names, verify they save and display correctly

**STEP 16: Update Games List (app.js)**
- Display opponent name as game title
- Show "X positions shared" instead of "Turn X"
- Test: Games list shows correct information

**STEP 17: Clean Up Old Fields (game.js + app.js)**
- Remove all references to `playerColor`, `currentTurn`
- Remove all alias-related code
- Remove old turn logic
- Test: Everything still works without old fields

**STEP 18: Update Share Modal (game.html + game.js)**
- Update modal title to "Share Position"
- Make taunt input empty by default (not pre-filled)
- Update placeholder text
- Test: Share modal works correctly

**STEP 19: Clean Up Database - Remove Old Fields (db.js)**
- In migration, actually remove old fields after copying data
- Clean up game objects when saving
- Test: New games don't have old fields

**STEP 20: Bump Service Worker Version (sw.js)**
- Update CACHE_NAME from `chessle-v5` to `chessle-v6`
- Test: App updates correctly, offline functionality works

**STEP 21: Final Testing**
- Create new game from scratch
- Share position with custom names
- Receive shared position
- Make moves and share again
- Edit names
- Reset to last shared position
- Verify URLs are compact
- Test offline functionality

### Testing Checklist

- [ ] Create new game with custom names
- [ ] Create new game with default names
- [ ] Share initial position
- [ ] Receive shared position and verify opponent name
- [ ] Edit player name and opponent name
- [ ] Make moves and verify board updates
- [ ] Share position after moves
- [ ] Receive opponent's position and verify local planning is discarded
- [ ] Reset to last shared position
- [ ] Verify URL encoding is minimal (only changed pieces)
- [ ] Test resend functionality
- [ ] Verify taunts are optional and work correctly
- [ ] Test with games that have many pieces moved
- [ ] Verify board state at starting position generates minimal URL

### File Changes Summary

- `CLAUDE.md` — This implementation plan
- `db.js` — Migrate data model (v2 → v3)
- `app.js` — Update create game modal and flow
- `game.js` — Major refactor (remove turns, new URL scheme, freeform movement)
- `index.html` — Update create game modal HTML
- `game.html` — Update game page UI elements
- `sw.js` — Bump cache version after changes

## Development Notes

- Service worker cache version must be bumped when making changes
- Board state is always rebuilt from encoded URL params or IndexedDB
- No move validation — players are trusted (it's a casual game between friends)
- Move history is deliberately simple (just store shared board states) for future viewer implementation

// Chessle - Game page logic

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .then(() => console.log('Service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

// DOM Elements
const opponentSection = document.getElementById('opponent-section');
const opponentName = document.getElementById('opponent-name');
const opponentStatus = document.getElementById('opponent-status');
const chessBoard = document.getElementById('chess-board');
const playerSection = document.getElementById('player-section');
const playerInfoArea = document.getElementById('player-info-area');
const playerTaunt = document.getElementById('player-taunt');
const playerActions = document.getElementById('player-actions');
const resetBtn = document.getElementById('reset-btn');
const shareBtn = document.getElementById('share-btn');
const capturedPiecesBtn = document.getElementById('captured-pieces-btn');
const capturedPiecesModal = document.getElementById('captured-pieces-modal');
const capturedWhiteList = document.getElementById('captured-white');
const capturedBlackList = document.getElementById('captured-black');
const closeCapturedBtn = document.getElementById('close-captured-btn');
const enterNameModal = document.getElementById('enter-name-modal');
const enterNameInput = document.getElementById('enter-name-input');
const saveEnterNameBtn = document.getElementById('save-enter-name-btn');
const opponentNameDisplay = document.getElementById('opponent-name-display');
const resendBtn = document.getElementById('resend-btn');
const resendActions = document.getElementById('resend-actions');
const shareModal = document.getElementById('share-modal');
const shareTauntInput = document.getElementById('share-taunt-input');
const sendMoveBtn = document.getElementById('send-move-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');

// Current game data
let currentGame = null;

// Chess piece Unicode symbols
const PIECES = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟'
};

// Initial board state (8x8 array, row 0 = rank 8, row 7 = rank 1)
const initialBoardState = [
  [
    { color: 'black', type: 'rook' },
    { color: 'black', type: 'knight' },
    { color: 'black', type: 'bishop' },
    { color: 'black', type: 'queen' },
    { color: 'black', type: 'king' },
    { color: 'black', type: 'bishop' },
    { color: 'black', type: 'knight' },
    { color: 'black', type: 'rook' }
  ],
  [
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' },
    { color: 'black', type: 'pawn' }
  ],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' },
    { color: 'white', type: 'pawn' }
  ],
  [
    { color: 'white', type: 'rook' },
    { color: 'white', type: 'knight' },
    { color: 'white', type: 'bishop' },
    { color: 'white', type: 'queen' },
    { color: 'white', type: 'king' },
    { color: 'white', type: 'bishop' },
    { color: 'white', type: 'knight' },
    { color: 'white', type: 'rook' }
  ]
];

// Board state
let boardState = cloneBoard(initialBoardState);

// Selected square
let selectedSquare = null;

// Selected captured piece for placement
let selectedCapturedPiece = null;

// Move state: 'idle' | 'modified' | 'waiting' | 'planning'
// 'idle' - no local changes since last received move (opponent's turn)
// 'modified' - user has made changes to the board (can share or reset)
// 'waiting' - user has shared their move, waiting for opponent to respond
// 'planning' - user is experimenting while waiting (can reset but not share)
let moveState = 'idle';

// Last shared URL (for resharing)
let lastShareUrl = null;

// Track highlighted squares (squares that were moved in the last turn)
// Array of {row, col} objects
let highlightedSquares = [];

// Which color this player controls
let playerColor = 'white';

// Whether the board is flipped (black's perspective)
let boardFlipped = false;

// Deep copy a board state
function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
}

// Calculate captured pieces by comparing current board to initial board
function getCapturedPieces() {
  const captured = { white: [], black: [] };

  // Count pieces in initial position
  const initialCounts = { white: {}, black: {} };
  const currentCounts = { white: {}, black: {} };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const initialPiece = initialBoardState[row][col];
      const currentPiece = boardState[row][col];

      if (initialPiece) {
        const color = initialPiece.color;
        const type = initialPiece.type;
        initialCounts[color][type] = (initialCounts[color][type] || 0) + 1;
      }

      if (currentPiece) {
        const color = currentPiece.color;
        const type = currentPiece.type;
        currentCounts[color][type] = (currentCounts[color][type] || 0) + 1;
      }
    }
  }

  // Find captured pieces
  ['white', 'black'].forEach(color => {
    ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].forEach(type => {
      const initial = initialCounts[color][type] || 0;
      const current = currentCounts[color][type] || 0;
      const capturedCount = initial - current;

      for (let i = 0; i < capturedCount; i++) {
        captured[color].push({ color, type });
      }
    });
  });

  return captured;
}

// Apply a move to a board state (mutates the board)
function applyMoveToBoard(board, fromRow, fromCol, toRow, toCol) {
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = null;
}

// Replay all moves from move history onto a fresh board
function replayMoves(moveHistory) {
  const board = cloneBoard(initialBoardState);
  for (const move of moveHistory) {
    applyMoveToBoard(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
  }
  return board;
}

// --- Board State Encoding/Decoding ---

// Encode board state as compact diff from starting position
// Format: colorTypeRowCol (4 chars per piece), comma-separated
// Example: "wn55,bp44,wq33" = white knight at 5,5 + black pawn at 4,4 + white queen at 3,3
// Empty squares (captured pieces): "xRowCol" (3 chars)
function encodeBoardState(boardState) {
  const diff = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      const startPiece = initialBoardState[row][col];

      // If piece differs from starting position, include it
      if (JSON.stringify(piece) !== JSON.stringify(startPiece)) {
        if (piece) {
          // Piece moved to this square
          const colorCode = piece.color === 'white' ? 'w' : 'b';
          const typeCode = piece.type[0]; // k, q, r, b, n, p
          diff.push(`${colorCode}${typeCode}${row}${col}`);
        } else {
          // Piece removed from starting position (captured)
          diff.push(`x${row}${col}`);
        }
      }
    }
  }

  return diff.join(',');
}

// Decode board state from compact diff string
// Rebuilds full board from starting position + changes
function decodeBoardState(encodedDiff) {
  const board = cloneBoard(initialBoardState);

  if (!encodedDiff || encodedDiff.trim() === '') {
    return board; // No changes, return starting position
  }

  const pieces = encodedDiff.split(',');

  for (const piece of pieces) {
    if (piece.startsWith('x')) {
      // Empty square (captured piece)
      const row = parseInt(piece[1], 10);
      const col = parseInt(piece[2], 10);
      board[row][col] = null;
    } else {
      // Piece moved to new position
      const colorCode = piece[0];
      const typeCode = piece[1];
      const row = parseInt(piece[2], 10);
      const col = parseInt(piece[3], 10);

      const color = colorCode === 'w' ? 'white' : 'black';
      const typeMap = {
        k: 'king',
        q: 'queen',
        r: 'rook',
        b: 'bishop',
        n: 'knight',
        p: 'pawn'
      };

      board[row][col] = { color, type: typeMap[typeCode] };
    }
  }

  return board;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// --- URL Parsing ---

// Parse URL to determine if this is a shared link or local link
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // Shared link has 'g' param (new format)
  if (params.has('g')) {
    return {
      type: 'shared',
      gameUUID: params.get('g'),
      sharedMoveCount: parseInt(params.get('n'), 10) || 0,
      boardDiff: params.get('b') || null, // Encoded board diff
      senderName: params.get('s') || null, // Sender's name (first share only)
      creatorColor: params.get('c') || null, // 'w' or 'b' (first share only)
      taunt: params.get('t') || null // Optional taunt
    };
  }

  // Local link has 'id' param
  if (params.has('id')) {
    return {
      type: 'local',
      gameId: params.get('id')
    };
  }

  return null;
}

// --- Shared URL Handling ---

// Receive a shared position: create or update game from URL params
async function receiveSharedMove(params) {
  let game = await getGame(params.gameUUID);

  // Get the previous board state (what we had before receiving this move)
  const previousBoardState = game ? cloneBoard(game.boardState || initialBoardState) : cloneBoard(initialBoardState);

  // Decode board state from URL
  const receivedBoardState = params.boardDiff
    ? decodeBoardState(params.boardDiff)
    : cloneBoard(initialBoardState);

  // Calculate opponent's highlighted squares (only pieces that changed from previous state)
  const opponentHighlights = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const receivedPiece = receivedBoardState[row][col];
      const previousPiece = previousBoardState[row][col];

      // Highlight if piece differs from previous position
      const piecesAreDifferent = JSON.stringify(receivedPiece) !== JSON.stringify(previousPiece);
      if (piecesAreDifferent && receivedPiece) {
        // Piece exists in new position that's different from previous
        opponentHighlights.push({ row, col });
      }
    }
  }

  if (!game) {
    // New game — create it from received share
    const creatorColor = params.creatorColor === 'b' ? 'black' : 'white';
    const myColor = creatorColor === 'white' ? 'black' : 'white';

    const now = new Date().toISOString();
    game = {
      id: params.gameUUID,
      title: params.senderName || 'Opponent', // Use sender's name as game title
      playerName: null, // Will be set when user enters their name
      opponentName: params.senderName || 'Opponent',
      playerColor: myColor,
      createdAt: now,
      updatedAt: now,
      sharedMoveCount: params.sharedMoveCount || 0,
      currentTaunt: params.taunt || '',
      boardState: receivedBoardState,
      lastSharedBoardState: receivedBoardState, // Set as last shared
      lastOpponentHighlights: opponentHighlights, // Save opponent's highlights
      moveHistory: [],
      opponentHasResponded: false // Will be set to true when this player shares back
    };

    await saveGame(game);
  } else {
    // Existing game — update with received board state
    game.boardState = receivedBoardState;
    game.lastSharedBoardState = receivedBoardState; // Update last shared
    game.lastOpponentHighlights = opponentHighlights; // Save opponent's highlights
    game.sharedMoveCount = params.sharedMoveCount || game.sharedMoveCount;

    if (params.taunt) {
      game.currentTaunt = params.taunt;
    }

    // Update opponent name if provided (first share)
    if (params.senderName && !game.opponentName) {
      game.opponentName = params.senderName;
      game.title = params.senderName;
    }

    // Mark that opponent has responded (we received a move from them)
    game.opponentHasResponded = true;

    game.lastShareUrl = null; // Clear last share URL (no longer waiting)
    game.lastPlayerHighlights = null; // Clear player's highlights (opponent responded)
    game.updatedAt = new Date().toISOString();

    await updateGame(game);
  }

  // Redirect to clean local URL
  window.location.replace(`/chessle/game?id=${params.gameUUID}`);
}

// --- Share Position ---

function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('g', currentGame.id);
  params.set('n', currentGame.sharedMoveCount + 1); // Use sharedMoveCount instead of turnCount

  // Encode current board state as diff
  const boardDiff = encodeBoardState(boardState);
  if (boardDiff) {
    params.set('b', boardDiff);
  }

  // Include sender's name and color if opponent hasn't responded yet
  // This allows the first share to be re-shared if it fails or opponent hasn't received it
  if (!currentGame.opponentHasResponded) {
    const senderName = currentGame.playerName || 'You';
    params.set('s', senderName);
    params.set('c', currentGame.playerColor === 'white' ? 'w' : 'b');
    console.log('Including sender name (opponent hasn\'t responded yet):', senderName);
  } else {
    console.log('Opponent has responded - not including sender name');
  }

  // Taunt (optional)
  const taunt = shareTauntInput.value.trim();
  if (taunt) {
    params.set('t', taunt);
  }

  const baseUrl = `${window.location.origin}/chessle/game`;
  return `${baseUrl}?${params.toString()}`;
}

function openShareModal() {
  shareTauntInput.value = ''; // Always start empty (taunt is optional)
  shareTauntInput.placeholder = 'Add an optional message...';
  shareModal.style.display = 'flex';
}

async function persistAndShare() {
  // Update taunt from modal input
  const taunt = shareTauntInput.value.trim() || '';
  currentGame.currentTaunt = taunt;

  const shareUrl = buildShareUrl();

  // Save the current board state as last shared
  currentGame.lastSharedBoardState = cloneBoard(boardState);
  currentGame.boardState = cloneBoard(boardState);
  currentGame.sharedMoveCount += 1;
  currentGame.lastShareUrl = shareUrl;

  // Save player's highlights so they persist after sharing
  currentGame.lastPlayerHighlights = [...highlightedSquares];

  currentGame.updatedAt = new Date().toISOString();
  await updateGame(currentGame);

  // Keep highlights visible after sharing (shows what player moved last)
  // Don't clear them - they should remain until opponent responds

  // Set to waiting state (user has shared, waiting for opponent)
  moveState = 'waiting';
  lastShareUrl = shareUrl;
  renderBoard(); // Re-render with highlights still visible
  updateMoveStateUI();

  // Update player taunt display
  if (taunt) {
    playerTaunt.textContent = taunt;
    playerTaunt.style.display = '';
  } else {
    playerTaunt.style.display = 'none';
  }

  shareModal.style.display = 'none';
  return shareUrl;
}

async function getShareUrl() {
  if (shareModal.dataset.resend === 'true') {
    shareModal.dataset.resend = '';
    shareModal.style.display = 'none';
    // Stay in waiting state when resending
    moveState = 'waiting';
    updateMoveStateUI();
    return lastShareUrl;
  }
  return await persistAndShare();
}

async function sendMoveAction() {
  const shareUrl = await getShareUrl();

  if (navigator.share) {
    try {
      await navigator.share({ url: shareUrl });
    } catch (err) {
      if (err.name !== 'AbortError') {
        await copyToClipboard(shareUrl);
      }
    }
  } else {
    await copyToClipboard(shareUrl);
  }
}

async function copyLinkAction() {
  const shareUrl = await getShareUrl();
  await copyToClipboard(shareUrl);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Link copied!');
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Link copied!');
  }
}

function showToast(message) {
  // Simple toast notification
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: var(--primary-bg);
    padding: 10px 20px;
    border-radius: 8px;
    font-family: "Cinzel", serif;
    font-size: 0.9rem;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// --- UI State ---

function updateMoveStateUI() {
  // Hide all sections by default
  playerInfoArea.style.display = 'none';
  playerActions.style.display = 'none';
  resendActions.style.display = 'none';

  if (moveState === 'idle') {
    // No local changes - show current board state
    resetBtn.style.display = 'none'; // Nothing to reset
    playerActions.style.display = '';
    shareBtn.style.display = '';
    shareBtn.textContent = 'Make Your Move';
    shareBtn.disabled = true; // Disable button until user makes a move
    shareBtn.style.opacity = '0.5';
    shareBtn.style.cursor = 'not-allowed';

    // Show opponent name and taunt if present
    if (currentGame) {
      if (currentGame.currentTaunt) {
        opponentStatus.textContent = currentGame.currentTaunt;
      } else {
        opponentStatus.textContent = '';
      }

      // Show player info area with name
      playerInfoArea.style.display = '';
    }
  } else if (moveState === 'modified') {
    // User has made local changes
    resetBtn.style.display = ''; // Show reset button
    playerActions.style.display = '';
    shareBtn.style.display = '';
    shareBtn.textContent = 'Share Your Move';
    shareBtn.disabled = false; // Enable button
    shareBtn.style.opacity = '1';
    shareBtn.style.cursor = 'pointer';

    // Show "You have unsaved changes" message
    opponentStatus.textContent = 'You have unsaved changes';

    // Show player info
    playerInfoArea.style.display = '';
  } else if (moveState === 'waiting') {
    // User has shared their move, waiting for opponent
    resetBtn.style.display = 'none'; // Hide reset button
    resendActions.style.display = ''; // Show resend button
    playerActions.style.display = 'none'; // Hide main action buttons

    // Show "Waiting for opponent" message
    opponentStatus.textContent = 'Waiting for opponent...';

    // Show player info
    playerInfoArea.style.display = '';
  } else if (moveState === 'planning') {
    // User is experimenting while waiting for opponent
    playerActions.style.display = ''; // Show player actions container
    resetBtn.style.display = ''; // Show reset button
    shareBtn.style.display = 'none'; // Hide share button (can't share in planning mode)
    resendActions.style.display = 'none'; // Hide resend button

    // Show "Planning mode" message
    opponentStatus.textContent = 'Planning mode - Click Reset to return to sent position';

    // Show player info
    playerInfoArea.style.display = '';
  }
}

// --- Board Rendering ---

function renderBoard() {
  chessBoard.innerHTML = '';

  // Add or remove planning mode class based on state
  if (moveState === 'planning') {
    chessBoard.classList.add('planning-mode');
  } else {
    chessBoard.classList.remove('planning-mode');
  }

  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      // Map visual position to board array position
      const row = boardFlipped ? (7 - visualRow) : visualRow;
      const col = boardFlipped ? (7 - visualCol) : visualCol;

      const square = document.createElement('div');
      square.className = 'chess-square';

      // Light/dark based on actual board position (not visual)
      const isLight = (row + col) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      square.dataset.row = row;
      square.dataset.col = col;

      // Highlight selected square
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // Highlight squares from last move
      const isHighlighted = highlightedSquares.some(h => h.row === row && h.col === col);
      if (isHighlighted) {
        square.classList.add('highlighted');
      }

      const piece = boardState[row][col];
      if (piece) {
        const pieceSpan = document.createElement('span');
        pieceSpan.className = `chess-piece ${piece.color}`;
        pieceSpan.textContent = PIECES[piece.type];
        square.appendChild(pieceSpan);
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      chessBoard.appendChild(square);
    }
  }
}

// --- Move Handling ---

function handleSquareClick(row, col) {
  const clickedPiece = boardState[row][col];

  // Handle placing a captured piece
  if (selectedCapturedPiece) {
    if (clickedPiece) {
      showToast('Square is occupied. Click an empty square.');
      return;
    }

    // Place the captured piece on the board
    boardState[row][col] = { ...selectedCapturedPiece };
    selectedCapturedPiece = null;

    // Determine state based on current state
    if (moveState === 'idle') {
      // First change after receiving opponent's move
      highlightedSquares = [];
      if (!highlightedSquares.some(h => h.row === row && h.col === col)) {
        highlightedSquares.push({ row, col });
      }
      moveState = 'modified';
    } else if (moveState === 'waiting') {
      // Entering planning mode
      moveState = 'planning';
    } else if (moveState === 'modified') {
      // Continue building moves
      if (!highlightedSquares.some(h => h.row === row && h.col === col)) {
        highlightedSquares.push({ row, col });
      }
      moveState = 'modified';
    } else if (moveState === 'planning') {
      // Continue planning
      moveState = 'planning';
    }

    renderBoard();
    updateMoveStateUI();
    showToast('Piece placed on board');
    return;
  }

  if (!selectedSquare) {
    if (!clickedPiece) return;

    // Can select any piece (no color restrictions)
    selectedSquare = { row, col };
    renderBoard();
  } else {
    const selectedPiece = boardState[selectedSquare.row][selectedSquare.col];

    // Clicking same square deselects
    if (selectedSquare.row === row && selectedSquare.col === col) {
      selectedSquare = null;
      renderBoard();
      return;
    }

    // Clicking another piece of the same color re-selects
    if (clickedPiece && clickedPiece.color === selectedPiece.color) {
      selectedSquare = { row, col };
      renderBoard();
      return;
    }

    // Execute the move
    performMove(selectedSquare.row, selectedSquare.col, row, col, selectedPiece);
  }
}

function performMove(fromRow, fromCol, toRow, toCol, piece) {
  // Apply the move to the board
  applyMoveToBoard(boardState, fromRow, fromCol, toRow, toCol);

  // Determine next state based on current state
  if (moveState === 'idle') {
    // First move after receiving opponent's move
    highlightedSquares = [];
    // Remove the 'from' square if it's already highlighted (piece moved away)
    highlightedSquares = highlightedSquares.filter(h => !(h.row === fromRow && h.col === fromCol));
    // Add the 'to' square (where piece moved to)
    if (!highlightedSquares.some(h => h.row === toRow && h.col === toCol)) {
      highlightedSquares.push({ row: toRow, col: toCol });
    }
    moveState = 'modified';
  } else if (moveState === 'waiting') {
    // User is experimenting while waiting for opponent - enter planning mode
    // Don't change highlights - they're just planning, not making a real move
    moveState = 'planning';
  } else if (moveState === 'modified') {
    // Continue building up moves before sharing
    highlightedSquares = highlightedSquares.filter(h => !(h.row === fromRow && h.col === fromCol));
    if (!highlightedSquares.some(h => h.row === toRow && h.col === toCol)) {
      highlightedSquares.push({ row: toRow, col: toCol });
    }
    moveState = 'modified';
  } else if (moveState === 'planning') {
    // Continue planning mode
    moveState = 'planning';
  }

  selectedSquare = null;
  renderBoard();
  updateMoveStateUI();
}

function resetBoard() {
  // Revert to last shared board state
  if (currentGame && currentGame.lastSharedBoardState) {
    boardState = cloneBoard(currentGame.lastSharedBoardState);
  } else {
    // No shares yet, revert to initial position
    boardState = cloneBoard(initialBoardState);
  }

  // Determine what to reset to based on current state
  if (moveState === 'planning') {
    // Planning mode - return to waiting state with player's highlights
    if (currentGame && currentGame.lastPlayerHighlights) {
      highlightedSquares = [...currentGame.lastPlayerHighlights];
    } else {
      highlightedSquares = [];
    }
    moveState = 'waiting';
  } else {
    // Modified state - return to idle state with opponent's highlights
    if (currentGame && currentGame.lastOpponentHighlights) {
      highlightedSquares = [...currentGame.lastOpponentHighlights];
    } else {
      highlightedSquares = [];
    }
    moveState = 'idle';
  }

  selectedSquare = null;
  renderBoard();
  updateMoveStateUI();
}

// --- Game Loading ---

async function continueGameLoad() {
  // Initialize opponentHasResponded if it doesn't exist (for old games)
  if (currentGame.opponentHasResponded === undefined) {
    currentGame.opponentHasResponded = currentGame.sharedMoveCount > 0;
  }

  // Set player color from game data
  playerColor = currentGame.playerColor || 'white';
  boardFlipped = playerColor === 'black';

  // Rebuild board from move history or use saved board state
  if (currentGame.boardState) {
    // Use saved board state
    boardState = cloneBoard(currentGame.boardState);
  } else if (currentGame.moveHistory && currentGame.moveHistory.length > 0) {
    // Fallback: rebuild from move history (old games)
    boardState = replayMoves(currentGame.moveHistory);
  } else {
    // New game: start at initial position
    boardState = cloneBoard(initialBoardState);
  }

  // Initialize lastSharedBoardState if it doesn't exist
  if (!currentGame.lastSharedBoardState) {
    currentGame.lastSharedBoardState = cloneBoard(boardState);
  }

  // Determine initial move state based on game state
  // If we have a lastShareUrl, we're waiting for opponent to respond
  // Otherwise, we're idle (opponent's turn or awaiting our first move)
  const isWaiting = !!currentGame.lastShareUrl;

  // Load highlights based on state
  if (isWaiting && currentGame.lastPlayerHighlights) {
    // Waiting for opponent - show player's highlights (what we moved last)
    highlightedSquares = [...currentGame.lastPlayerHighlights];
  } else if (currentGame.lastOpponentHighlights) {
    // Opponent's turn - show opponent's highlights (what they moved last)
    highlightedSquares = [...currentGame.lastOpponentHighlights];
  } else {
    highlightedSquares = [];
  }

  // Set opponent name
  const theirName = currentGame.opponentName || 'Opponent';
  opponentName.textContent = theirName;

  if (currentGame.currentTaunt) {
    playerTaunt.textContent = currentGame.currentTaunt;
  } else {
    playerTaunt.style.display = 'none';
  }

  // Restore last share URL if present
  if (currentGame.lastShareUrl) {
    lastShareUrl = currentGame.lastShareUrl;
  }

  // Set move state (already determined above when loading highlights)
  moveState = isWaiting ? 'waiting' : 'idle';

  renderBoard();
  updateMoveStateUI();
}

async function loadGame() {
  const urlInfo = parseUrlParams();

  if (!urlInfo) {
    alert('No game ID provided');
    window.location.href = '/chessle';
    return;
  }

  // Handle shared URL — process and redirect to local URL
  if (urlInfo.type === 'shared') {
    await receiveSharedMove(urlInfo);
    return; // receiveSharedMove will redirect
  }

  // Local URL — load from DB
  const gameId = urlInfo.gameId;

  try {
    currentGame = await getGame(gameId);

    if (!currentGame) {
      alert('Game not found');
      window.location.href = '/chessle';
      return;
    }

    // Check if player needs to enter their name (received game)
    if (!currentGame.playerName) {
      // Show name entry modal
      opponentNameDisplay.textContent = currentGame.opponentName || 'Opponent';
      enterNameModal.style.display = 'flex';
      setTimeout(() => enterNameInput.focus(), 100);
      return; // Will continue after name is entered
    }

    // Player name exists, continue loading
    await continueGameLoad();

  } catch (error) {
    console.error('Failed to load game:', error);
    alert('Failed to load game');
    window.location.href = '/chessle';
  }
}

// --- Event Listeners ---

resetBtn.addEventListener('click', resetBoard);
shareBtn.addEventListener('click', openShareModal);
sendMoveBtn.addEventListener('click', sendMoveAction);
copyLinkBtn.addEventListener('click', copyLinkAction);
resendBtn.addEventListener('click', () => {
  if (!lastShareUrl) return;
  shareTauntInput.value = currentGame.currentTaunt || '';
  shareTauntInput.placeholder = 'Add an optional message...';
  shareModal.dataset.resend = 'true';
  shareModal.style.display = 'flex';
});

shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) {
    shareModal.style.display = 'none';
  }
});

// Enter name for received game
saveEnterNameBtn.addEventListener('click', async () => {
  const playerName = enterNameInput.value.trim();

  if (!playerName) {
    alert('Please enter your name to continue.');
    enterNameInput.focus();
    return;
  }

  try {
    currentGame.playerName = playerName;
    currentGame.updatedAt = new Date().toISOString();
    await updateGame(currentGame);

    enterNameModal.style.display = 'none';

    // Continue loading the game
    await continueGameLoad();
  } catch (error) {
    console.error('Failed to save player name:', error);
    alert('Failed to save name. Please try again.');
  }
});

// Captured pieces modal
capturedPiecesBtn.addEventListener('click', () => {
  renderCapturedPieces();
  capturedPiecesModal.style.display = 'flex';
});

closeCapturedBtn.addEventListener('click', () => {
  capturedPiecesModal.style.display = 'none';
  selectedCapturedPiece = null;
});

capturedPiecesModal.addEventListener('click', (e) => {
  if (e.target === capturedPiecesModal) {
    capturedPiecesModal.style.display = 'none';
    selectedCapturedPiece = null;
  }
});

function renderCapturedPieces() {
  const captured = getCapturedPieces();

  // Render white pieces
  capturedWhiteList.innerHTML = '';
  if (captured.white.length === 0) {
    capturedWhiteList.innerHTML = '<p class="no-pieces">No captured pieces</p>';
  } else {
    captured.white.forEach((piece, index) => {
      const pieceBtn = document.createElement('button');
      pieceBtn.className = 'captured-piece-btn white';
      pieceBtn.textContent = PIECES[piece.type];
      pieceBtn.title = `Place ${piece.type} back on board`;
      pieceBtn.addEventListener('click', () => {
        selectedCapturedPiece = piece;
        capturedPiecesModal.style.display = 'none';
        showToast('Click an empty square to place the piece');
      });
      capturedWhiteList.appendChild(pieceBtn);
    });
  }

  // Render black pieces
  capturedBlackList.innerHTML = '';
  if (captured.black.length === 0) {
    capturedBlackList.innerHTML = '<p class="no-pieces">No captured pieces</p>';
  } else {
    captured.black.forEach((piece, index) => {
      const pieceBtn = document.createElement('button');
      pieceBtn.className = 'captured-piece-btn black';
      pieceBtn.textContent = PIECES[piece.type];
      pieceBtn.title = `Place ${piece.type} back on board`;
      pieceBtn.addEventListener('click', () => {
        selectedCapturedPiece = piece;
        capturedPiecesModal.style.display = 'none';
        showToast('Click an empty square to place the piece');
      });
      capturedBlackList.appendChild(pieceBtn);
    });
  }
}


// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  await loadGame();
  // Note: renderBoard() is called by continueGameLoad() when ready
  // Don't call it here as it may render before game is fully loaded
});

// Chessle - Game page logic

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .then(() => console.log('Service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

// DOM Elements
const gameTitle = document.getElementById('game-title');
const opponentSection = document.getElementById('opponent-section');
const opponentName = document.getElementById('opponent-name');
const opponentStatus = document.getElementById('opponent-status');
const chessBoard = document.getElementById('chess-board');
const playerSection = document.getElementById('player-section');
const playerInfoArea = document.getElementById('player-info-area');
const playerNameDisplay = document.getElementById('player-name');
const playerTaunt = document.getElementById('player-taunt');
const playerActions = document.getElementById('player-actions');
const resetBtn = document.getElementById('reset-btn');
const shareBtn = document.getElementById('share-btn');
const gameMenuBtn = document.getElementById('game-menu-btn');
const gameMenuDropdown = document.getElementById('game-menu-dropdown');
const renameGameMenuBtn = document.getElementById('rename-game-menu-btn');
const deleteGameMenuBtn = document.getElementById('delete-game-menu-btn');
const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const saveRenameBtn = document.getElementById('save-rename-btn');
const cancelRenameBtn = document.getElementById('cancel-rename-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteGameTitleSpan = document.getElementById('delete-game-title');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

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

// Chess pieces for random alias generation
const chessPieces = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

function generateRandomAlias(color) {
  const piece = chessPieces[Math.floor(Math.random() * chessPieces.length)];
  const colorName = color === 'white' ? 'White' : 'Black';
  return `${colorName} ${piece}`;
}

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

// Snapshot of board before player starts moving (for reset)
let preMoveBoard = null;

// Selected square
let selectedSquare = null;

// Move state: 'idle' | 'moved' | 'planning'
let moveState = 'idle';

// Track the player's single valid move (from/to)
let playerMove = null;

// Which color this player controls
let playerColor = 'white';

// Whether the board is flipped (black's perspective)
let boardFlipped = false;

// Deep copy a board state
function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
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

  // Shared link has 'g' param
  if (params.has('g')) {
    return {
      type: 'shared',
      gameUUID: params.get('g'),
      turn: parseInt(params.get('t'), 10),
      move: params.get('m'), // "fromRow,fromCol,toRow,toCol" e.g. "6,4,4,4"
      alias: params.get('a'),
      taunt: params.get('ta') || null,
      creatorColor: params.get('c') || null, // 'w' or 'b', only on first share
      title: params.get('ti') || null // only on first share
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

// Parse move string "fromRow,fromCol,toRow,toCol" into object
function parseMove(moveStr) {
  const parts = moveStr.split(',').map(Number);
  return { fromRow: parts[0], fromCol: parts[1], toRow: parts[2], toCol: parts[3] };
}

// Encode move object to string
function encodeMove(move) {
  return `${move.fromRow},${move.fromCol},${move.toRow},${move.toCol}`;
}

// --- Shared URL Handling ---

// Receive a shared move: create or update game from URL params
async function receiveSharedMove(params) {
  let game = await getGame(params.gameUUID);

  if (!game) {
    // New game — create it silently
    const creatorColor = params.creatorColor === 'b' ? 'black' : 'white';
    const myColor = creatorColor === 'white' ? 'black' : 'white';
    const myAlias = generateRandomAlias(myColor);

    const now = new Date().toISOString();
    game = {
      id: params.gameUUID,
      title: params.title || formatDate(now),
      createdAt: now,
      updatedAt: now,
      turnCount: 0,
      playerColor: myColor,
      playerWhiteAlias: creatorColor === 'white' ? params.alias : myAlias,
      playerBlackAlias: creatorColor === 'black' ? params.alias : myAlias,
      currentTaunt: params.taunt || '',
      boardState: null,
      currentTurn: 'white',
      moveHistory: []
    };

    // Apply the received move if present
    if (params.move) {
      const move = parseMove(params.move);
      game.moveHistory.push(move);
      game.turnCount = params.turn;
      game.currentTurn = game.turnCount % 2 === 0 ? 'white' : 'black';
    }

    if (params.taunt) {
      game.currentTaunt = params.taunt;
    }

    // Rebuild board from move history
    game.boardState = replayMoves(game.moveHistory);

    await saveGame(game);
  } else {
    // Existing game — apply the move
    if (params.move) {
      const move = parseMove(params.move);
      game.moveHistory.push(move);
      game.turnCount = params.turn;
      game.currentTurn = game.turnCount % 2 === 0 ? 'white' : 'black';
    }

    // Update opponent alias if provided
    const opponentColor = game.playerColor === 'white' ? 'black' : 'white';
    if (params.alias) {
      if (opponentColor === 'white') {
        game.playerWhiteAlias = params.alias;
      } else {
        game.playerBlackAlias = params.alias;
      }
    }

    if (params.taunt) {
      game.currentTaunt = params.taunt;
    }

    game.updatedAt = new Date().toISOString();
    game.boardState = replayMoves(game.moveHistory);

    await updateGame(game);
  }

  // Redirect to clean local URL
  window.location.replace(`/chessle/game?id=${params.gameUUID}`);
}

// --- Share Move ---

function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('g', currentGame.id);
  params.set('t', currentGame.turnCount + 1);
  params.set('m', encodeMove(playerMove));

  // Sender's alias
  const myAlias = playerColor === 'white'
    ? currentGame.playerWhiteAlias
    : currentGame.playerBlackAlias;
  params.set('a', myAlias);

  // Taunt (always send current taunt)
  if (currentGame.currentTaunt) {
    params.set('ta', currentGame.currentTaunt);
  }

  // First share — include creator color and title
  if (currentGame.turnCount === 0) {
    params.set('c', currentGame.playerColor === 'white' ? 'w' : 'b');
    params.set('ti', currentGame.title);
  }

  const baseUrl = `${window.location.origin}/chessle/game`;
  return `${baseUrl}?${params.toString()}`;
}

async function shareMoveAction() {
  if (!playerMove) return;

  const shareUrl = buildShareUrl();

  // Persist the move to DB
  currentGame.moveHistory.push(playerMove);
  currentGame.turnCount += 1;
  currentGame.currentTurn = currentGame.turnCount % 2 === 0 ? 'white' : 'black';
  currentGame.boardState = cloneBoard(boardState);
  currentGame.updatedAt = new Date().toISOString();
  await updateGame(currentGame);

  // Reset move state
  preMoveBoard = null;
  playerMove = null;
  moveState = 'idle';
  updateMoveStateUI();

  // Share or copy
  if (navigator.share) {
    try {
      await navigator.share({ url: shareUrl });
    } catch (err) {
      // User cancelled share — fall back to clipboard
      if (err.name !== 'AbortError') {
        await copyToClipboard(shareUrl);
      }
    }
  } else {
    await copyToClipboard(shareUrl);
  }
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
  if (moveState === 'idle') {
    playerInfoArea.style.display = '';
    playerActions.style.display = 'none';
    shareBtn.style.display = '';

    opponentSection.classList.remove('planning');
    chessBoard.classList.remove('planning-mode');
    if (currentGame) {
      const isPlayerTurn = currentGame.currentTurn === playerColor;
      if (isPlayerTurn) {
        opponentStatus.textContent = currentGame.currentTaunt || '';
      } else {
        opponentStatus.textContent = "Awaiting opponent's turn";
      }
    }
  } else if (moveState === 'moved') {
    playerInfoArea.style.display = 'none';
    playerActions.style.display = '';
    shareBtn.style.display = '';

    opponentSection.classList.remove('planning');
    chessBoard.classList.remove('planning-mode');
    if (currentGame) {
      opponentStatus.textContent = currentGame.currentTaunt || '';
    }
  } else if (moveState === 'planning') {
    playerInfoArea.style.display = 'none';
    playerActions.style.display = '';
    shareBtn.style.display = 'none';

    opponentSection.classList.add('planning');
    chessBoard.classList.add('planning-mode');
    opponentStatus.textContent = 'Planning Mode';
  }
}

// --- Board Rendering ---

function renderBoard() {
  chessBoard.innerHTML = '';

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

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
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

  if (!selectedSquare) {
    if (clickedPiece) {
      selectedSquare = { row, col };
      renderBoard();
    }
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
  // Snapshot the board before the first move
  if (moveState === 'idle') {
    preMoveBoard = cloneBoard(boardState);
  }

  if (moveState === 'idle') {
    if (piece.color === playerColor) {
      // First move of player's own piece — valid move
      applyMoveToBoard(boardState, fromRow, fromCol, toRow, toCol);
      playerMove = { fromRow, fromCol, toRow, toCol };
      moveState = 'moved';
    } else {
      // Moving opponent's piece immediately — planning mode
      applyMoveToBoard(boardState, fromRow, fromCol, toRow, toCol);
      playerMove = null;
      moveState = 'planning';
    }
  } else if (moveState === 'moved') {
    // Second move of any kind — enter planning mode
    applyMoveToBoard(boardState, fromRow, fromCol, toRow, toCol);
    playerMove = null;
    moveState = 'planning';
  } else {
    // Already in planning mode — free movement
    applyMoveToBoard(boardState, fromRow, fromCol, toRow, toCol);
  }

  selectedSquare = null;
  renderBoard();
  updateMoveStateUI();
}

function resetBoard() {
  if (preMoveBoard) {
    boardState = cloneBoard(preMoveBoard);
    preMoveBoard = null;
  }
  selectedSquare = null;
  playerMove = null;
  moveState = 'idle';
  renderBoard();
  updateMoveStateUI();
}

// --- Game Loading ---

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

    // Set player color from game data
    playerColor = currentGame.playerColor || 'white';
    boardFlipped = playerColor === 'black';

    // Rebuild board from move history
    if (currentGame.moveHistory && currentGame.moveHistory.length > 0) {
      boardState = replayMoves(currentGame.moveHistory);
    } else {
      boardState = cloneBoard(initialBoardState);
    }

    // Update header
    gameTitle.textContent = currentGame.title;

    // Set player/opponent names based on color
    const myAlias = playerColor === 'white'
      ? currentGame.playerWhiteAlias
      : currentGame.playerBlackAlias;
    const opponentAlias = playerColor === 'white'
      ? currentGame.playerBlackAlias
      : currentGame.playerWhiteAlias;

    opponentName.textContent = opponentAlias;
    playerNameDisplay.textContent = myAlias;

    if (currentGame.currentTaunt) {
      playerTaunt.textContent = currentGame.currentTaunt;
    } else {
      playerTaunt.style.display = 'none';
    }

    updateMoveStateUI();

  } catch (error) {
    console.error('Failed to load game:', error);
    alert('Failed to load game');
    window.location.href = '/chessle';
  }
}

// --- Event Listeners ---

resetBtn.addEventListener('click', resetBoard);
shareBtn.addEventListener('click', shareMoveAction);

// Toggle game menu dropdown
gameMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = gameMenuDropdown.style.display === 'block';
  gameMenuDropdown.style.display = isVisible ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  gameMenuDropdown.style.display = 'none';
});

// Rename game
renameGameMenuBtn.addEventListener('click', () => {
  gameMenuDropdown.style.display = 'none';
  renameInput.value = currentGame.title;
  renameModal.style.display = 'flex';
});

saveRenameBtn.addEventListener('click', async () => {
  const newTitle = renameInput.value.trim();

  if (!newTitle) {
    alert('Please enter a title');
    return;
  }

  try {
    currentGame.title = newTitle;
    currentGame.updatedAt = new Date().toISOString();
    await updateGame(currentGame);

    gameTitle.textContent = newTitle;
    renameModal.style.display = 'none';
  } catch (error) {
    console.error('Failed to rename game:', error);
    alert('Failed to rename game');
  }
});

cancelRenameBtn.addEventListener('click', () => {
  renameModal.style.display = 'none';
});

// Delete game
deleteGameMenuBtn.addEventListener('click', () => {
  gameMenuDropdown.style.display = 'none';
  deleteGameTitleSpan.textContent = currentGame.title;
  deleteModal.style.display = 'flex';
});

confirmDeleteBtn.addEventListener('click', async () => {
  try {
    await deleteGame(currentGame.id);
    window.location.href = '/chessle';
  } catch (error) {
    console.error('Failed to delete game:', error);
    alert('Failed to delete game');
  }
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.style.display = 'none';
});

// Close modals on backdrop click
renameModal.addEventListener('click', (e) => {
  if (e.target === renameModal) {
    renameModal.style.display = 'none';
  }
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.style.display = 'none';
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  await loadGame();
  renderBoard();
});

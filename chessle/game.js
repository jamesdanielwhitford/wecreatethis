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
let gameId = null;

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
let boardState = JSON.parse(JSON.stringify(initialBoardState));

// Snapshot of board before player starts moving (for reset)
let preMoveBoard = null;

// Selected square
let selectedSquare = null;

// Move state: 'idle' | 'moved' | 'planning'
let moveState = 'idle';

// Track the player's single valid move (from/to)
let playerMove = null;

// Which color this player controls (default white for now, will come from game data later)
let playerColor = 'white';

// Deep copy a board state
function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
}

// Get game ID from URL
function getGameIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('id'), 10);
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

// Update the UI to reflect current move state
function updateMoveStateUI() {
  if (moveState === 'idle') {
    // Show player info, hide actions
    playerInfoArea.style.display = '';
    playerActions.style.display = 'none';
    shareBtn.style.display = '';

    // Opponent section shows their taunt or awaiting status
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
    // Hide player info, show both buttons
    playerInfoArea.style.display = 'none';
    playerActions.style.display = '';
    shareBtn.style.display = '';

    // Normal board, normal opponent section
    opponentSection.classList.remove('planning');
    chessBoard.classList.remove('planning-mode');
    if (currentGame) {
      opponentStatus.textContent = currentGame.currentTaunt || '';
    }
  } else if (moveState === 'planning') {
    // Hide player info, show only reset
    playerInfoArea.style.display = 'none';
    playerActions.style.display = '';
    shareBtn.style.display = 'none';

    // Red board, planning mode text
    opponentSection.classList.add('planning');
    chessBoard.classList.add('planning-mode');
    opponentStatus.textContent = 'Planning Mode';
  }
}

// Render the chess board
function renderBoard() {
  chessBoard.innerHTML = '';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'chess-square';

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

// Handle square click
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

// Perform a move and update state
function performMove(fromRow, fromCol, toRow, toCol, piece) {
  // Snapshot the board before the first move
  if (moveState === 'idle') {
    preMoveBoard = cloneBoard(boardState);
  }

  // Determine if this is a valid player move or triggers planning
  if (moveState === 'idle') {
    if (piece.color === playerColor) {
      // First move of player's own piece — valid move
      boardState[toRow][toCol] = boardState[fromRow][fromCol];
      boardState[fromRow][fromCol] = null;
      playerMove = { fromRow, fromCol, toRow, toCol };
      moveState = 'moved';
    } else {
      // Moving opponent's piece immediately — planning mode
      boardState[toRow][toCol] = boardState[fromRow][fromCol];
      boardState[fromRow][fromCol] = null;
      playerMove = null;
      moveState = 'planning';
    }
  } else if (moveState === 'moved') {
    // Second move of any kind — enter planning mode
    boardState[toRow][toCol] = boardState[fromRow][fromCol];
    boardState[fromRow][fromCol] = null;
    playerMove = null;
    moveState = 'planning';
  } else {
    // Already in planning mode — free movement
    boardState[toRow][toCol] = boardState[fromRow][fromCol];
    boardState[fromRow][fromCol] = null;
  }

  selectedSquare = null;
  renderBoard();
  updateMoveStateUI();
}

// Reset board to pre-move state
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

// Share move (placeholder for now — will generate URL later)
function shareMoveAction() {
  // TODO: encode board state into URL and share
  alert('Share functionality coming soon!');
}

// Load game data
async function loadGame() {
  gameId = getGameIdFromUrl();

  if (!gameId) {
    alert('No game ID provided');
    window.location.href = '/chessle';
    return;
  }

  try {
    currentGame = await getGame(gameId);

    if (!currentGame) {
      alert('Game not found');
      window.location.href = '/chessle';
      return;
    }

    // Update header
    gameTitle.textContent = currentGame.title;

    // For now, player is always white and opponent is always black
    playerColor = 'white';
    const opponentAlias = currentGame.playerBlackAlias;
    const playerAlias = currentGame.playerWhiteAlias;

    // Opponent section
    opponentName.textContent = opponentAlias;

    // Player section
    playerNameDisplay.textContent = playerAlias;
    if (currentGame.currentTaunt) {
      playerTaunt.textContent = currentGame.currentTaunt;
    } else {
      playerTaunt.style.display = 'none';
    }

    // Set initial move state UI
    updateMoveStateUI();

  } catch (error) {
    console.error('Failed to load game:', error);
    alert('Failed to load game');
    window.location.href = '/chessle';
  }
}

// Button handlers
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
    await deleteGame(gameId);
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

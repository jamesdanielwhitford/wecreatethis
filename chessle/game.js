// Chessle - Game page logic

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .then(() => console.log('Service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

// DOM Elements
const gameTitle = document.getElementById('game-title');
const whitePlayer = document.getElementById('white-player');
const blackPlayer = document.getElementById('black-player');
const tauntBox = document.getElementById('taunt-box');
const tauntText = document.getElementById('taunt-text');
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
const chessBoard = document.getElementById('chess-board');

// Current game data
let currentGame = null;
let gameId = null;

// Chess piece Unicode symbols (using outlined versions for both colors)
const PIECES = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟'
};

// Initial board state (8x8 array, row 0 = rank 8, row 7 = rank 1)
// Using standard chess notation: each piece is { color, type }
const initialBoardState = [
  // Rank 8 (Black back row)
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
  // Rank 7 (Black pawns)
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
  // Ranks 6-3 (Empty squares)
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  // Rank 2 (White pawns)
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
  // Rank 1 (White back row)
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

// Current board state (will be loaded from game data later)
let boardState = JSON.parse(JSON.stringify(initialBoardState));

// Selected square state
let selectedSquare = null;

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

// Render the chess board
function renderBoard() {
  chessBoard.innerHTML = '';

  // Create all 64 squares (8 rows x 8 columns)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'chess-square';

      // Determine square color (alternating pattern)
      // If (row + col) is even, it's a light square; if odd, it's dark
      const isLight = (row + col) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      // Add data attributes for position
      square.dataset.row = row;
      square.dataset.col = col;

      // Highlight selected square
      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add('selected');
      }

      // Get piece at this position
      const piece = boardState[row][col];

      // If there's a piece, add it
      if (piece) {
        const pieceSpan = document.createElement('span');
        pieceSpan.className = `chess-piece ${piece.color}`;
        pieceSpan.textContent = PIECES[piece.type];
        square.appendChild(pieceSpan);
      }

      // Add click handler
      square.addEventListener('click', () => handleSquareClick(row, col));

      chessBoard.appendChild(square);
    }
  }
}

// Handle square click (select piece or move)
function handleSquareClick(row, col) {
  const clickedPiece = boardState[row][col];

  // If no piece is selected
  if (!selectedSquare) {
    // Only select if there's a piece on this square
    if (clickedPiece) {
      selectedSquare = { row, col };
      renderBoard();
    }
  } else {
    // A piece is already selected
    const selectedPiece = boardState[selectedSquare.row][selectedSquare.col];

    // If clicking the same square, deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
      selectedSquare = null;
      renderBoard();
      return;
    }

    // If clicking another piece of the same color, select that piece instead
    if (clickedPiece && clickedPiece.color === selectedPiece.color) {
      selectedSquare = { row, col };
      renderBoard();
      return;
    }

    // Otherwise, move the piece (no validation yet)
    movePiece(selectedSquare.row, selectedSquare.col, row, col);
  }
}

// Move piece from one square to another
function movePiece(fromRow, fromCol, toRow, toCol) {
  // Move the piece
  boardState[toRow][toCol] = boardState[fromRow][fromCol];
  boardState[fromRow][fromCol] = null;

  // Clear selection
  selectedSquare = null;

  // Re-render board
  renderBoard();
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

    // Update UI
    gameTitle.textContent = currentGame.title;
    whitePlayer.textContent = currentGame.playerWhiteAlias;
    blackPlayer.textContent = currentGame.playerBlackAlias;

    // Show taunt if present
    if (currentGame.currentTaunt) {
      tauntText.textContent = currentGame.currentTaunt;
      tauntBox.style.display = 'block';
    } else {
      tauntBox.style.display = 'none';
    }

  } catch (error) {
    console.error('Failed to load game:', error);
    alert('Failed to load game');
    window.location.href = '/chessle';
  }
}

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

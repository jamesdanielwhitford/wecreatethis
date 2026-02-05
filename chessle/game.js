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

// Current game data
let currentGame = null;
let gameId = null;

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
});

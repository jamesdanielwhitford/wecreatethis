// Chessle - Turn-based chess game
// Main application logic

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chessle/sw.js', { scope: '/chessle/' })
    .then(() => console.log('Service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

// DOM Elements
const gamesList = document.getElementById('games-list');
const newGameFab = document.getElementById('new-game-fab');
const createGameModal = document.getElementById('create-game-modal');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createGameBtn = document.getElementById('create-game-btn');
const colorToggle = document.getElementById('color-toggle');
const playerNameInput = document.getElementById('player-name-input');
const opponentNameInput = document.getElementById('opponent-name-input');
const renameModal = document.getElementById('rename-modal');
const deleteModal = document.getElementById('delete-modal');

// Store games in memory
let games = [];

// Selected color for new game
let selectedColor = 'white';

// Color toggle handling
colorToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-option');
  if (!btn) return;

  selectedColor = btn.dataset.color;
  colorToggle.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

// App initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Chessle initialized');
  await initDB();
  await loadGames();
  renderGamesList();
});

// Load games from database
async function loadGames() {
  try {
    games = await getAllGames();
  } catch (error) {
    console.error('Failed to load games:', error);
    games = [];
  }
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

// Render games list
function renderGamesList() {
  if (games.length === 0) {
    gamesList.innerHTML = '<li class="empty">No games yet. Start a new game!</li>';
    return;
  }

  gamesList.innerHTML = games.map(game => {
    const sharedCount = game.sharedMoveCount || 0;
    const positionInfo = sharedCount === 0
      ? 'New game'
      : sharedCount === 1
        ? '1 position shared'
        : `${sharedCount} positions shared`;
    const dateInfo = formatDate(game.updatedAt);

    return `
      <li class="game-item">
        <a href="/chessle/game?id=${game.id}" class="game-link">
          <span class="game-title">${game.title}</span>
          <span class="game-info">${positionInfo} • ${dateInfo}</span>
        </a>
        <button class="game-menu-btn" data-id="${game.id}">⋮</button>
      </li>
    `;
  }).join('');
}

// New game FAB click
newGameFab.addEventListener('click', () => {
  // Load default player name if saved
  const savedPlayerName = localStorage.getItem('chessle_default_player_name');
  playerNameInput.value = savedPlayerName || '';
  opponentNameInput.value = '';

  // Check the "remember name" checkbox if a name is saved
  const saveNameCheckbox = document.getElementById('save-name-default');
  saveNameCheckbox.checked = !!savedPlayerName;

  // Reset color toggle to white
  selectedColor = 'white';
  colorToggle.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
  colorToggle.querySelector('[data-color="white"]').classList.add('selected');

  createGameModal.style.display = 'flex';
  // Focus the player name input if empty
  if (!playerNameInput.value) {
    setTimeout(() => playerNameInput.focus(), 100);
  }
});

// Cancel game creation
cancelCreateBtn.addEventListener('click', () => {
  createGameModal.style.display = 'none';
});

// Create game button
createGameBtn.addEventListener('click', async () => {
  // Validate player name is not empty
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('Please enter your name to create a game.');
    playerNameInput.focus();
    return;
  }

  const opponentName = opponentNameInput.value.trim() || 'Opponent';

  // Save player name as default if checkbox is checked
  const saveNameCheckbox = document.getElementById('save-name-default');
  if (saveNameCheckbox.checked) {
    localStorage.setItem('chessle_default_player_name', playerName);
  } else {
    localStorage.removeItem('chessle_default_player_name');
  }

  // Generate UUID for game ID
  const gameUUID = generateUUID();

  // Create game object
  const now = new Date().toISOString();
  const game = {
    id: gameUUID,
    title: opponentName, // Use opponent name as title for games list
    playerName: playerName,
    opponentName: opponentName,
    playerColor: selectedColor, // Store chosen color
    createdAt: now,
    updatedAt: now,
    sharedMoveCount: 0,
    currentTaunt: '',
    boardState: null, // Will be set by game.js on load
    moveHistory: [],
    lastSharedBoardState: null,
    opponentHasResponded: false // Track if opponent has made their first move back
  };

  try {
    await saveGame(game);
    console.log('Game created with UUID:', gameUUID);

    // Navigate to game page
    window.location.href = `/chessle/game?id=${gameUUID}`;
  } catch (error) {
    console.error('Failed to create game:', error);
    alert('Failed to create game. Please try again.');
  }

  createGameModal.style.display = 'none';
});

// --- Game list menu (three dots) ---

const renameInput = document.getElementById('rename-input');
const saveRenameBtn = document.getElementById('save-rename-btn');
const cancelRenameBtn = document.getElementById('cancel-rename-btn');
const deleteGameTitleSpan = document.getElementById('delete-game-title');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Track which game the menu is acting on
let menuGameId = null;

// Delegate click on three-dot menu buttons
gamesList.addEventListener('click', (e) => {
  const menuBtn = e.target.closest('.game-menu-btn');
  if (!menuBtn) return;
  e.preventDefault();
  e.stopPropagation();

  menuGameId = menuBtn.dataset.id;
  const game = games.find(g => g.id === menuGameId);
  if (!game) return;

  // Show a simple action sheet: rename or delete
  // Re-use the rename modal with a choice step, or just show both options inline
  // For simplicity, show a small dropdown next to the button
  closeMenuDropdown();

  const dropdown = document.createElement('div');
  dropdown.className = 'game-list-dropdown';
  dropdown.innerHTML = `
    <button class="dropdown-item rename-item">Rename</button>
    <button class="dropdown-item delete-item danger-text">Delete</button>
  `;
  menuBtn.parentElement.appendChild(dropdown);

  dropdown.querySelector('.rename-item').addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeMenuDropdown();
    renameInput.value = game.title;
    renameModal.style.display = 'flex';
  });

  dropdown.querySelector('.delete-item').addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeMenuDropdown();
    deleteGameTitleSpan.textContent = game.title;
    deleteModal.style.display = 'flex';
  });
});

function closeMenuDropdown() {
  document.querySelectorAll('.game-list-dropdown').forEach(d => d.remove());
}

// Close dropdown when clicking anywhere else
document.addEventListener('click', () => {
  closeMenuDropdown();
});

// Rename save
saveRenameBtn.addEventListener('click', async () => {
  const newTitle = renameInput.value.trim();
  if (!newTitle || !menuGameId) return;

  const game = games.find(g => g.id === menuGameId);
  if (!game) return;

  game.title = newTitle;
  game.updatedAt = new Date().toISOString();
  await updateGame(game);
  renderGamesList();
  renameModal.style.display = 'none';
});

cancelRenameBtn.addEventListener('click', () => {
  renameModal.style.display = 'none';
});

// Delete confirm
confirmDeleteBtn.addEventListener('click', async () => {
  if (!menuGameId) return;
  await deleteGame(menuGameId);
  games = games.filter(g => g.id !== menuGameId);
  renderGamesList();
  deleteModal.style.display = 'none';
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.style.display = 'none';
});

// Close modals on backdrop click
createGameModal.addEventListener('click', (e) => {
  if (e.target === createGameModal) {
    createGameModal.style.display = 'none';
  }
});

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

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
const gameTitleInput = document.getElementById('game-title-input');
const playerAliasInput = document.getElementById('player-alias-input');
const tauntInput = document.getElementById('taunt-input');
const colorToggle = document.getElementById('color-toggle');
const renameModal = document.getElementById('rename-modal');
const deleteModal = document.getElementById('delete-modal');

// Store games in memory
let games = [];

// Selected color for new game
let selectedColor = 'white';

// Chess pieces for random alias generation
const chessPieces = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

// Generate random alias based on chosen color
function generateRandomAlias(color) {
  const piece = chessPieces[Math.floor(Math.random() * chessPieces.length)];
  const colorName = color === 'white' ? 'White' : 'Black';
  return `${colorName} ${piece}`;
}

// Color toggle handling
colorToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-option');
  if (!btn) return;

  selectedColor = btn.dataset.color;
  colorToggle.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Update alias placeholder to match chosen color
  playerAliasInput.placeholder = generateRandomAlias(selectedColor);
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
    const turnInfo = game.turnCount === 0 ? 'New game' : `Turn ${game.turnCount}`;
    const dateInfo = formatDate(game.updatedAt);

    return `
      <li class="game-item">
        <a href="/chessle/game?id=${game.id}" class="game-link">
          <span class="game-title">${game.title}</span>
          <span class="game-info">${turnInfo} • ${dateInfo}</span>
        </a>
        <button class="game-menu-btn" data-id="${game.id}">⋮</button>
      </li>
    `;
  }).join('');
}

// New game FAB click
newGameFab.addEventListener('click', () => {
  gameTitleInput.value = '';
  playerAliasInput.value = '';
  tauntInput.value = '';

  // Reset color toggle to white
  selectedColor = 'white';
  colorToggle.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
  colorToggle.querySelector('[data-color="white"]').classList.add('selected');

  // Show the actual defaults as grey placeholder text
  gameTitleInput.placeholder = formatDate(new Date().toISOString());
  playerAliasInput.placeholder = generateRandomAlias(selectedColor);
  tauntInput.placeholder = 'Your move';

  createGameModal.style.display = 'flex';
});

// Cancel game creation
cancelCreateBtn.addEventListener('click', () => {
  createGameModal.style.display = 'none';
});

// Create game button
createGameBtn.addEventListener('click', async () => {
  // Get values or use defaults
  const playerAlias = playerAliasInput.value.trim() || playerAliasInput.placeholder;
  const title = gameTitleInput.value.trim() || gameTitleInput.placeholder;
  const taunt = tauntInput.value.trim() || tauntInput.placeholder;

  // Generate UUID for game ID
  const gameUUID = generateUUID();

  // Create game object
  const now = new Date().toISOString();
  const game = {
    id: gameUUID,
    title: title,
    createdAt: now,
    updatedAt: now,
    turnCount: 0,
    playerColor: selectedColor,
    playerWhiteAlias: selectedColor === 'white' ? playerAlias : 'Waiting for opponent...',
    playerBlackAlias: selectedColor === 'black' ? playerAlias : 'Waiting for opponent...',
    currentTaunt: taunt,
    boardState: null, // Will be set by game.js on load
    currentTurn: 'white',
    moveHistory: []
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

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
const renameModal = document.getElementById('rename-modal');
const deleteModal = document.getElementById('delete-modal');

// Store games in memory
let games = [];

// Chess pieces for random alias generation
const chessPieces = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'];

// Generate random alias
function generateRandomAlias() {
  const piece = chessPieces[Math.floor(Math.random() * chessPieces.length)];
  return `White ${piece}`;
}

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

  // Show the actual defaults as grey placeholder text
  gameTitleInput.placeholder = formatDate(new Date().toISOString());
  playerAliasInput.placeholder = generateRandomAlias();
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

  // Create game object
  const now = new Date().toISOString();
  const game = {
    title: title,
    createdAt: now,
    updatedAt: now,
    turnCount: 0,
    playerWhiteAlias: playerAlias,
    playerBlackAlias: 'Waiting for opponent...',
    currentTaunt: taunt,
    // Game state will be added later
    boardState: 'initial', // Placeholder
    currentTurn: 'white',
    moveHistory: []
  };

  try {
    const gameId = await saveGame(game);
    console.log('Game created with ID:', gameId);

    // Navigate to game page
    window.location.href = `/chessle/game?id=${gameId}`;
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

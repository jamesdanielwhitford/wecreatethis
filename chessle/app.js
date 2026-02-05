// Chessle - Chess puzzle game
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
const gameSelectModal = document.getElementById('game-select-modal');
const cancelGameBtn = document.getElementById('cancel-game-btn');
const renameModal = document.getElementById('rename-modal');
const deleteModal = document.getElementById('delete-modal');

// Mock data for now - will be replaced with real data later
let games = [];

// App initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('Chessle initialized');
  renderGamesList();
});

// Render games list
function renderGamesList() {
  if (games.length === 0) {
    gamesList.innerHTML = '<li class="empty">No games yet. Start a new game!</li>';
    return;
  }

  gamesList.innerHTML = games.map(game => `
    <li class="game-item">
      <a href="/chessle/game?id=${game.id}" class="game-link">
        <span class="game-title">${game.title}</span>
        <span class="game-info">${game.mode} • ${game.date}</span>
      </a>
      <button class="game-menu-btn" data-id="${game.id}">⋮</button>
    </li>
  `).join('');
}

// New game FAB click
newGameFab.addEventListener('click', () => {
  gameSelectModal.style.display = 'flex';
});

// Cancel game selection
cancelGameBtn.addEventListener('click', () => {
  gameSelectModal.style.display = 'none';
});

// Close modal on backdrop click
gameSelectModal.addEventListener('click', (e) => {
  if (e.target === gameSelectModal) {
    gameSelectModal.style.display = 'none';
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

// Game mode selection
document.querySelectorAll('.game-option').forEach(option => {
  option.addEventListener('click', () => {
    const mode = option.dataset.mode;
    console.log('Selected mode:', mode);
    // TODO: Navigate to game with selected mode
    gameSelectModal.style.display = 'none';
  });
});

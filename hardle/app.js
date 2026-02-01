/**
 * App.js - Main application initialization and event handling for Hardle/Randle
 */

// Global game state instance
let game;

/**
 * Initialize the app on page load
 */
function init() {
  // Initialize theme
  UI.initTheme();

  // Determine game mode (hardle vs randle)
  const isRandle = window.location.pathname.includes('randle');

  // Get the answer word
  let answer;
  if (isRandle) {
    // Randle: Try to load existing game, otherwise get random word
    const savedState = localStorage.getItem('randle-game');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      answer = parsed.answer;
    } else {
      answer = getRandomWord();
    }
  } else {
    // Hardle: Get daily word based on current date
    const today = new Date();
    answer = getDailyWord(today);

    // Check if we need to clear old daily cache
    const savedState = localStorage.getItem('hardle-game');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      const savedDate = parsed.date;
      const todayString = today.toISOString().split('T')[0];

      // Clear cache if date has changed
      if (savedDate !== todayString) {
        localStorage.removeItem('hardle-game');
      }
    }
  }

  // Initialize game state
  game = Object.create(GameState);
  game.init(answer, 'hard'); // Default to hard mode

  // Try to load saved state
  const cacheKey = isRandle ? 'randle-game' : 'hardle-game';
  const loaded = game.loadState(cacheKey);

  if (loaded) {
    console.log('Loaded saved game state');
  } else {
    console.log('Starting new game');
  }

  // For testing: log the answer in Randle mode
  if (isRandle) {
    console.log('🎯 RANDLE ANSWER:', answer);
  }

  // Initial render
  UI.renderBoard(game);
  UI.renderKeyboard(game);
  UI.updateModeIcon(game.isHardMode);

  // Set up event listeners
  setupEventListeners();

  // Show end game modal if game is already over
  if (game.gameOver) {
    setTimeout(() => {
      UI.showEndGameModal(game.won, game.guesses.length, game.answer);
    }, 500);
  }

  // Set up viewport height handler for mobile Safari keyboard
  setupViewportHandler();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Physical keyboard input
  document.addEventListener('keydown', handleKeyboardInput);

  // On-screen keyboard clicks
  document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', handleKeyClick);
  });

  // Tile clicks (for marking in Hard mode)
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('click', handleTileClick);
  });

  // Mode toggle button
  const modeToggle = document.getElementById('mode-toggle-btn');
  if (modeToggle) {
    modeToggle.addEventListener('click', handleModeToggle);
  }

  // Rules button
  const rulesBtn = document.getElementById('rules-btn');
  if (rulesBtn) {
    rulesBtn.addEventListener('click', () => UI.showModal('rules-modal'));
  }

  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => UI.showModal('settings-modal'));
  }

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        UI.hideModal(modal.id);
      }
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        UI.hideModal(modal.id);
      }
    });
  });

  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      UI.toggleDarkMode();
    });
  }

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      UI.shareResults(game);
    });
  }

  // Play Again button (Randle only)
  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', handlePlayAgain);
  }
}

/**
 * Handle physical keyboard input
 */
function handleKeyboardInput(e) {
  // Don't handle if modal is open or game is over
  if (document.querySelector('.modal.active') || game.gameOver) {
    return;
  }

  const key = e.key.toUpperCase();

  if (key === 'ENTER') {
    handleSubmit();
  } else if (key === 'BACKSPACE') {
    handleBackspace();
  } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
    handleLetter(key);
  }
}

/**
 * Handle on-screen keyboard click
 */
function handleKeyClick(e) {
  if (game.gameOver) return;

  const key = e.target.dataset.key;

  if (key === 'ENTER') {
    handleSubmit();
  } else if (key === 'BACK') {
    handleBackspace();
  } else {
    handleLetter(key);
  }
}

/**
 * Handle letter input
 */
function handleLetter(letter) {
  game.addLetter(letter);
  UI.updateCurrentGuess(game);
}

/**
 * Handle backspace
 */
function handleBackspace() {
  game.removeLetter();
  UI.updateCurrentGuess(game);
}

/**
 * Handle guess submission
 */
function handleSubmit() {
  const result = game.submitGuess();

  if (!result.success) {
    // Show error notification
    UI.showNotification(result.message);
    UI.shakeRow(game.currentRow);
    return;
  }

  // Update UI
  UI.renderRow(game, game.currentRow - 1); // Render the submitted row
  UI.renderKeyboard(game);

  // Save state
  const cacheKey = window.location.pathname.includes('randle') ? 'randle-game' : 'hardle-game';
  game.saveState(cacheKey);

  // Check if game is over
  if (game.gameOver) {
    setTimeout(() => {
      UI.showEndGameModal(game.won, game.guesses.length, game.answer);
    }, 500);
  }
}

/**
 * Handle tile click (for marking in Hard mode)
 */
function handleTileClick(e) {
  if (game.gameOver || !game.isHardMode) return;

  const row = parseInt(e.target.dataset.row);
  const col = parseInt(e.target.dataset.col);

  // Only allow marking on submitted guess rows with partial scores
  if (row >= game.currentRow) return;

  const guessObj = game.guesses[row];
  if (!guessObj) return;

  const guess = guessObj.word;
  const score = guessObj.score;

  // Don't allow marking on score 0 or winning rows
  if (score === 0 || guess === game.answer) return;

  // Toggle the mark
  game.toggleTileMark(row, col);

  // Update UI
  UI.renderTile(game, row, col);
  UI.renderKeyboard(game);

  // Save state
  const cacheKey = window.location.pathname.includes('randle') ? 'randle-game' : 'hardle-game';
  game.saveState(cacheKey);
}

/**
 * Handle mode toggle (Hard ↔ Easy)
 */
function handleModeToggle() {
  // Don't allow switching mid-game if there are guesses
  if (game.guesses.length > 0 && !game.gameOver) {
    const confirm = window.confirm(
      'Switching modes will reset your current game. Continue?'
    );
    if (!confirm) return;
  }

  game.toggleMode();

  // Update UI
  UI.renderBoard(game);
  UI.renderKeyboard(game);
  UI.updateModeIcon(game.isHardMode);

  // Save state
  const cacheKey = window.location.pathname.includes('randle') ? 'randle-game' : 'hardle-game';
  game.saveState(cacheKey);
}

/**
 * Handle Play Again (Randle only)
 */
function handlePlayAgain() {
  // Clear saved state
  localStorage.removeItem('randle-game');

  // Get new random word
  const newAnswer = getRandomWord();

  // Reset game
  game.init(newAnswer, game.isHardMode);

  // Update UI
  UI.hideAllModals();
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Save new state
  game.saveState('randle-game');
}

/**
 * Handle viewport changes for mobile Safari URL bar
 * Uses window.innerHeight (actual visible height) instead of 100vh
 * which includes the space behind the URL bar on Safari
 */
function setupViewportHandler() {
  function handleViewportChange() {
    // Use innerHeight which gives us the ACTUAL visible viewport
    // This changes when Safari's URL bar shows/hides
    const actualHeight = window.innerHeight;

    // Update CSS custom property for actual viewport height
    document.documentElement.style.setProperty('--actual-vh', `${actualHeight * 0.01}px`);
  }

  // Listen for viewport changes (URL bar show/hide, orientation change)
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleViewportChange, 100);
  });

  // Initial calculation
  handleViewportChange();

  // Recalculate after brief delay to catch Safari's initial state
  setTimeout(handleViewportChange, 100);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

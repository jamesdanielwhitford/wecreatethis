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

  // Get preferred mode (separate for Hardle and Randle)
  const modeKey = isRandle ? 'randle-preferred-mode' : 'hardle-preferred-mode';
  const preferredMode = localStorage.getItem(modeKey) || 'hard';

  // Determine cache key
  const cacheKey = isRandle ? 'randle-game' : 'hardle-game';

  // Initialize game state
  game = Object.create(GameState);
  game.init(answer, preferredMode, cacheKey);

  // Try to load saved state
  const loaded = game.loadState(cacheKey);

  if (loaded) {
    console.log('Loaded saved game state');

    // If no guesses yet, apply preferred mode
    // This allows users to change mode preference between sessions
    if (game.guesses.length === 0) {
      game.isHardMode = preferredMode === 'hard';
    }
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
  const keys = document.querySelectorAll('.key');
  keys.forEach(key => {
    key.addEventListener('click', handleKeyClick);
    // Also add touchend for better mobile support
    key.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleKeyClick(e);
    });
  });

  // Tile clicks (for marking in Hard mode)
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('click', handleTileClick);
  });

  // Info button
  const infoBtn = document.getElementById('info-btn');
  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      UI.showModal('info-modal');
      updateModeSelectionUI();
    });
  }

  // Mode selection buttons
  const hardModeBtn = document.getElementById('select-hard-mode');
  const easyModeBtn = document.getElementById('select-easy-mode');

  if (hardModeBtn) {
    hardModeBtn.addEventListener('click', () => handleModeSelection('hard'));
  }
  if (easyModeBtn) {
    easyModeBtn.addEventListener('click', () => handleModeSelection('easy'));
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

  // Get the button element (in case the click was on the emoji text)
  const button = e.target.closest('.key');
  if (!button) return;

  const key = button.dataset.key;

  // Handle both 'Enter'/'ENTER' and 'Backspace'/'BACKSPACE'
  const keyUpper = key.toUpperCase();

  if (keyUpper === 'ENTER') {
    handleSubmit();
  } else if (keyUpper === 'BACKSPACE') {
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
  game.saveState();

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
  game.saveState();
}

/**
 * Handle mode selection from info modal
 */
function handleModeSelection(mode) {
  const isHardMode = mode === 'hard';
  const isRandle = window.location.pathname.includes('randle');

  // If mode is already selected, do nothing
  if (game.isHardMode === isHardMode) {
    updateModeSelectionUI();
    return;
  }

  // Check if game has started
  const hasGuesses = game.guesses.length > 0;

  // Hardle: Don't allow switching mid-game
  if (!isRandle && hasGuesses && !game.gameOver) {
    alert('You cannot change modes during a Hardle game. Finish this game first!');
    updateModeSelectionUI();
    return;
  }

  // Randle: Allow switching but reset the game
  if (isRandle && hasGuesses && !game.gameOver) {
    const confirm = window.confirm(
      'Switching modes will start a new game with a new word. Continue?'
    );
    if (!confirm) {
      updateModeSelectionUI();
      return;
    }

    // Start new Randle game with new mode
    game.newGame(mode);
  } else {
    // No guesses yet or game over - just switch mode
    game.isHardMode = isHardMode;

    // Clear tile marks/dots when switching
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 4; col++) {
        game.tiles[row][col].mark = null;
        game.tiles[row][col].dot = null;
      }
    }

    // If switching to Easy mode, run deduction on existing guesses
    if (!isHardMode && hasGuesses) {
      game.deduceTiles();
      game.updateKeyboardFromDeduction();
    }

    // If switching to Hard mode, clear keyboard colors except solid ones
    if (isHardMode) {
      game.updateKeyboardFromMarks();
    }
  }

  // Save mode preference (separate for Hardle and Randle)
  const modeKey = isRandle ? 'randle-preferred-mode' : 'hardle-preferred-mode';
  localStorage.setItem(modeKey, mode);

  // Update UI
  UI.renderBoard(game);
  UI.renderKeyboard(game);
  updateModeSelectionUI();

  // Save state
  game.saveState();
}

/**
 * Update mode selection buttons in the info modal
 */
function updateModeSelectionUI() {
  const hardBtn = document.getElementById('select-hard-mode');
  const easyBtn = document.getElementById('select-easy-mode');
  const hardRules = document.getElementById('hard-mode-rules');
  const easyRules = document.getElementById('easy-mode-rules');

  if (hardBtn && easyBtn) {
    if (game.isHardMode) {
      hardBtn.classList.add('active');
      easyBtn.classList.remove('active');
    } else {
      hardBtn.classList.remove('active');
      easyBtn.classList.add('active');
    }
  }

  // Show/hide appropriate rules
  if (hardRules && easyRules) {
    if (game.isHardMode) {
      hardRules.style.display = 'block';
      easyRules.style.display = 'none';
    } else {
      hardRules.style.display = 'none';
      easyRules.style.display = 'block';
    }
  }
}

/**
 * Handle Play Again (Randle only)
 */
function handlePlayAgain() {
  // Get new random word and reset game
  const mode = game.isHardMode ? 'hard' : 'easy';
  game.newGame(mode);

  // Update UI
  UI.hideAllModals();
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Save new state
  game.saveState();
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

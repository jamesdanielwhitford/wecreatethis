/**
 * App.js - Main application initialization and event handling for Hardle/Randle
 */

// Global game state instance
let game;
// Make game accessible to UI module
window.game = null;

/**
 * Initialize the app on page load
 */
function init() {
  // Initialize theme
  UI.initTheme();

  // Determine game mode (hardle vs randle vs testle)
  const isRandle = window.location.pathname.includes('randle');
  const isTestle = window.location.pathname.includes('testle');

  // Get the answer word
  let answer;
  if (isTestle) {
    // Testle: Try to load existing game, otherwise get random word
    const savedState = localStorage.getItem('testle-game');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      answer = parsed.answer;
    } else {
      answer = getRandomWord();
    }
  } else if (isRandle) {
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

  // Get preferred mode (separate for Hardle, Randle, and Testle)
  const modeKey = isTestle ? 'testle-preferred-mode' : isRandle ? 'randle-preferred-mode' : 'hardle-preferred-mode';
  const preferredMode = localStorage.getItem(modeKey) || 'hard';

  // Determine cache key
  const cacheKey = isTestle ? 'testle-game' : isRandle ? 'randle-game' : 'hardle-game';

  // Initialize game state
  game = Object.create(GameState);
  game.init(answer, preferredMode, cacheKey, isTestle);

  // Make game accessible globally for UI module
  window.game = game;

  // Try to load saved state
  const loaded = game.loadState(cacheKey);

  if (loaded) {
    console.log('Loaded saved game state');

    // If no guesses yet, apply preferred mode
    // This allows users to change mode preference between sessions
    if (game.guesses.length === 0) {
      game.isHardMode = preferredMode === 'hard';
    }

    // Re-run mode-specific logic to ensure UI is properly restored
    if (game.guesses.length > 0) {
      if (!game.isHardMode) {
        // Easy mode: Re-run deduction to ensure dots are displayed
        // This is important because:
        // 1. Deduction logic may have been updated since last save
        // 2. Saved tiles might not have dots properly set
        // 3. User might have refreshed mid-game
        game.deduceTiles();
        game.updateKeyboardFromDeduction();
      } else {
        // Hard mode: Re-apply keyboard outlines from manual marks
        game.updateKeyboardFromMarks();
      }
    }
  } else {
    console.log('Starting new game');
  }

  // For testing: log the answer in Randle/Testle mode
  if (isRandle) {
    console.log('🎯 RANDLE ANSWER:', answer);
  }
  if (isTestle) {
    console.log('🧪 TESTLE ANSWER:', answer);
  }

  // Initial render
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Set up event listeners
  setupEventListeners();

  // Set up viewport height handler for mobile Safari keyboard
  setupViewportHandler();

  // Determine if we should show info modal
  const visitKey = isTestle ? 'testle-visited' : isRandle ? 'randle-visited' : 'hardle-visited';
  const isFirstVisit = !localStorage.getItem(visitKey);
  const hasInfoHash = window.location.hash === '#info';
  const shouldShowInfoModal = hasInfoHash || isFirstVisit;

  // Check if URL has #info hash and open modal
  if (hasInfoHash) {
    setTimeout(() => {
      UI.showModal('info-modal');
      updateModeSelectionUI();
      updateStartPlayingButton();
      // Remove hash from URL without reloading
      history.replaceState(null, null, window.location.pathname);
    }, 100);
  }

  // Show modal on first visit
  if (isFirstVisit) {
    setTimeout(() => {
      UI.showModal('info-modal');
      updateModeSelectionUI();
      updateStartPlayingButton();
    }, 500);
    localStorage.setItem(visitKey, 'true');
  }

  // Show end game modal if game is already over (but only if info modal isn't being shown)
  if (game.gameOver && !shouldShowInfoModal) {
    setTimeout(() => {
      UI.showEndGameModal(game.won, game.guesses.length, game.answer);
    }, 500);
  }
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
      updateStartPlayingButton();
    });
  }

  // Quick Settings button
  const quickSettingsBtn = document.getElementById('quick-settings-btn');
  if (quickSettingsBtn) {
    quickSettingsBtn.addEventListener('click', () => {
      UI.showModal('quick-settings-modal');
      updateQuickModeSelectionUI();
    });
  }

  // Start Playing button
  const startPlayingBtn = document.getElementById('start-playing-btn');
  if (startPlayingBtn) {
    startPlayingBtn.addEventListener('click', handleStartPlaying);
  }

  // Mode selection buttons (info modal)
  const hardModeBtn = document.getElementById('select-hard-mode');
  const easyModeBtn = document.getElementById('select-easy-mode');

  if (hardModeBtn) {
    hardModeBtn.addEventListener('click', () => handleModeSelection('hard'));
  }
  if (easyModeBtn) {
    easyModeBtn.addEventListener('click', () => handleModeSelection('easy'));
  }

  // Mode selection buttons (quick settings modal)
  const quickHardModeBtn = document.getElementById('quick-select-hard-mode');
  const quickEasyModeBtn = document.getElementById('quick-select-easy-mode');

  if (quickHardModeBtn) {
    quickHardModeBtn.addEventListener('click', () => {
      handleModeSelection('hard');
      updateQuickModeSelectionUI();
    });
  }
  if (quickEasyModeBtn) {
    quickEasyModeBtn.addEventListener('click', () => {
      handleModeSelection('easy');
      updateQuickModeSelectionUI();
    });
  }

  // Close quick settings button
  document.querySelectorAll('.close-quick-settings').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.hideModal('quick-settings-modal');
    });
  });

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

  // Reset button (Testle only)
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }

  // Set Word button (Testle only)
  const setWordBtn = document.getElementById('set-word-btn');
  if (setWordBtn) {
    setWordBtn.addEventListener('click', handleSetWord);
  }

  // Custom word input - auto uppercase
  const customWordInput = document.getElementById('custom-word-input');
  if (customWordInput) {
    customWordInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
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

  // Update UI - render entire board since Easy mode deduction affects all rows
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Save state
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
  game.saveState();
}

/**
 * Handle mode selection from info modal
 */
function handleModeSelection(mode) {
  const isHardMode = mode === 'hard';
  const isRandle = window.location.pathname.includes('randle');
  const isTestle = window.location.pathname.includes('testle');

  // If mode is already selected, do nothing
  if (game.isHardMode === isHardMode) {
    updateModeSelectionUI();
    return;
  }

  // Check if game has started
  const hasGuesses = game.guesses.length > 0;

  // Hardle: Don't allow switching mid-game
  if (!isRandle && !isTestle && hasGuesses && !game.gameOver) {
    alert('You cannot change modes during a Hardle game. Finish this game first!');
    updateModeSelectionUI();
    return;
  }

  // Randle/Testle: Allow switching but reset the game
  if ((isRandle || isTestle) && hasGuesses && !game.gameOver) {
    const confirm = window.confirm(
      'Switching modes will start a new game with a new word. Continue?'
    );
    if (!confirm) {
      updateModeSelectionUI();
      return;
    }

    // Start new game with new mode
    if (isTestle) {
      const newWord = getRandomWord();
      game.init(newWord, mode, 'testle-game', true);
    } else {
      game.newGame(mode);
    }
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

  // Save mode preference (separate for Hardle, Randle, and Testle)
  const modeKey = isTestle ? 'testle-preferred-mode' : isRandle ? 'randle-preferred-mode' : 'hardle-preferred-mode';
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
  const marksDescription = document.getElementById('marks-description');

  if (hardBtn && easyBtn) {
    if (game.isHardMode) {
      hardBtn.classList.add('active');
      easyBtn.classList.remove('active');
    } else {
      hardBtn.classList.remove('active');
      easyBtn.classList.add('active');
    }
  }

  // Update the marks example description and visuals based on mode
  if (marksDescription) {
    const exampleTiles = marksDescription.closest('.example').querySelectorAll('.example-tile');

    if (game.isHardMode) {
      marksDescription.textContent = 'Tap tiles to mark them with colored borders to track your thinking.';
      // Show marks (borders)
      exampleTiles.forEach(tile => {
        tile.classList.remove('example-red-dot', 'example-green-dot');
      });
      if (exampleTiles[0]) exampleTiles[0].classList.add('example-green-mark');
      if (exampleTiles[1]) exampleTiles[1].classList.add('example-red-mark');
      if (exampleTiles[2]) exampleTiles[2].classList.add('example-green-mark');
      if (exampleTiles[3]) exampleTiles[3].classList.add('example-red-mark');
    } else {
      marksDescription.textContent = 'The game automatically adds colored dots to show which letters are correct or incorrect.';
      // Show dots
      exampleTiles.forEach(tile => {
        tile.classList.remove('example-red-mark', 'example-green-mark');
      });
      if (exampleTiles[0]) exampleTiles[0].classList.add('example-green-dot');
      if (exampleTiles[1]) exampleTiles[1].classList.add('example-red-dot');
      if (exampleTiles[2]) exampleTiles[2].classList.add('example-green-dot');
      if (exampleTiles[3]) exampleTiles[3].classList.add('example-red-dot');
    }
  }
}

/**
 * Update mode selection buttons in the quick settings modal
 */
function updateQuickModeSelectionUI() {
  const hardBtn = document.getElementById('quick-select-hard-mode');
  const easyBtn = document.getElementById('quick-select-easy-mode');

  if (hardBtn && easyBtn) {
    if (game.isHardMode) {
      hardBtn.classList.add('active');
      easyBtn.classList.remove('active');
    } else {
      hardBtn.classList.remove('active');
      easyBtn.classList.add('active');
    }
  }
}

/**
 * Update the Start Playing button based on game state
 */
function updateStartPlayingButton() {
  const startPlayingBtn = document.getElementById('start-playing-btn');
  if (!startPlayingBtn) return;

  const isHardle = !window.location.pathname.includes('randle') && !window.location.pathname.includes('testle');

  // For Hardle: Check if game is completed
  if (isHardle && game.gameOver) {
    startPlayingBtn.textContent = 'Try Randle';
    startPlayingBtn.onclick = () => {
      window.location.href = 'randle.html';
    };
  } else {
    startPlayingBtn.textContent = 'Start Playing!';
    startPlayingBtn.onclick = handleStartPlaying;
  }
}

/**
 * Handle Start Playing button click
 */
function handleStartPlaying() {
  UI.hideModal('info-modal');

  // Show end game modal if game is over
  if (game.gameOver) {
    setTimeout(() => {
      UI.showEndGameModal(game.won, game.guesses.length, game.answer);
    }, 300);
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
 * Handle Reset (Testle only) - Clear all guesses
 */
function handleReset() {
  if (!confirm('Reset all guesses? The target word will remain the same.')) {
    return;
  }

  // Keep the same answer but reset all guesses
  const currentAnswer = game.answer;
  const mode = game.isHardMode ? 'hard' : 'easy';

  // Re-initialize with same answer
  game.init(currentAnswer, mode, 'testle-game', true);

  // Update UI
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Save state
  game.saveState();
}

/**
 * Handle Set Word (Testle only) - Set custom target word
 */
function handleSetWord() {
  const input = document.getElementById('custom-word-input');
  const newWord = input.value.toUpperCase().trim();

  // Validate input
  if (newWord.length !== 4) {
    alert('Please enter exactly 4 letters');
    return;
  }

  if (!/^[A-Z]{4}$/.test(newWord)) {
    alert('Please enter only letters (A-Z)');
    return;
  }

  // Confirm if game has started
  if (game.guesses.length > 0) {
    if (!confirm('Setting a new word will reset the game. Continue?')) {
      return;
    }
  }

  // Initialize new game with custom word
  const mode = game.isHardMode ? 'hard' : 'easy';
  game.init(newWord, mode, 'testle-game', true);

  // Update UI
  UI.hideAllModals();
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Clear input
  input.value = '';

  // Save state
  game.saveState();

  // Show confirmation
  console.log('🧪 TESTLE TARGET SET TO:', newWord);
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

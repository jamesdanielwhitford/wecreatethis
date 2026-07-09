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

  // Hardle always starts on the daily word; Randle (practice mode) is
  // reached in-page via handleSwitchToRandle(), not on initial load.
  const today = new Date();
  const answer = getDailyWord(today);

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

  // Initialize game state
  game = Object.create(GameState);
  game.init(answer, 'hardle', 'hardle-game');

  // Make game accessible globally for UI module
  window.game = game;

  // Try to load saved state
  const loaded = game.loadState('hardle-game');

  if (loaded) {
    console.log('Loaded saved game state');
    game.updateKeyboardFromMarks();
  } else {
    console.log('Starting new game');
  }

  // Initial render
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  // Set up event listeners
  setupEventListeners();

  // Set up viewport height handler for mobile Safari keyboard
  setupViewportHandler();

  // Determine if we should show info modal
  const isFirstVisit = !localStorage.getItem('hardle-visited');
  const hasInfoHash = window.location.hash === '#info';
  const shouldShowInfoModal = hasInfoHash || isFirstVisit;

  // Check if URL has #info hash and open modal
  if (hasInfoHash) {
    setTimeout(() => {
      UI.showModal('info-modal');
      // Remove hash from URL without reloading
      history.replaceState(null, null, window.location.pathname);
    }, 100);
  }

  // Show modal on first visit
  if (isFirstVisit) {
    setTimeout(() => {
      UI.showModal('info-modal');
    }, 500);
    localStorage.setItem('hardle-visited', 'true');
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

  // Tile clicks (manual marking, always available)
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('click', handleTileClick);
  });

  // Score dot clicks (show how-to-play modal)
  document.querySelectorAll('.score-dots').forEach(scoreDots => {
    scoreDots.addEventListener('click', handleScoreBoxClick);
  });

  // Hamburger menu button
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      updateMenuUI();
      showMenuMainList();
      UI.showModal('menu-modal');
    });
  }

  // Menu: How to play
  const menuHowToPlay = document.getElementById('menu-how-to-play');
  if (menuHowToPlay) {
    menuHowToPlay.addEventListener('click', () => {
      UI.hideModal('menu-modal');
      setTimeout(() => UI.showModal('info-modal'), 300);
    });
  }

  // Menu: switch between Hardle <-> Practice Mode
  const menuSwitchVariant = document.getElementById('menu-switch-variant');
  if (menuSwitchVariant) {
    menuSwitchVariant.addEventListener('click', () => {
      UI.hideModal('menu-modal');
      if (game.variant === 'hardle') {
        handleSwitchToRandle();
      } else {
        handleSwitchToHardle();
      }
    });
  }

  // Menu: Send feedback (shows email sub-view within the same modal)
  const menuFeedback = document.getElementById('menu-feedback');
  if (menuFeedback) {
    menuFeedback.addEventListener('click', showMenuFeedbackView);
  }

  // Menu: feedback sub-view back button
  const menuFeedbackBack = document.getElementById('menu-feedback-back');
  if (menuFeedbackBack) {
    menuFeedbackBack.addEventListener('click', showMenuMainList);
  }

  // Menu: copy feedback email to clipboard
  const feedbackCopyBtn = document.getElementById('feedback-copy-btn');
  if (feedbackCopyBtn) {
    feedbackCopyBtn.addEventListener('click', async () => {
      const email = document.getElementById('feedback-email').textContent.trim();
      try {
        await navigator.clipboard.writeText(email);
        UI.showNotification('Email copied to clipboard!');
      } catch (err) {
        UI.showNotification('Unable to copy email');
      }
    });
  }

  // Start Playing / Got it button (how-to-play modal)
  const startPlayingBtn = document.getElementById('start-playing-btn');
  if (startPlayingBtn) {
    startPlayingBtn.addEventListener('click', () => {
      UI.hideModal('info-modal');
    });
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

  // Results screen "next" button: Practice Mode (Hardle) / Play Again (Randle)
  const resultsNextBtn = document.getElementById('results-next-btn');
  if (resultsNextBtn) {
    resultsNextBtn.addEventListener('click', () => {
      UI.hideAllModals();
      if (game.variant === 'hardle') {
        handleSwitchToRandle();
      } else {
        handlePlayAgain();
      }
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

  // Update UI
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
 * Handle tile click (manual marking, always available)
 */
function handleTileClick(e) {
  if (game.gameOver) return;

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
 * Handle score dots click (show how-to-play modal)
 */
function handleScoreBoxClick(e) {
  const row = parseInt(e.currentTarget.dataset.row);

  // Only show modal if there's a score in this row
  if (row >= game.currentRow) return;

  const guessObj = game.guesses[row];
  if (!guessObj) return;

  UI.showModal('info-modal');
}

/**
 * Update the hamburger menu's "switch variant" label based on current mode
 */
function updateMenuUI() {
  const label = document.getElementById('menu-switch-variant-label');
  if (label) {
    label.textContent = game.variant === 'hardle' ? 'Practice Mode' : "Today's Puzzle";
  }
}

/**
 * Show the main menu list, hiding the feedback sub-view
 */
function showMenuMainList() {
  const mainList = document.getElementById('menu-list-main');
  const feedbackList = document.getElementById('menu-list-feedback');
  if (mainList) mainList.style.display = 'flex';
  if (feedbackList) feedbackList.style.display = 'none';
}

/**
 * Show the feedback sub-view within the menu modal
 */
function showMenuFeedbackView() {
  const mainList = document.getElementById('menu-list-main');
  const feedbackList = document.getElementById('menu-list-feedback');
  if (mainList) mainList.style.display = 'none';
  if (feedbackList) feedbackList.style.display = 'flex';
}

/**
 * Switch from Hardle to Randle (practice mode), in-place, no page navigation
 */
function handleSwitchToRandle() {
  game.newGame();

  const navTitle = document.getElementById('nav-title');
  if (navTitle) navTitle.textContent = 'Practice Mode';

  UI.hideAllModals();
  UI.renderBoard(game);
  UI.renderKeyboard(game);
  game.saveState();
}

/**
 * Switch from Randle back to Hardle (today's daily word), in-place
 */
function handleSwitchToHardle() {
  const today = new Date();
  const answer = getDailyWord(today);

  game = Object.create(GameState);
  game.init(answer, 'hardle', 'hardle-game');
  window.game = game;

  const loaded = game.loadState('hardle-game');
  if (loaded) {
    game.updateKeyboardFromMarks();
  }

  const navTitle = document.getElementById('nav-title');
  if (navTitle) navTitle.textContent = 'Hardle';

  UI.hideAllModals();
  UI.renderBoard(game);
  UI.renderKeyboard(game);

  if (game.gameOver) {
    setTimeout(() => {
      UI.showEndGameModal(game.won, game.guesses.length, game.answer);
    }, 300);
  }
}

/**
 * Handle Play Again (Randle only) - fresh random word, same variant
 */
function handlePlayAgain() {
  game.newGame();

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

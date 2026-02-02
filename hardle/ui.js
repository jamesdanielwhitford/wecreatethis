/**
 * UI.js - DOM manipulation and rendering for Hardle/Randle
 * Handles all visual updates to the game board, keyboard, and modals
 */

const UI = {
  /**
   * Render the entire game board (all tiles and scores)
   */
  renderBoard(gameState) {
    for (let row = 0; row < 8; row++) {
      this.renderRow(gameState, row);
    }
  },

  /**
   * Render a specific row of tiles and its score box
   */
  renderRow(gameState, rowIndex) {
    const row = gameState.tiles[rowIndex];
    const guessObj = gameState.guesses[rowIndex];
    const guess = guessObj ? guessObj.word : null;
    const score = guessObj ? guessObj.score : null;

    // Render each tile in the row
    for (let col = 0; col < 4; col++) {
      this.renderTile(gameState, rowIndex, col);
    }

    // Render score box
    this.renderScoreBox(rowIndex, score, guess === gameState.answer);
  },

  /**
   * Render a single tile with letter, marks, dots, and background colors
   */
  renderTile(gameState, row, col) {
    const tile = gameState.tiles[row][col];
    const tileElement = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );

    if (!tileElement) return;

    // Set letter
    tileElement.textContent = tile.letter || '';

    // Reset classes
    tileElement.className = 'tile';

    // Add state classes
    if (tile.letter) {
      tileElement.classList.add('filled');
    }

    // Check if this row is a submitted guess
    const guessObj = gameState.guesses[row];
    if (guessObj) {
      const guess = guessObj.word;
      const score = guessObj.score;

      // Score 0 = all wrong (red background)
      if (score === 0) {
        tileElement.classList.add('wrong');
      }

      // Exact match = winning row (green background)
      if (guess === gameState.answer) {
        tileElement.classList.add('correct');
      }
    }

    // Add marks (Hard mode)
    if (tile.mark) {
      tileElement.classList.add(`mark-${tile.mark}`);
    }

    // Add dots (Easy mode)
    if (tile.dot) {
      tileElement.classList.add(`dot-${tile.dot}`);
    }
  },

  /**
   * Render the score box for a row
   */
  renderScoreBox(rowIndex, score, isWinning) {
    const scoreBox = document.querySelector(`.score-box[data-row="${rowIndex}"]`);
    if (!scoreBox) return;

    // Clear content
    scoreBox.textContent = '';
    scoreBox.className = 'score-box';

    if (score !== null) {
      scoreBox.textContent = score;

      if (isWinning) {
        scoreBox.classList.add('winning');
      } else if (score === 0) {
        scoreBox.classList.add('zero');
      } else {
        scoreBox.classList.add('partial');
      }
    }
  },

  /**
   * Update keyboard key colors based on game state
   */
  renderKeyboard(gameState) {
    const keys = document.querySelectorAll('.key[data-key]');

    keys.forEach(keyElement => {
      const letter = keyElement.dataset.key.toUpperCase();
      const color = gameState.keyboardColors[letter];

      // Reset classes (but preserve key-enter and key-backspace)
      const isEnter = keyElement.classList.contains('key-enter');
      const isBackspace = keyElement.classList.contains('key-backspace');
      keyElement.className = 'key';
      if (isEnter) keyElement.classList.add('key-enter');
      if (isBackspace) keyElement.classList.add('key-backspace');

      // Add letter for data attribute
      keyElement.dataset.key = letter;

      // Add color class if exists (with key- prefix)
      if (color) {
        keyElement.classList.add(`key-${color}`);
      }
    });
  },


  /**
   * Show a modal by ID
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      // Focus first focusable element for accessibility
      const firstButton = modal.querySelector('button');
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  },

  /**
   * Hide a modal by ID
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');

      // If closing info modal and game is over, show end game modal
      if (modalId === 'info-modal' && window.game && window.game.gameOver) {
        setTimeout(() => {
          this.showEndGameModal(window.game.won, window.game.guesses.length, window.game.answer);
        }, 300);
      }
    }
  },

  /**
   * Hide all modals
   */
  hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
  },

  /**
   * Show end game modal with results
   */
  showEndGameModal(won, attempts, answer) {
    const modal = document.getElementById('end-game-modal');
    if (!modal) return;

    const title = document.getElementById('end-game-title');
    const message = document.getElementById('end-game-message');
    const answerWord = document.getElementById('answer-word');
    const playAgainBtn = document.getElementById('play-again-btn');

    if (title) {
      title.textContent = won ? '🎉 You Won!' : '😔 Game Over';
    }

    if (message) {
      if (won) {
        message.textContent = `Congratulations! You guessed the word in ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}!`;
      } else {
        message.textContent = 'Better luck next time!';
      }
    }

    if (answerWord) {
      answerWord.textContent = answer.toUpperCase();
    }

    // Show/hide Play Again button (only for Randle)
    const isRandle = window.location.pathname.includes('randle');
    if (playAgainBtn) {
      playAgainBtn.style.display = isRandle ? 'block' : 'none';
    }

    this.showModal('end-game-modal');
  },

  /**
   * Show a temporary notification message
   */
  showNotification(message, duration = 2000) {
    // Remove existing notification if any
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  /**
   * Update current guess row to show typed letters
   */
  updateCurrentGuess(gameState) {
    const currentRow = gameState.currentRow;
    const guess = gameState.currentGuess;

    for (let col = 0; col < 4; col++) {
      const tile = gameState.tiles[currentRow][col];
      tile.letter = guess[col] || '';
      this.renderTile(gameState, currentRow, col);
    }
  },

  /**
   * Generate shareable emoji grid for results
   */
  generateShareText(gameState) {
    const isRandle = window.location.pathname.includes('randle');
    const gameName = isRandle ? 'Randle' : 'Hardle';
    const attempts = gameState.guesses.length;
    const maxAttempts = 8;

    let text = `${gameName} ${gameState.won ? attempts : 'X'}/${maxAttempts}\n\n`;

    // Generate emoji grid
    gameState.guesses.forEach(guessObj => {
      const guess = guessObj.word;
      const score = guessObj.score;

      if (guess === gameState.answer) {
        text += '🟩🟩🟩🟩 ✅\n';
      } else if (score === 0) {
        text += '🟥🟥🟥🟥 0️⃣\n';
      } else {
        text += '🟨🟨🟨🟨 ' + score + '️⃣\n';
      }
    });

    text += '\nPlay at wecreatethis.com';

    return text;
  },

  /**
   * Share results using Web Share API or clipboard fallback
   */
  async shareResults(gameState) {
    const shareText = this.generateShareText(gameState);

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          title: 'My Hardle/Randle Results'
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      this.showNotification('Results copied to clipboard!');
    } catch (err) {
      this.showNotification('Unable to share results');
    }
  },

  /**
   * Initialize theme on page load (uses system preference)
   */
  initTheme() {
    // Remove any stored theme preference - we use system theme now
    localStorage.removeItem('theme');
    // Remove data-theme attribute to use system preference
    document.documentElement.removeAttribute('data-theme');
  },

  /**
   * Animate a row shake (for invalid word)
   */
  shakeRow(rowIndex) {
    const tiles = document.querySelectorAll(`[data-row="${rowIndex}"]`);
    tiles.forEach(tile => {
      tile.classList.add('shake');
      setTimeout(() => tile.classList.remove('shake'), 500);
    });
  }
};
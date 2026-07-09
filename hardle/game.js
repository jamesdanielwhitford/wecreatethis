// Game state and logic for Hardle/Randle
const GameState = {
  // Core game state
  answer: '',
  currentGuess: '',
  guesses: [],
  currentRow: 0,
  gameOver: false,
  won: false,
  variant: 'hardle', // 'hardle' | 'randle'
  isTestMode: false,

  // Tile states: array of 8 rows, each with 4 tiles
  // Each tile: { letter: '', mark: null }
  // mark: 'correct' | 'incorrect' | null (manual thinking-aid marks, user clicks)
  tiles: [],

  // Keyboard color tracking
  keyboardColors: {}, // { 'A': 'correct' | 'incorrect' | 'outline-correct' | 'outline-incorrect' }

  /**
   * Initialize a new game
   * @param {string} answer - The answer word (uppercase)
   * @param {string} variant - 'hardle' or 'randle'
   * @param {string} cacheKey - The localStorage key for this game
   * @param {boolean} testMode - If true, skip word validation
   */
  init(answer, variant = 'hardle', cacheKey = null, testMode = false) {
    this.answer = answer.toUpperCase();
    this.currentGuess = '';
    this.guesses = [];
    this.currentRow = 0;
    this.gameOver = false;
    this.won = false;
    this.variant = variant;
    this.isTestMode = testMode;
    this.cacheKey = cacheKey; // Store cache key for saving

    // Initialize 8x4 tile grid
    this.tiles = [];
    for (let row = 0; row < 8; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < 4; col++) {
        this.tiles[row][col] = {
          letter: '',
          mark: null
        };
      }
    }

    this.keyboardColors = {};
  },

  /**
   * Add a letter to the current guess
   * @param {string} letter - Letter to add
   */
  addLetter(letter) {
    if (this.gameOver) return false;
    if (this.currentGuess.length >= 4) return false;

    letter = letter.toUpperCase();
    this.currentGuess += letter;

    // Update tile display
    const col = this.currentGuess.length - 1;
    this.tiles[this.currentRow][col].letter = letter;

    this.saveState();
    return true;
  },

  /**
   * Remove last letter from current guess
   */
  removeLetter() {
    if (this.gameOver) return false;
    if (this.currentGuess.length === 0) return false;

    const col = this.currentGuess.length - 1;
    this.tiles[this.currentRow][col].letter = '';
    this.currentGuess = this.currentGuess.slice(0, -1);

    this.saveState();
    return true;
  },

  /**
   * Submit the current guess
   * @returns {object} - { success, message, score, won, lost }
   */
  submitGuess() {
    if (this.gameOver) return { success: false, message: 'Game is over' };
    if (this.currentGuess.length !== 4) return { success: false, message: 'Not enough letters' };

    // Validate word (skip validation in test mode)
    if (!this.isTestMode && !isValidWord(this.currentGuess)) {
      return { success: false, message: 'Not a valid word' };
    }

    // Calculate score
    const score = this.calculateScore(this.currentGuess, this.answer);

    // Add to guesses
    this.guesses.push({
      word: this.currentGuess,
      score: score
    });

    // Check for win
    if (this.currentGuess === this.answer) {
      this.won = true;
      this.gameOver = true;
      this.updateKeyboardForWin();

      // Move to next row (for consistent rendering)
      this.currentRow++;
      this.currentGuess = '';

      this.saveState();
      return { success: true, message: 'You won!', score, won: true, lost: false };
    }

    // Update keyboard colors for score 0 (all wrong)
    if (score === 0) {
      for (const letter of this.currentGuess) {
        this.keyboardColors[letter] = 'incorrect';
      }
    }

    // Move to next row
    this.currentRow++;
    this.currentGuess = '';

    // Check for loss
    if (this.currentRow >= 8) {
      this.gameOver = true;
      this.saveState();
      return { success: true, message: `Game over! Word was ${this.answer}`, score, won: false, lost: true };
    }

    this.saveState();
    return { success: true, message: '', score, won: false, lost: false };
  },

  /**
   * Calculate how many letters in guess appear in answer
   * @param {string} guess - The guess word
   * @param {string} answer - The answer word
   * @returns {number} - Score (0-4)
   */
  calculateScore(guess, answer) {
    const guessLetters = guess.split('');
    const answerLetters = answer.split('');
    let score = 0;

    // Count how many letters in guess exist in answer
    const answerCounts = {};
    for (const letter of answerLetters) {
      answerCounts[letter] = (answerCounts[letter] || 0) + 1;
    }

    for (const letter of guessLetters) {
      if (answerCounts[letter] > 0) {
        score++;
        answerCounts[letter]--;
      }
    }

    return score;
  },

  /**
   * Toggle tile mark (manual thinking-aid, always available)
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  toggleTileMark(row, col) {
    if (row >= this.currentRow) return; // Can only mark submitted guesses
    if (this.guesses[row].score === 0 || this.guesses[row].score === 4) return; // Can't mark all-wrong or exact match

    const tile = this.tiles[row][col];

    // Cycle: null -> incorrect -> correct -> null
    if (tile.mark === null) {
      tile.mark = 'incorrect';
    } else if (tile.mark === 'incorrect') {
      tile.mark = 'correct';
    } else {
      tile.mark = null;
    }

    this.updateKeyboardFromMarks();
    this.saveState();
  },

  /**
   * Update keyboard colors based on manual tile marks
   */
  updateKeyboardFromMarks() {
    // Reset outlines
    for (const key in this.keyboardColors) {
      if (this.keyboardColors[key].startsWith('outline-')) {
        delete this.keyboardColors[key];
      }
    }

    // Pass 1: Apply red (incorrect) marks first
    for (let row = 0; row < this.currentRow; row++) {
      for (let col = 0; col < 4; col++) {
        const tile = this.tiles[row][col];
        const letter = tile.letter;

        if (tile.mark === 'incorrect') {
          // Don't override solid colors
          if (!this.keyboardColors[letter] || this.keyboardColors[letter].startsWith('outline-')) {
            this.keyboardColors[letter] = 'outline-incorrect';
          }
        }
      }
    }

    // Pass 2: Apply green (correct) marks - these override red marks
    // Green always wins because knowing a letter is correct somewhere
    // is more important than knowing it's wrong somewhere else
    for (let row = 0; row < this.currentRow; row++) {
      for (let col = 0; col < 4; col++) {
        const tile = this.tiles[row][col];
        const letter = tile.letter;

        if (tile.mark === 'correct') {
          // Don't override solid colors, but DO override outline-incorrect
          if (!this.keyboardColors[letter] || this.keyboardColors[letter].startsWith('outline-')) {
            this.keyboardColors[letter] = 'outline-correct';
          }
        }
      }
    }
  },

  /**
   * Update keyboard colors for winning guess
   */
  updateKeyboardForWin() {
    for (const letter of this.answer) {
      this.keyboardColors[letter] = 'correct';
    }
  },

  /**
   * Save game state to localStorage
   */
  saveState() {
    if (!this.cacheKey) {
      console.error('saveState requires cacheKey to be set in init()');
      return;
    }

    const state = {
      answer: this.answer,
      currentGuess: this.currentGuess,
      guesses: this.guesses,
      currentRow: this.currentRow,
      gameOver: this.gameOver,
      won: this.won,
      variant: this.variant,
      isTestMode: this.isTestMode,
      tiles: this.tiles,
      keyboardColors: this.keyboardColors
    };

    // Add date for Hardle games (for midnight reset check)
    if (this.cacheKey === 'hardle-game') {
      state.date = new Date().toISOString().split('T')[0];
    }

    localStorage.setItem(this.cacheKey, JSON.stringify(state));
  },

  /**
   * Load game state from localStorage
   */
  loadState(cacheKey) {
    const saved = localStorage.getItem(cacheKey);
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);

      // Verify answer matches
      if (state.answer !== this.answer) return false;

      // Restore state
      this.currentGuess = state.currentGuess || '';
      this.guesses = state.guesses || [];
      this.currentRow = state.currentRow || 0;
      this.gameOver = state.gameOver || false;
      this.won = state.won || false;
      this.variant = state.variant || this.variant;
      this.isTestMode = state.isTestMode !== undefined ? state.isTestMode : false;
      this.tiles = state.tiles || this.tiles;
      this.keyboardColors = state.keyboardColors || {};

      return true;
    } catch (e) {
      console.error('Failed to load state:', e);
      return false;
    }
  },

  /**
   * Get today's date as YYYY-MM-DD string
   */
  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Start a new Randle game (random word, practice mode)
   */
  newGame() {
    // Clear old Randle cache only - never touch the Hardle daily save,
    // even if this game instance was previously in Hardle mode
    localStorage.removeItem('randle-game');

    // Generate new word
    const newAnswer = getRandomWord();
    this.init(newAnswer, 'randle', 'randle-game');
  }
};
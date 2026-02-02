// Game state and logic for Hardle/Randle
const GameState = {
  // Core game state
  answer: '',
  currentGuess: '',
  guesses: [],
  currentRow: 0,
  gameOver: false,
  won: false,
  isHardMode: true,

  // Tile states: array of 8 rows, each with 4 tiles
  // Each tile: { letter: '', mark: null, dot: null }
  // mark: 'correct' | 'incorrect' | null (Hard mode - user clicks)
  // dot: 'correct' | 'incorrect' | null (Easy mode - auto deduced)
  tiles: [],

  // Keyboard color tracking
  keyboardColors: {}, // { 'A': 'correct' | 'incorrect' | 'outline-correct' | 'outline-incorrect' }

  // Easy mode deduction tracking
  knownCorrect: new Map(), // Maps letter → count (for duplicate letters)
  knownIncorrect: new Set(),
  maxFrequency: new Map(),

  /**
   * Initialize a new game
   * @param {string} answer - The answer word (uppercase)
   * @param {string} mode - 'hard' or 'easy'
   * @param {string} cacheKey - The localStorage key for this game
   */
  init(answer, mode = 'hard', cacheKey = null) {
    this.answer = answer.toUpperCase();
    this.currentGuess = '';
    this.guesses = [];
    this.currentRow = 0;
    this.gameOver = false;
    this.won = false;
    this.isHardMode = mode === 'hard';
    this.cacheKey = cacheKey; // Store cache key for saving

    // Initialize 8x4 tile grid
    this.tiles = [];
    for (let row = 0; row < 8; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < 4; col++) {
        this.tiles[row][col] = {
          letter: '',
          mark: null,
          dot: null
        };
      }
    }

    this.keyboardColors = {};
    this.knownCorrect = new Map(); // Maps letter → count
    this.knownIncorrect = new Set();
    this.maxFrequency = new Map();
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

    // Validate word
    if (!isValidWord(this.currentGuess)) {
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
      this.saveState();
      return { success: true, message: 'You won!', score, won: true, lost: false };
    }

    // Update keyboard colors for score 0 (all wrong)
    if (score === 0) {
      for (const letter of this.currentGuess) {
        this.keyboardColors[letter] = 'incorrect';
      }
    }

    // Move to next row BEFORE deduction (so deduction processes the guess we just added)
    this.currentRow++;
    this.currentGuess = '';

    // If in Easy mode, run deduction
    if (!this.isHardMode) {
      this.deduceTiles();
      this.updateKeyboardFromDeduction();
    }

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
   * Toggle tile mark (Hard mode only)
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  toggleTileMark(row, col) {
    if (!this.isHardMode) return;
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
   * Update keyboard colors based on manual tile marks (Hard mode)
   */
  updateKeyboardFromMarks() {
    // Reset outlines
    for (const key in this.keyboardColors) {
      if (this.keyboardColors[key].startsWith('outline-')) {
        delete this.keyboardColors[key];
      }
    }

    // Scan all marked tiles
    for (let row = 0; row < this.currentRow; row++) {
      for (let col = 0; col < 4; col++) {
        const tile = this.tiles[row][col];
        const letter = tile.letter;

        if (tile.mark === 'incorrect') {
          // Don't override solid colors
          if (!this.keyboardColors[letter] || this.keyboardColors[letter].startsWith('outline-')) {
            this.keyboardColors[letter] = 'outline-incorrect';
          }
        } else if (tile.mark === 'correct') {
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
   * Easy mode: Automatically deduce which tiles are correct/incorrect
   */
  deduceTiles() {
    // Iterate through all submitted guesses and deduce
    for (let iteration = 0; iteration < 10; iteration++) {
      let changed = false;

      for (let row = 0; row < this.currentRow; row++) {
        const guess = this.guesses[row];
        const score = guess.score;
        const word = guess.word;

        // Rule 0: Apply known incorrect/correct letters from previous guesses
        for (let col = 0; col < 4; col++) {
          const letter = word[col];

          // Mark as incorrect if we know it's wrong (and not also correct)
          if (this.knownIncorrect.has(letter) && !this.knownCorrect.has(letter) && this.tiles[row][col].dot !== 'incorrect') {
            this.tiles[row][col].dot = 'incorrect';
            changed = true;
          }

          // Mark as correct if we know it's right
          if (this.knownCorrect.has(letter) && this.tiles[row][col].dot !== 'correct') {
            this.tiles[row][col].dot = 'correct';
            changed = true;
          }
        }

        // Rule 1: Score 0 means all letters are incorrect
        if (score === 0) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot !== 'incorrect') {
              this.tiles[row][col].dot = 'incorrect';
              this.knownIncorrect.add(word[col]);
              changed = true;
            }
          }
        }

        // Rule 2: Exact match means all letters are correct
        if (word === this.answer) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot !== 'correct') {
              this.tiles[row][col].dot = 'correct';
              const letter = word[col];
              this.knownCorrect.set(letter, (this.knownCorrect.get(letter) || 0) + 1);
              changed = true;
            }
          }
        }

        // Rule 3: If known correct count equals score, rest are incorrect
        let correctCount = 0;
        for (let col = 0; col < 4; col++) {
          if (this.tiles[row][col].dot === 'correct') {
            correctCount++;
          }
        }

        if (correctCount === score && score < 4) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot === null) {
              this.tiles[row][col].dot = 'incorrect';
              this.knownIncorrect.add(word[col]);
              changed = true;
            }
          }
        }

        // Rule 4: If incorrect count + score = 4, rest are correct
        let incorrectCount = 0;
        for (let col = 0; col < 4; col++) {
          if (this.tiles[row][col].dot === 'incorrect') {
            incorrectCount++;
          }
        }

        if (incorrectCount + score === 4 && score > 0) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot === null) {
              this.tiles[row][col].dot = 'correct';
              const letter = word[col];
              this.knownCorrect.set(letter, (this.knownCorrect.get(letter) || 0) + 1);
              changed = true;
            }
          }
        }

        // Rule 5: Handle duplicate letters - if a letter appears more times than the score allows, mark excess as incorrect
        // Count unmarked tiles by letter
        const unmarkedIndices = [];
        for (let col = 0; col < 4; col++) {
          if (this.tiles[row][col].dot === null) {
            unmarkedIndices.push(col);
          }
        }

        // Count occurrences of each letter in unmarked positions
        const letterCounts = new Map();
        unmarkedIndices.forEach(index => {
          const letter = word[index];
          letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
        });

        // For each letter, if count > (score - correctCount), mark excess as incorrect
        letterCounts.forEach((count, letter) => {
          const maxPossible = score - correctCount;
          if (count > maxPossible) {
            // Update max frequency tracking
            if (!this.maxFrequency.has(letter) || this.maxFrequency.get(letter) > maxPossible) {
              this.maxFrequency.set(letter, maxPossible);
            }

            // Mark excess instances as incorrect (from the end of the word)
            const excess = count - maxPossible;
            let marked = 0;

            for (let i = unmarkedIndices.length - 1; i >= 0 && marked < excess; i--) {
              const col = unmarkedIndices[i];
              if (word[col] === letter) {
                this.tiles[row][col].dot = 'incorrect';
                marked++;
                changed = true;
              }
            }
          }
        });
      }

      if (!changed) break; // No more deductions possible
    }
  },

  /**
   * Update keyboard colors based on Easy mode deductions
   */
  updateKeyboardFromDeduction() {
    // Mark incorrect letters
    for (const letter of this.knownIncorrect) {
      if (!this.knownCorrect.has(letter)) {
        this.keyboardColors[letter] = 'incorrect';
      }
    }

    // Mark correct letters (iterate over Map keys)
    for (const letter of this.knownCorrect.keys()) {
      this.keyboardColors[letter] = 'correct';
    }
  },

  /**
   * Toggle between Hard and Easy mode
   */
  toggleMode() {
    this.isHardMode = !this.isHardMode;

    if (!this.isHardMode) {
      // Switched to Easy mode - run deduction
      this.deduceTiles();
      this.updateKeyboardFromDeduction();
    } else {
      // Switched to Hard mode - clear dots and update from marks
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 4; col++) {
          this.tiles[row][col].dot = null;
        }
      }
      this.knownCorrect.clear();
      this.knownIncorrect.clear();
      this.updateKeyboardFromMarks();
    }

    this.saveState();
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
      isHardMode: this.isHardMode,
      tiles: this.tiles,
      keyboardColors: this.keyboardColors,
      knownCorrect: Array.from(this.knownCorrect.entries()), // Save Map as array of [key, value] pairs
      knownIncorrect: Array.from(this.knownIncorrect)
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
      this.isHardMode = state.isHardMode !== undefined ? state.isHardMode : true;
      this.tiles = state.tiles || this.tiles;
      this.keyboardColors = state.keyboardColors || {};
      this.knownCorrect = new Map(state.knownCorrect || []); // Restore Map from array of [key, value] pairs
      this.knownIncorrect = new Set(state.knownIncorrect || []);

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
   * Start a new game (Randle only)
   */
  /**
   * Start a new Randle game (only for Randle mode)
   * @param {string} mode - 'hard' or 'easy'
   */
  newGame(mode = 'hard') {
    // Clear old cache
    if (this.cacheKey) {
      localStorage.removeItem(this.cacheKey);
    }

    // Generate new word
    const newAnswer = getRandomWord();
    this.init(newAnswer, mode, 'randle-game');
  }
};
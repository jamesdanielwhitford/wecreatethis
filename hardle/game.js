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
  isTestMode: false,

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
   * @param {boolean} testMode - If true, skip word validation
   */
  init(answer, mode = 'hard', cacheKey = null, testMode = false) {
    this.answer = answer.toUpperCase();
    this.currentGuess = '';
    this.guesses = [];
    this.currentRow = 0;
    this.gameOver = false;
    this.won = false;
    this.isHardMode = mode === 'hard';
    this.isTestMode = testMode;
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
   * Uses recursive constraint propagation algorithm
   */
  deduceTiles() {
    // Letter knowledge: track min/max count for each letter in target
    const letterMin = {}; // Minimum times letter appears in target
    const letterMax = {}; // Maximum times letter appears in target

    // Initialize all letters with [0, 4] range
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      letterMin[letter] = 0;
      letterMax[letter] = 4;
    }

    // Clear all dots before re-deducing (fresh start each time)
    for (let row = 0; row < this.currentRow; row++) {
      for (let col = 0; col < 4; col++) {
        this.tiles[row][col].dot = null;
      }
    }

    let changed = true;
    let iterations = 0;
    const maxIterations = 50; // Safety limit

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: Apply letter knowledge to mark tiles
      // ═══════════════════════════════════════════════════════════════
      for (let row = 0; row < this.currentRow; row++) {
        const word = this.guesses[row].word;

        // Rule: If letterMax[L] = 0, any tile with L is incorrect
        for (let col = 0; col < 4; col++) {
          const letter = word[col];
          if (letterMax[letter] === 0 && this.tiles[row][col].dot !== 'incorrect') {
            this.tiles[row][col].dot = 'incorrect';
            changed = true;
          }
        }

        // Rule: Duplicate frequency limit
        // If letter L appears N times but maxCount[L] = M < N, at most M can be correct
        const letterPositions = this.getLetterPositions(word);

        for (const [letter, positions] of Object.entries(letterPositions)) {
          const max = letterMax[letter];
          const correctCount = positions.filter(p => this.tiles[row][p].dot === 'correct').length;
          const unknowns = positions.filter(p => this.tiles[row][p].dot === null);

          // At most (max - correctCount) unknowns can become correct
          const canBecomeCorrect = max - correctCount;

          if (unknowns.length > canBecomeCorrect && canBecomeCorrect >= 0) {
            // Mark excess from the end as incorrect (left-to-right convention)
            let excess = unknowns.length - canBecomeCorrect;
            for (let i = unknowns.length - 1; i >= 0 && excess > 0; i--) {
              this.tiles[row][unknowns[i]].dot = 'incorrect';
              changed = true;
              excess--;
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: Apply score-based rules
      // ═══════════════════════════════════════════════════════════════
      for (let row = 0; row < this.currentRow; row++) {
        const word = this.guesses[row].word;
        const score = this.guesses[row].score;

        // Count current tile states
        let correctCount = 0;
        let incorrectCount = 0;
        for (let col = 0; col < 4; col++) {
          if (this.tiles[row][col].dot === 'correct') correctCount++;
          if (this.tiles[row][col].dot === 'incorrect') incorrectCount++;
        }

        // Rule: Score saturation - if correctCount == score, rest are incorrect
        if (correctCount === score) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot === null) {
              this.tiles[row][col].dot = 'incorrect';
              changed = true;
            }
          }
        }

        // Rule: Elimination completion - if incorrectCount == 4 - score, rest are correct
        if (incorrectCount === 4 - score) {
          for (let col = 0; col < 4; col++) {
            if (this.tiles[row][col].dot === null) {
              this.tiles[row][col].dot = 'correct';
              changed = true;
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: Advanced deduction using contribution bounds
      // ═══════════════════════════════════════════════════════════════
      for (let row = 0; row < this.currentRow; row++) {
        const word = this.guesses[row].word;
        const score = this.guesses[row].score;
        const letterPositions = this.getLetterPositions(word);

        // Calculate min/max contribution for each letter in this guess
        let totalMinContrib = 0;
        let totalMaxContrib = 0;
        const minContrib = {};
        const maxContrib = {};

        for (const [letter, positions] of Object.entries(letterPositions)) {
          const occ = positions.length;
          minContrib[letter] = Math.min(letterMin[letter], occ);
          maxContrib[letter] = Math.min(letterMax[letter], occ);
          totalMinContrib += minContrib[letter];
          totalMaxContrib += maxContrib[letter];
        }

        // If totalMinContrib == score, we know exact contributions
        if (totalMinContrib === score) {
          for (const [letter, positions] of Object.entries(letterPositions)) {
            const contrib = minContrib[letter];
            for (let i = 0; i < positions.length; i++) {
              const col = positions[i];
              if (i < contrib) {
                if (this.tiles[row][col].dot !== 'correct') {
                  this.tiles[row][col].dot = 'correct';
                  changed = true;
                }
              } else {
                if (this.tiles[row][col].dot !== 'incorrect') {
                  this.tiles[row][col].dot = 'incorrect';
                  changed = true;
                }
              }
            }
          }
        }

        // If totalMaxContrib == score, all letters contribute their max
        if (totalMaxContrib === score && totalMaxContrib > 0) {
          for (const [letter, positions] of Object.entries(letterPositions)) {
            const contrib = maxContrib[letter];
            for (let i = 0; i < positions.length; i++) {
              const col = positions[i];
              if (i < contrib) {
                if (this.tiles[row][col].dot !== 'correct') {
                  this.tiles[row][col].dot = 'correct';
                  changed = true;
                }
              } else {
                if (this.tiles[row][col].dot !== 'incorrect') {
                  this.tiles[row][col].dot = 'incorrect';
                  changed = true;
                }
              }
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 4: Learn letter constraints from resolved tiles
      // ═══════════════════════════════════════════════════════════════
      for (let row = 0; row < this.currentRow; row++) {
        const word = this.guesses[row].word;
        const score = this.guesses[row].score;
        const letterPositions = this.getLetterPositions(word);

        // Special case: Score 0 means all unique letters have maxCount = 0
        if (score === 0) {
          for (const letter of new Set(word)) {
            if (letterMax[letter] !== 0) {
              letterMax[letter] = 0;
              changed = true;
            }
          }
          continue;
        }

        // Rule: Duplicate letter constraint from score
        // If a letter appears K times in the guess and K > score,
        // then the answer can have at most 'score' instances of that letter
        // Example: ZOOM with score 1 → O appears 2 times but score is only 1
        //          → if answer had 2+ O's, score would be ≥2, but it's 1
        //          → therefore letterMax[O] ≤ 1
        for (const [letter, positions] of Object.entries(letterPositions)) {
          const K = positions.length;
          if (K > score && letterMax[letter] > score) {
            letterMax[letter] = score;
            changed = true;
          }
        }

        // Special case: Single unique letter (e.g., AAAA, BBBB)
        // The score directly tells us exact count in target
        const uniqueLetters = Object.keys(letterPositions);
        if (uniqueLetters.length === 1) {
          const letter = uniqueLetters[0];
          if (letterMin[letter] < score) {
            letterMin[letter] = score;
            changed = true;
          }
          if (letterMax[letter] > score) {
            letterMax[letter] = score;
            changed = true;
          }
        }

        // Learn from fully resolved letters
        for (const [letter, positions] of Object.entries(letterPositions)) {
          const states = positions.map(p => this.tiles[row][p].dot);
          const allResolved = states.every(s => s === 'correct' || s === 'incorrect');

          if (allResolved) {
            const correctCount = states.filter(s => s === 'correct').length;

            // Update minCount: target has at least this many of the letter
            if (letterMin[letter] < correctCount) {
              letterMin[letter] = correctCount;
              changed = true;
            }

            // Update maxCount: if some tiles are incorrect, target has at most correctCount
            // (the incorrect ones exceeded target frequency)
            if (letterMax[letter] > correctCount) {
              letterMax[letter] = correctCount;
              changed = true;
            }
          }
        }

        // Learn from contribution bounds when some letters have known min/max
        // If we know exactly how much some letters contribute, we can deduce others
        let knownMinContribution = 0;
        let knownMaxContribution = 0;
        let unknownLetters = [];

        for (const [letter, positions] of Object.entries(letterPositions)) {
          const occ = positions.length;
          const minC = Math.min(letterMin[letter], occ);
          const maxC = Math.min(letterMax[letter], occ);

          if (minC === maxC) {
            // We know exact contribution of this letter
            knownMinContribution += minC;
            knownMaxContribution += maxC;
          } else {
            unknownLetters.push({ letter, positions, minC, maxC });
          }
        }

        // If only one letter has unknown contribution, we can solve for it
        if (unknownLetters.length === 1) {
          const { letter, positions, minC, maxC } = unknownLetters[0];
          const requiredContribution = score - knownMinContribution;

          // The unknown letter must contribute exactly requiredContribution
          if (requiredContribution >= minC && requiredContribution <= maxC) {
            if (letterMin[letter] < requiredContribution) {
              letterMin[letter] = requiredContribution;
              changed = true;
            }
            if (letterMax[letter] > requiredContribution) {
              letterMax[letter] = requiredContribution;
              changed = true;
            }
          }
        }
      }
    }

    // Update knownCorrect and knownIncorrect for keyboard coloring
    this.knownCorrect.clear();
    this.knownIncorrect.clear();

    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (letterMin[letter] > 0) {
        this.knownCorrect.set(letter, letterMin[letter]);
      }
      if (letterMax[letter] === 0) {
        this.knownIncorrect.add(letter);
      }
    }
  },

  /**
   * Helper: Get positions of each letter in a word
   * @param {string} word - The word to analyze
   * @returns {Object} - Map of letter -> array of positions
   */
  getLetterPositions(word) {
    const positions = {};
    for (let col = 0; col < word.length; col++) {
      const letter = word[col];
      if (!positions[letter]) positions[letter] = [];
      positions[letter].push(col);
    }
    return positions;
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
      isTestMode: this.isTestMode,
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
      this.isTestMode = state.isTestMode !== undefined ? state.isTestMode : false;
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
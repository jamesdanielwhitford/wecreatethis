import { useState, useEffect, useCallback } from 'react';
import { GameState, TileState, GameColor, GuessState, UseGameStateProps } from '../types/game.types';
import { GAME_VERSION } from '../utils';

interface UseGameStateReturn extends GameState {
  handlePlayAgain: () => void;
  toggleGameMode: () => void;
  submitGuess: (guess: string) => void;
  updateCurrentGuess: (guess: string) => void;
  handleTileMark: (rowIndex: number, colIndex: number) => void;
  setShowEndModal: (show: boolean) => void;
  getCorrectLetterCount: (guess: string, answer: string) => number;
  getLetterColor: (guess: string, correctLetterCount: number) => GameColor;
}

export const useGameState = ({
  gameWord,
  cacheKey,
  validGuesses,
  onNewGame
}: UseGameStateProps): UseGameStateReturn => {
  // State initialization
  const [initialized, setInitialized] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isHardMode, setIsHardMode] = useState(true);
  const [tileStates, setTileStates] = useState<TileState[][]>(
    Array(8).fill(null).map(() => 
      Array(4).fill(null).map(() => ({ color: '' as GameColor, letter: '' }))
    )
  );
  const [guessesRemaining, setGuessesRemaining] = useState(8);
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [finalAttempts, setFinalAttempts] = useState(0);
  const [keyboardColors, setKeyboardColors] = useState<Record<string, GameColor>>({});
  const [showEndModal, setShowEndModal] = useState(false);
  const [knownCorrectLetters, setKnownCorrectLetters] = useState<Map<string, number>>(new Map());
  const [knownIncorrectLetters, setKnownIncorrectLetters] = useState<Set<string>>(new Set());
  const [knownMaxFrequency, setKnownMaxFrequency] = useState<Map<string, number>>(new Map());

  // Utility functions
  const getCorrectLetterCount = useCallback((guess: string, answer: string): number => {
    const guessLetters = guess.split('');
    const answerLetters = Array.from(answer);
    let count = 0;
    const usedIndices = new Set<number>();

    for (let i = 0; i < guessLetters.length; i++) {
      const index = answerLetters.findIndex((letter, idx) => 
        letter === guessLetters[i] && !usedIndices.has(idx)
      );
      if (index !== -1) {
        count++;
        usedIndices.add(index);
      }
    }

    return count;
  }, []);

  const getLetterColor = useCallback((guess: string, correctLetterCount: number): GameColor => {
    if (!guess) return '';
    if (correctLetterCount === 0) return 'red';
    if (guess === gameWord) return 'green';
    // No longer return 'orange' for scores between 1-4
    return '';
  }, [gameWord]);

  // Game actions
  const handlePlayAgain = useCallback(() => {
    if (onNewGame) {
      localStorage.removeItem(cacheKey);
      onNewGame();
      setGameOver(false);
      setGameWon(false);
      setGuessesRemaining(8);
      setGuessHistory([]);
      setKeyboardColors({});
      setTileStates(Array(8).fill(null).map(() => 
        Array(4).fill(null).map(() => ({ color: '' as GameColor, letter: '', mark: undefined, dot: undefined }))
      ));
      setShowEndModal(false);
      setCurrentGuess('');
      setKnownCorrectLetters(new Map());
      setKnownIncorrectLetters(new Set());
      setKnownMaxFrequency(new Map());
    }
  }, [cacheKey, onNewGame]);

  const toggleGameMode = useCallback(() => {
    if (!gameOver && guessHistory.length > 0) {
      if (!confirm('Changing game mode will restart your current game. Continue?')) {
        return;
      }
      handlePlayAgain();
    }
    setIsHardMode(!isHardMode);
  }, [gameOver, guessHistory.length, isHardMode, handlePlayAgain]);

  const handleTileMark = useCallback((rowIndex: number, colIndex: number) => {
    // Remove the check for orange color, instead we'll check if there's a guess at this row
    // and if the correctLetterCount is between 1-4
    if (!isHardMode || !guessHistory[rowIndex]) return;
    
    // We'll check if this is a valid row to mark tiles for
    const guess = guessHistory[rowIndex];
    const correctLetterCount = getCorrectLetterCount(guess, gameWord);
    
    // Only allow marking if this is a partial match (not correct and not all wrong)
    if (correctLetterCount === 0 || guess === gameWord) return;
    
    setTileStates(prev => {
      const newStates = [...prev];
      const currentMark = newStates[rowIndex][colIndex].mark;
      const letter = newStates[rowIndex][colIndex].letter.toUpperCase();
      
      // Set the new mark for the tile
      let newMark: TileMark | undefined;
      if (!currentMark) {
        newMark = 'red-mark';
      } else if (currentMark === 'red-mark') {
        newMark = 'green-mark';
      } else {
        newMark = undefined;
      }
      
      newStates[rowIndex][colIndex].mark = newMark;
      
      // Update keyboard colors based on the state of all instances of this letter
      updateKeyboardMarkings(letter);
      
      return newStates;
    });
  }, [isHardMode, tileStates, guessHistory, getCorrectLetterCount, gameWord]);

  // Helper function to update keyboard color state based on tile markings
  const updateKeyboardMarkings = useCallback((letter: string) => {
    // If the letter already has a solid color, don't change it
    if (keyboardColors[letter] === 'green' || keyboardColors[letter] === 'red') {
      return;
    }
    
    // Count how many instances of this letter have red/green marks in all guesses
    let redMarks = 0;
    let greenMarks = 0;
    
    // Go through all tiles in all guesses
    for (let i = 0; i < tileStates.length; i++) {
      for (let j = 0; j < tileStates[i].length; j++) {
        const tile = tileStates[i][j];
        if (tile.letter.toUpperCase() === letter) {
          if (tile.mark === 'red-mark') {
            redMarks++;
          } else if (tile.mark === 'green-mark') {
            greenMarks++;
          }
        }
      }
    }
    
    // Update the keyboard color based on the counts
    // The priority is: green outline > red outline > no outline
    setKeyboardColors(prev => {
      const newColors = { ...prev };
      
      if (greenMarks > 0) {
        newColors[letter] = 'green-outline';
      } else if (redMarks > 0) {
        newColors[letter] = 'red-outline';
      } else {
        // If no marks, remove any outline
        if (newColors[letter] === 'green-outline' || newColors[letter] === 'red-outline') {
          newColors[letter] = '';
        }
      }
      
      return newColors;
    });
  }, [tileStates, keyboardColors]);

  const updateTileStates = useCallback((newGuess: string, rowIndex: number, correctLetterCount: number) => {
    // First, always set the basic tile state with letters and color, regardless of mode
    const color = getLetterColor(newGuess, correctLetterCount);
    const initialState = [...tileStates];
    initialState[rowIndex] = newGuess.split('').map((letter, index) => ({
      ...initialState[rowIndex][index],
      color,
      letter,
    }));
    
    // If in hard mode, just update the state and return
    if (isHardMode) {
      setTileStates(initialState);
      return;
    }
    
    // For easy mode, use this as our starting state
    let currentState: GuessState = {
      knownCorrectLetters,
      knownIncorrectLetters,
      knownMaxFrequency,
      tileStates: initialState,
      keyboardColors
    };

    const checkGuess = (
      guess: string, 
      score: number, 
      guessRowIndex: number,
      currentState: GuessState
    ): [boolean, GuessState] => {
      // Create working copy of state
      const newState: GuessState = {
        knownCorrectLetters: new Map(currentState.knownCorrectLetters),
        knownIncorrectLetters: new Set(currentState.knownIncorrectLetters),
        knownMaxFrequency: new Map(currentState.knownMaxFrequency),
        tileStates: currentState.tileStates.map(row => [...row]),
        keyboardColors: { ...currentState.keyboardColors }
      };

      let madeChanges = false;
      const unmarkedIndices: number[] = [];
      let markedCorrectCount = 0;
      let markedIncorrectCount = 0;

      // Helper functions
      const markLetter = (index: number, isCorrect: boolean) => {
        const color = getLetterColor(guess, score);
        newState.tileStates[guessRowIndex][index] = {
          ...newState.tileStates[guessRowIndex][index],
          letter: guess[index],
          color,
          dot: isCorrect ? 'green-dot' : 'red-dot'
        };
        newState.keyboardColors[guess[index]] = isCorrect ? 'green' : 'red';
        madeChanges = true;
      };

      const addToKnownIncorrect = (letter: string) => {
        newState.knownIncorrectLetters.add(letter);
      };

      const addToKnownCorrect = (letter: string) => {
        newState.knownCorrectLetters.set(
          letter, 
          (newState.knownCorrectLetters.get(letter) || 0) + 1
        );
      };

      const addToKnownMaxFrequency = (letter: string, maxFreq: number) => {
        if (!newState.knownMaxFrequency.has(letter) || 
            newState.knownMaxFrequency.get(letter)! > maxFreq) {
          newState.knownMaxFrequency.set(letter, maxFreq);
        }
      };

      // Get current state of tiles for this guess
      const currentTiles = newState.tileStates[guessRowIndex];

      // Count marked letters and collect unmarked indices
      currentTiles.forEach((tile, index) => {
        if (tile.dot === 'green-dot') markedCorrectCount++;
        else if (tile.dot === 'red-dot') markedIncorrectCount++;
        else unmarkedIndices.push(index);
      });

      // If score is 0, mark all unmarked letters as incorrect
      if (score === 0) {
        unmarkedIndices.forEach(index => {
          const letter = guess[index];
          markLetter(index, false);
          addToKnownIncorrect(letter);
        });
        return [true, newState];
      }

      // Process known letters and frequencies
      let remainingUnmarked = [...unmarkedIndices];
      const letterCounts = new Map<string, number>();

      remainingUnmarked.forEach(index => {
        const letter = guess[index];
        letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
      });

      // Apply known information
      remainingUnmarked.forEach(index => {
        const letter = guess[index];
        if (newState.knownCorrectLetters.has(letter)) {
          markLetter(index, true);
          markedCorrectCount++;
        } else if (newState.knownIncorrectLetters.has(letter)) {
          markLetter(index, false);
          markedIncorrectCount++;
        }
      });

      // Update remainingUnmarked
      remainingUnmarked = unmarkedIndices.filter(index => 
        !newState.tileStates[guessRowIndex][index].dot
      );

      // Apply logical deductions
      if (markedCorrectCount === score && remainingUnmarked.length > 0) {
        remainingUnmarked.forEach(index => {
          const letter = guess[index];
          markLetter(index, false);
          addToKnownIncorrect(letter);
        });
      }

      if (markedIncorrectCount + score === 4 && remainingUnmarked.length > 0) {
        remainingUnmarked.forEach(index => {
          const letter = guess[index];
          markLetter(index, true);
          addToKnownCorrect(letter);
        });
      }

      // Process duplicates for max frequency
      letterCounts.forEach((count, letter) => {
        if (count > (score - markedCorrectCount)) {
          addToKnownMaxFrequency(letter, score - markedCorrectCount);
          
          let marked = 0;
          const excess = count - (score - markedCorrectCount);
          
          for (let i = remainingUnmarked.length - 1; i >= 0 && marked < excess; i--) {
            const index = remainingUnmarked[i];
            if (guess[index] === letter) {
              markLetter(index, false);
              marked++;
            }
          }
        }
      });

      return [madeChanges, newState];
    };

    // Apply deductions iteratively
    let shouldRecheck = true;
    let iteration = 0;
    const MAX_ITERATIONS = 10;

    while (shouldRecheck && iteration < MAX_ITERATIONS) {
      shouldRecheck = false;
      
      // Check all guesses from the beginning
      for (let i = 0; i <= rowIndex; i++) {
        const guess = i === rowIndex ? newGuess : guessHistory[i];
        if (!guess) continue;
        
        const score = i === rowIndex ? correctLetterCount : 
                     getCorrectLetterCount(guess, gameWord);
        const [madeChanges, newState] = checkGuess(guess, score, i, currentState);
        
        if (madeChanges) {
          shouldRecheck = true;
          currentState = newState;
        }
      }
      
      iteration++;
    }

    // Update all state at once
    setTileStates(currentState.tileStates);
    setKeyboardColors(currentState.keyboardColors);
    setKnownCorrectLetters(currentState.knownCorrectLetters);
    setKnownIncorrectLetters(currentState.knownIncorrectLetters);
    setKnownMaxFrequency(currentState.knownMaxFrequency);
  }, [
    isHardMode,
    guessHistory,
    gameWord,
    getCorrectLetterCount,
    tileStates,
    keyboardColors,
    knownCorrectLetters,
    knownIncorrectLetters,
    knownMaxFrequency,
    getLetterColor
  ]);

  const submitGuess = useCallback((guess: string) => {
    if (gameOver) return;
    
    if (!validGuesses.includes(guess.toLowerCase())) {
      alert('Not a valid word!');
      return;
    }
  
    const correctLetterCount = getCorrectLetterCount(guess, gameWord);
    const newGuessHistory = [...guessHistory, guess];
    setGuessHistory(newGuessHistory);
    setGuessesRemaining(prev => prev - 1);
  
    const currentRowIndex = 8 - guessesRemaining;
    updateTileStates(guess, currentRowIndex, correctLetterCount);
  
    // Update keyboard colors based on guess outcome
    const newKeyboardColors = { ...keyboardColors };
    
    // Handle different cases:
    // 1. Score of 0 - mark all letters red
    if (correctLetterCount === 0) {
      guess.split('').forEach(letter => {
        const upperLetter = letter.toUpperCase();
        // Only update if not already green (preserve green)
        if (newKeyboardColors[upperLetter] !== 'green') {
          newKeyboardColors[upperLetter] = 'red';
        }
      });
    }
    // 2. Correct guess - mark all letters green
    else if (guess === gameWord) {
      guess.split('').forEach(letter => {
        newKeyboardColors[letter.toUpperCase()] = 'green';
      });
    }
    // 3. Partial match - no color changes (just the score box turns yellow)
    
    setKeyboardColors(newKeyboardColors);
  
    if (guess === gameWord) {
      setGameOver(true);
      setGameWon(true);
      setFinalAttempts(8 - (guessesRemaining - 1));
      setTimeout(() => setShowEndModal(true), 300);
    } else if (guessesRemaining <= 1) {
      setGameOver(true);
      setGameWon(false);
      setFinalAttempts(8);
      setTimeout(() => setShowEndModal(true), 300);
    }
  
    setCurrentGuess('');
  }, [
    gameOver,
    gameWord,
    guessHistory,
    guessesRemaining,
    validGuesses,
    getCorrectLetterCount,
    updateTileStates,
    keyboardColors
  ]);

// Load cache effect
useEffect(() => {
  if (typeof window === 'undefined') return;

  const loadCachedState = () => {
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      setInitialized(true);
      return;
    }
    
    try {
      const state = JSON.parse(cached);

      // Check game version first
      if (state.gameVersion !== GAME_VERSION) {
        localStorage.removeItem(cacheKey);
        setInitialized(true);
        return;
      }

      if (state.word === gameWord) {
        setGuessesRemaining(state.guessesRemaining);
        setGuessHistory(state.guessHistory);
        setGameOver(state.gameOver);
        setGameWon(state.gameWon);
        setFinalAttempts(state.finalAttempts);
        setKeyboardColors(state.keyboardColors);
        setTileStates(state.tileStates);
        setIsHardMode(state.isHardMode ?? true);
        setKnownCorrectLetters(new Map(state.knownCorrectLetters));
        setKnownIncorrectLetters(new Set(state.knownIncorrectLetters));
        setKnownMaxFrequency(new Map(state.knownMaxFrequency));
        if (state.gameOver) {
          setShowEndModal(true);
        }
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
    setInitialized(true);
  };

  loadCachedState();
}, [cacheKey, gameWord]);

// Save cache effect
useEffect(() => {
  if (!initialized || typeof window === 'undefined') return;

  const stateToCache = {
    gameVersion: GAME_VERSION,
    word: gameWord,
    guessesRemaining,
    guessHistory,
    gameOver,
    gameWon,
    finalAttempts,
    keyboardColors,
    tileStates,
    isHardMode,
    knownCorrectLetters: Array.from(knownCorrectLetters.entries()),
    knownIncorrectLetters: Array.from(knownIncorrectLetters),
    knownMaxFrequency: Array.from(knownMaxFrequency.entries())
  };

  localStorage.setItem(cacheKey, JSON.stringify(stateToCache));
}, [
  initialized,
  gameWord,
  guessesRemaining,
  guessHistory,
  gameOver,
  gameWon,
  finalAttempts,
  keyboardColors,
  tileStates,
  isHardMode,
  knownCorrectLetters,
  knownIncorrectLetters,
  knownMaxFrequency,
  cacheKey
]);

return {
  currentGuess,
  isHardMode,
  tileStates,
  guessesRemaining,
  guessHistory,
  gameOver,
  gameWon,
  finalAttempts,
  keyboardColors,
  showEndModal,
  knownCorrectLetters,
  knownIncorrectLetters,
  knownMaxFrequency,
  handlePlayAgain,
  toggleGameMode,
  submitGuess,
  updateCurrentGuess: setCurrentGuess,
  handleTileMark,
  setShowEndModal,
  getCorrectLetterCount,
  getLetterColor
};
};

export default useGameState;
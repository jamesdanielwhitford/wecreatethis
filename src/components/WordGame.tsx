'use client'
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './WordGame.module.css';
import { Header } from './Header';

// Cache version - update this when making breaking changes to state structure
const CACHE_VERSION = '2024-02-12';

interface WordGameProps {
  gameWord: string;
  onNewGame?: () => void;
  gameTitle: string;
  alternateGamePath: string;
  alternateGameName: string;
  isDaily?: boolean;
  validGuesses: string[];
  cacheKey: string;
}

interface KeyboardButtonProps {
  dataKey: string;
  onClick: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

type GameColor = '' | 'orange' | 'red' | 'green';
type TileMark = 'red-mark' | 'green-mark';
type TileDot = 'red-dot' | 'green-dot';

interface TileState {
  color: GameColor;
  mark?: TileMark;
  dot?: TileDot;
  letter: string;
}

interface GuessState {
  knownCorrectLetters: Map<string, number>;
  knownIncorrectLetters: Set<string>;
  knownMaxFrequency: Map<string, number>;
  tileStates: TileState[][];
  keyboardColors: Record<string, GameColor>;
}

const KeyboardButton: React.FC<KeyboardButtonProps> = ({ dataKey, onClick, className, children }) => (
  <button
    data-key={dataKey}
    className={`${styles.keyboardButton} ${className || ''}`}
    onClick={() => onClick(dataKey)}
  >
    {children}
  </button>
);

export function WordGame({ 
  gameWord, 
  onNewGame, 
  gameTitle, 
  alternateGamePath,
  alternateGameName,
  isDaily,
  validGuesses,
  cacheKey
}: WordGameProps) {
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
    return 'orange';
  }, [gameWord]);


  const updateTileStates = useCallback((newGuess: string, rowIndex: number, correctLetterCount: number) => {
    if (isHardMode) {
      const color = getLetterColor(newGuess, correctLetterCount);
      setTileStates(prev => {
        const newStates = [...prev];
        newStates[rowIndex] = newGuess.split('').map((letter, index) => ({
          ...prev[rowIndex][index],
          color,
          letter,
        }));
        return newStates;
      });
      return;
    }
  
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
        tileStates: [...currentState.tileStates.map(row => [...row.map(tile => ({...tile}))])],
        keyboardColors: {...currentState.keyboardColors}
      };
  
      let madeChanges = false;
      const unmarkedIndices: number[] = [];
      let markedCorrectCount = 0;
      let markedIncorrectCount = 0;
  
      // Get current state of tiles for this guess
      const currentTiles = newState.tileStates[guessRowIndex];
  
      // Helper to mark a letter
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
  
      // Helper to add to known incorrect
      const addToKnownIncorrect = (letter: string) => {
        newState.knownIncorrectLetters.add(letter);
      };
  
      // Helper to add to known correct
      const addToKnownCorrect = (letter: string) => {
        newState.knownCorrectLetters.set(letter, (newState.knownCorrectLetters.get(letter) || 0) + 1);
      };
  
      // Helper to add to max frequency
      const addToKnownMaxFrequency = (letter: string, maxFreq: number) => {
        if (!newState.knownMaxFrequency.has(letter) || newState.knownMaxFrequency.get(letter)! > maxFreq) {
          newState.knownMaxFrequency.set(letter, maxFreq);
        }
      };
  
      // Set initial letters if not already set
      guess.split('').forEach((letter, index) => {
        if (!currentTiles[index].letter) {
          const color = getLetterColor(guess, score);
          newState.tileStates[guessRowIndex][index] = {
            ...newState.tileStates[guessRowIndex][index],
            letter,
            color
          };
        }
      });
  
      // Check if all letters are already marked
      const isFullyMarked = currentTiles.every(tile => tile.dot);
      if (isFullyMarked) {
        return [false, currentState];
      }
  
      // Count marked letters and collect unmarked indices
      currentTiles.forEach((tile, index) => {
        if (tile.dot === 'green-dot') {
          markedCorrectCount++;
        }
        else if (tile.dot === 'red-dot') {
          markedIncorrectCount++;
        }
        else {
          unmarkedIndices.push(index);
        }
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

      // Recalculate unmarked indices after applying known information
      let remainingUnmarked = unmarkedIndices.filter(index => 
        !newState.tileStates[guessRowIndex][index].dot
      );

      // Handle letters with known max frequencies
      const letterCounts = new Map<string, number>();
      remainingUnmarked.forEach(index => {
        const letter = guess[index];
        letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
      });
  
      // First check known max frequencies
      letterCounts.forEach((count, letter) => {
        if (newState.knownMaxFrequency.has(letter)) {
          const maxFreq = newState.knownMaxFrequency.get(letter)!;
          if (count > maxFreq) {
            // Mark excess occurrences as incorrect
            const excessCount = count - maxFreq;
            let marked = 0;
            
            // Start from the end to mark later occurrences
            for (let i = remainingUnmarked.length - 1; i >= 0 && marked < excessCount; i--) {
              const index = remainingUnmarked[i];
              if (guess[index] === letter) {
                markLetter(index, false);
                marked++;
              }
            }
          }
        }
      });

      remainingUnmarked = unmarkedIndices.filter(index => 
        !newState.tileStates[guessRowIndex][index].dot
      );

      // Check unmarked letters against known lists
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
  
      // Recalculate unmarked indices after applying known information
      remainingUnmarked = unmarkedIndices.filter(index => 
        !newState.tileStates[guessRowIndex][index].dot
      );
  
      // If marked correct count equals score, remaining must be incorrect
      if (markedCorrectCount === score && remainingUnmarked.length > 0) {
        remainingUnmarked.forEach(index => {
          const letter = guess[index];
          markLetter(index, false);
          addToKnownIncorrect(letter);
        });
        return [true, newState];
      }
  
      // If marked incorrect count plus score equals word length, remaining must be correct
      if (markedIncorrectCount + score === 4 && remainingUnmarked.length > 0) {
        remainingUnmarked.forEach(index => {
          const letter = guess[index];
          markLetter(index, true);
          addToKnownCorrect(letter);
        });
        return [true, newState];
      }
  
      // Then handle new duplicates to discover max frequencies
      const duplicates = Array.from(letterCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([letter]) => letter);
  
      duplicates.forEach(letter => {
        const remainingCorrect = score - markedCorrectCount;
        const letterFrequency = letterCounts.get(letter) || 0;
        
        if (letterFrequency > remainingCorrect) {
          // We've discovered a max frequency
          addToKnownMaxFrequency(letter, remainingCorrect);
          
          // Mark excess occurrences as incorrect
          const excessCount = letterFrequency - remainingCorrect;
          let marked = 0;
          
          // Start from the end to mark later occurrences
          for (let i = remainingUnmarked.length - 1; i >= 0 && marked < excessCount; i--) {
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
  
    let currentState: GuessState = {
      knownCorrectLetters,
      knownIncorrectLetters,
      knownMaxFrequency,
      tileStates,
      keyboardColors
    };
  
    let shouldRecheck = true;
    let iteration = 0;
    const MAX_ITERATIONS = 10;
  
    while (shouldRecheck && iteration < MAX_ITERATIONS) {
      shouldRecheck = false;
      
      // Check all guesses from the beginning
      for (let i = 0; i <= rowIndex; i++) {
        const guess = i === rowIndex ? newGuess : guessHistory[i];
        if (!guess) continue;
        
        const score = i === rowIndex ? correctLetterCount : getCorrectLetterCount(guess, gameWord);
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

  const handleTileMark = useCallback((rowIndex: number, colIndex: number) => {
    if (isHardMode && tileStates[rowIndex][colIndex].color !== 'orange') return;
    
    setTileStates(prev => {
      const newStates = [...prev];
      const currentMark = newStates[rowIndex][colIndex].mark;
      
      if (!currentMark) {
        newStates[rowIndex][colIndex].mark = 'red-mark';
      } else if (currentMark === 'red-mark') {
        newStates[rowIndex][colIndex].mark = 'green-mark';
      } else {
        newStates[rowIndex][colIndex].mark = undefined;
      }
      
      return newStates;
    });
  }, [isHardMode, tileStates]);

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

  const submitGuess = useCallback(() => {
    if (gameOver) return;
    
    if (!validGuesses.includes(currentGuess.toLowerCase())) {
      alert('Not a valid word!');
      return;
    }

    const correctLetterCount = getCorrectLetterCount(currentGuess, gameWord);
    const newGuessHistory = [...guessHistory, currentGuess];
    setGuessHistory(newGuessHistory);
    setGuessesRemaining(prev => prev - 1);

    const currentRowIndex = 8 - guessesRemaining;
    updateTileStates(currentGuess, currentRowIndex, correctLetterCount);

    if (currentGuess === gameWord) {
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
    currentGuess,
    gameWord,
    guessHistory,
    guessesRemaining,
    validGuesses,
    gameOver,
    updateTileStates,
    getCorrectLetterCount
  ]);

  const handleInput = useCallback((key: string) => {
    if (gameOver) return;

    if (key === 'ENTER') {
      if (currentGuess.length === 4) {
        submitGuess();
      } else {
        alert('Please enter a 4-letter word.');
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < 4) {
      setCurrentGuess(prev => prev + key);
    }
  }, [currentGuess, gameOver, submitGuess]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.match(/^[a-z]$/i)) {
        handleInput(e.key.toUpperCase());
      } else if (e.key === 'Enter') {
        handleInput('ENTER');
      } else if (e.key === 'Backspace') {
        handleInput('BACKSPACE');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleInput]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const state = JSON.parse(cached);
        if (!state.version || state.version < CACHE_VERSION) {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

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

  useEffect(() => {
    if (!initialized || typeof window === 'undefined') return;

    const stateToCache = {
      version: CACHE_VERSION,
      guessesRemaining,
      guessHistory,
      gameOver,
      gameWon,
      finalAttempts,
      keyboardColors,
      tileStates,
      isHardMode,
      word: gameWord,
      knownCorrectLetters: Array.from(knownCorrectLetters.entries()),
      knownIncorrectLetters: Array.from(knownIncorrectLetters),
      knownMaxFrequency: Array.from(knownMaxFrequency.entries())
    };

    localStorage.setItem(cacheKey, JSON.stringify(stateToCache));
  }, [initialized, guessesRemaining, guessHistory, gameOver, gameWon, finalAttempts, 
      keyboardColors, tileStates, gameWord, cacheKey, isHardMode, 
      knownCorrectLetters, knownIncorrectLetters, knownMaxFrequency]);

  const shareScore = useCallback(async () => {
    const shareText = gameWon
      ? `I solved ${isDaily ? "today's" : ''} ${gameTitle} in ${finalAttempts} attempts! Can you beat that?`
      : `I couldn't solve ${isDaily ? "today's" : 'this'} ${gameTitle}. Can you do better?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${gameTitle} Score`,
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Score copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy score:', error);
        alert('Failed to copy score');
      }
    }
  }, [gameWon, isDaily, gameTitle, finalAttempts]);

  function renderGuessGrid() {
    return (
      <div className={styles.guessGrid}>
        {tileStates.map((row, rowIndex) => {
          const isCurrentRow = 8 - guessesRemaining === rowIndex;
          const guess = guessHistory[rowIndex] || '';
          const correctLetterCount = guess ? getCorrectLetterCount(guess, gameWord) : '';
          
          return (
            <div 
              key={rowIndex} 
              className={`${styles.guessRow} ${guess === gameWord ? styles.correct : ''}`}
            >
              {row.map((tileState, colIndex) => (
                <div 
                  key={colIndex}
                  className={`
                    ${styles.letter} 
                    ${tileState.letter ? styles.guessed : ''} 
                    ${tileState.color ? styles[tileState.color] : ''}
                    ${tileState.mark ? styles[tileState.mark] : ''}
                    ${tileState.dot ? styles[tileState.dot] : ''}
                    ${tileState.color === 'orange' && isHardMode ? styles.markable : ''}
                  `}
                  onClick={() => handleTileMark(rowIndex, colIndex)}
                >
                  {isCurrentRow ? currentGuess[colIndex] : tileState.letter}
                </div>
              ))}
              <div className={styles.score}>{correctLetterCount}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderKeyboard() {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    return (
      <div className={styles.keyboard}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.keyboardRow}>
            {row.map(key => (
              <KeyboardButton
                key={key}
                dataKey={key}
                onClick={handleInput}
                className={`${key === 'ENTER' || key === 'BACKSPACE' ? styles.wideButton : ''} ${
                  keyboardColors[key] ? styles[keyboardColors[key]] : ''
                }`}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </KeyboardButton>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header
        gameTitle={gameTitle}
        alternateGamePath={alternateGamePath}
        alternateGameName={alternateGameName}
        isHardMode={isHardMode}
        setIsHardMode={setIsHardMode}
        hasStartedGame={guessHistory.length > 0}
        onModeChange={toggleGameMode}
      />

      <div className={styles.gameContainer}>
        {renderGuessGrid()}
        {renderKeyboard()}
      </div>

      {showEndModal && (
        <div className={styles.modal} onClick={() => setShowEndModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowEndModal(false)}>×</button>
            <h2>{gameWon ? 'Congratulations!' : 'Game Over'}</h2>
            <p>
              {gameWon 
                ? `You guessed the word in ${finalAttempts} tries!` 
                : `The word was ${gameWord}`}
            </p>
            <div className={styles.modalButtons}>
              {!isDaily && onNewGame && (
                <button 
                  onClick={handlePlayAgain}
                  className={styles.navButton}
                >
                  Play Again
                </button>
              )}
              <Link href={alternateGamePath} className={styles.navButton}>
                Play {alternateGameName}
              </Link>
              <a
                href="https://www.buymeacoffee.com/jameswhitford"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navButton}
              >
                ☕️ Buy Me a Coffee
              </a>
              <button onClick={shareScore} className={styles.navButton}>
                Share Score
              </button>
              <button onClick={() => setShowEndModal(false)} className={styles.navButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
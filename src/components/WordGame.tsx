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

interface WordState {
  knownCorrectLetters: Map<string, number>;  // letter -> frequency
  knownIncorrectLetters: Set<string>;        // just the letters
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

  const updateKeyboardColor = useCallback((letter: string, newColor: GameColor, force: boolean = false) => {
    setKeyboardColors(prev => {
      const currentColor = prev[letter] || '';
      
      if (force) {
        return { ...prev, [letter]: newColor };
      }
      
      if (currentColor === 'red' || currentColor === 'green') {
        return prev;
      }
      
      if ((currentColor === 'orange' || currentColor === '') && 
          (newColor === 'red' || newColor === 'green')) {
        return { ...prev, [letter]: newColor };
      }
      
      if (currentColor === '' && newColor === 'orange') {
        return { ...prev, [letter]: newColor };
      }
      
      return prev;
    });
  }, []);

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
  
    setTileStates(prev => {
      const updatedStates = [...prev];
      const wordState: WordState = {
        knownCorrectLetters: new Map<string, number>(),
        knownIncorrectLetters: new Set<string>()
      };
  
      // Process all zero-score guesses first to build initial knowledge
      for (let i = 0; i <= rowIndex; i++) {
        const guess = i === rowIndex ? newGuess : guessHistory[i];
        if (!guess) continue;
        
        const score = i === rowIndex ? correctLetterCount : getCorrectLetterCount(guess, gameWord);
        
        if (score === 0) {
          guess.split('').forEach(letter => {
            wordState.knownIncorrectLetters.add(letter);
            updateKeyboardColor(letter, 'red', true);
          });
          const color = getLetterColor(guess, score);
          updatedStates[i] = guess.split('').map((letter, colIndex) => ({
            ...prev[i][colIndex],
            color: color,
            letter,
            dot: 'red-dot'
          }));
        }
      }
  
      const markLetter = (letter: string, index: number, rowIdx: number, isCorrect: boolean) => {
        const color = getLetterColor(updatedStates[rowIdx].map(t => t.letter).join(''), 
          getCorrectLetterCount(updatedStates[rowIdx].map(t => t.letter).join(''), gameWord));
        
        updatedStates[rowIdx][index] = {
          ...updatedStates[rowIdx][index],
          letter,
          color: color,
          dot: isCorrect ? 'green-dot' : 'red-dot'
        };
        updateKeyboardColor(letter, isCorrect ? 'green' : 'red', true);
      };
  
      const processGuess = (
        guess: string, 
        rowIdx: number, 
        score: number, 
        localWordState: WordState,
        originalFrequencies: Map<string, number>
      ): boolean => {
        if (score === 0) return true;
  
        const letterCounts = new Map<string, number>();
        const unprocessedIndices: number[] = [];
        let knownCorrectInGuess = 0;
        
        // First pass: Process known letters
        guess.split('').forEach((letter, index) => {
          if (localWordState.knownIncorrectLetters.has(letter)) {
            markLetter(letter, index, rowIdx, false);
          } else if (localWordState.knownCorrectLetters.has(letter)) {
            const frequency = localWordState.knownCorrectLetters.get(letter)!;
            const currentCount = letterCounts.get(letter) || 0;
            
            if (currentCount < frequency) {
              markLetter(letter, index, rowIdx, true);
              letterCounts.set(letter, currentCount + 1);
              knownCorrectInGuess++;
            } else {
              markLetter(letter, index, rowIdx, false);
            }
          } else {
            unprocessedIndices.push(index);
          }
        });
  
        // Restore original frequencies
        originalFrequencies.forEach((freq, letter) => {
          if (localWordState.knownCorrectLetters.has(letter)) {
            localWordState.knownCorrectLetters.set(letter, freq);
          }
        });
  
        // If all letters are marked, we're done with this guess
        if (unprocessedIndices.length === 0) return true;
  
        // If sum of known correct letters equals score, remaining must be incorrect
        if (knownCorrectInGuess === score) {
          unprocessedIndices.forEach(index => {
            const letter = guess[index];
            markLetter(letter, index, rowIdx, false);
            if (!localWordState.knownCorrectLetters.has(letter)) {
              localWordState.knownIncorrectLetters.add(letter);
            }
          });
          return true;
        }
  
        // If number of known incorrect + score equals word length, remaining must be correct
        if (unprocessedIndices.length + knownCorrectInGuess === score) {
          unprocessedIndices.forEach(index => {
            const letter = guess[index];
            markLetter(letter, index, rowIdx, true);
            
            const currentFreq = localWordState.knownCorrectLetters.get(letter) || 0;
            const occurrencesInGuess = guess.split('').filter(l => l === letter).length;
            
            if (occurrencesInGuess > currentFreq) {
              localWordState.knownCorrectLetters.set(letter, occurrencesInGuess);
            }
          });
          return true;
        }
  
        // Handle remaining duplicate letters
        const remainingLetters = unprocessedIndices.map(index => guess[index]);
        const uniqueRemaining = new Set(remainingLetters);
        
        if (uniqueRemaining.size === 1) {
          const letter = remainingLetters[0];
          const remainingCorrect = score - knownCorrectInGuess;
          
          // Mark correct letters
          for (let i = 0; i < remainingCorrect; i++) {
            markLetter(letter, unprocessedIndices[i], rowIdx, true);
          }
          
          // Update known correct frequency if necessary
          const currentFreq = localWordState.knownCorrectLetters.get(letter) || 0;
          if (remainingCorrect > currentFreq) {
            localWordState.knownCorrectLetters.set(letter, remainingCorrect);
          }
          
          // Mark remaining as incorrect
          for (let i = remainingCorrect; i < unprocessedIndices.length; i++) {
            markLetter(letter, unprocessedIndices[i], rowIdx, false);
          }
          
          return true;
        }
  
        return false;
      };
  
      const updateBoard = (maxIterations = 10) => {
        if (maxIterations <= 0) return; // Prevent infinite recursion
        
        let madeProgress = false;
        const originalFrequencies = new Map(wordState.knownCorrectLetters);
        const processedGuesses = new Set<string>(); // Track which guesses we've processed by row
  
        for (let i = 0; i <= rowIndex; i++) {
          const guess = i === rowIndex ? newGuess : guessHistory[i];
          if (!guess) continue;
          
          // Create a unique key for each guess-row combination
          const guessKey = `${guess}-${i}`;
          if (processedGuesses.has(guessKey)) continue;
          
          const score = i === rowIndex ? correctLetterCount : getCorrectLetterCount(guess, gameWord);
          if (score === 0) continue;
  
          processedGuesses.add(guessKey);
          if (processGuess(guess, i, score, wordState, originalFrequencies)) {
            madeProgress = true;
          }
        }
  
        if (madeProgress) {
          updateBoard(maxIterations - 1);
        }
      };
  
      updateBoard();
      return updatedStates;
    });
  }, [isHardMode, getLetterColor, gameWord, getCorrectLetterCount, guessHistory, updateKeyboardColor]);

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

        // Only restore state if it's for the current word
        if (state.word === gameWord) {
          setGuessesRemaining(state.guessesRemaining);
          setGuessHistory(state.guessHistory);
          setGameOver(state.gameOver);
          setGameWon(state.gameWon);
          setFinalAttempts(state.finalAttempts);
          setKeyboardColors(state.keyboardColors);
          setTileStates(state.tileStates);
          setIsHardMode(state.isHardMode ?? true);
          if (state.gameOver) {
            setShowEndModal(true);
          }
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        console.error('Error parsing cached state:', e);
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
    };

    localStorage.setItem(cacheKey, JSON.stringify(stateToCache));
  }, [initialized, guessesRemaining, guessHistory, gameOver, gameWon, finalAttempts, keyboardColors, tileStates, gameWord, cacheKey, isHardMode]);

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
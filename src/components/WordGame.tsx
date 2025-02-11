'use client'
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './WordGame.module.css';

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

const colorHierarchy: Record<GameColor, number> = { 'green': 3, 'orange': 2, 'red': 1, '': 0 };

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
      Array(4).fill(null).map(() => ({ color: '', letter: '' }))
    )
  );
  const [guessesRemaining, setGuessesRemaining] = useState(8);
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [finalAttempts, setFinalAttempts] = useState(0);
  const [keyboardColors, setKeyboardColors] = useState<Record<string, GameColor>>({});
  const [showRules, setShowRules] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

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

  function getCorrectLetterCount(guess: string, answer: string): number {
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
  }

  function getLetterColor(guess: string, correctLetterCount: number): GameColor {
    if (!guess) return '';
    if (correctLetterCount === 0) return 'red';
    if (guess === gameWord) return 'green';
    return 'orange';
  }

  function updateKeyboardColor(letter: string, newColor: GameColor, force: boolean = false) {
    setKeyboardColors(prev => {
      const currentColor = prev[letter] || '';
      
      // If force is true, always update the color
      if (force) {
        return { ...prev, [letter]: newColor };
      }
      
      // Otherwise, follow the existing color hierarchy logic
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
  }

  function updateTileStates(newGuess: string, rowIndex: number, correctLetterCount: number) {
    if (isHardMode) {
      // Simple update for hard mode
      const color = getLetterColor(newGuess, correctLetterCount);
      setTileStates(prev => {
        const newStates = [...prev];
        newStates[rowIndex] = newGuess.split('').map(letter => ({
          color,
          letter,
          mark: undefined,
          dot: undefined
        }));
        return newStates;
      });
      return;
    }

    // Complex update for easy mode
    const updatedStates = [...tileStates];
    const definitivelyNotInWord = new Set<string>();
    const definitivelyInWord = new Set<string>();

    // First step: Process all previous guesses to gather initial information
    for (let i = 0; i <= rowIndex; i++) {
      const guess = i === rowIndex ? newGuess : guessHistory[i];
      if (!guess) continue;
      
      const score = i === rowIndex ? correctLetterCount : getCorrectLetterCount(guess, gameWord);
      
      if (score === 0) {
        guess.split('').forEach(letter => {
          definitivelyNotInWord.add(letter);
          // Update keyboard color to red for zero-score guesses
          updateKeyboardColor(letter, 'red', true);
        });
        updatedStates[i] = guess.split('').map(letter => ({
          color: 'red',
          letter,
          mark: undefined,
          dot: undefined
        }));
      } else {
        const color = getLetterColor(guess, score);
        updatedStates[i] = guess.split('').map(letter => ({
          color,
          letter,
          mark: undefined,
          dot: undefined
        }));
      }
    }

    // Recursive function to update the board based on known information
    const updateBoard = () => {
      let madeChanges = false;

      for (let i = 0; i <= rowIndex; i++) {
        const guess = i === rowIndex ? newGuess : guessHistory[i];
        if (!guess) continue;

        const score = i === rowIndex ? correctLetterCount : getCorrectLetterCount(guess, gameWord);
        if (score === 0) continue;

        const guessLetters = guess.split('');
        let knownCorrectCount = 0;
        let knownIncorrectCount = 0;

        guessLetters.forEach((letter, index) => {
          if (definitivelyInWord.has(letter)) {
            knownCorrectCount++;
            if (!updatedStates[i][index].dot || updatedStates[i][index].dot !== 'green-dot') {
              updatedStates[i][index].dot = 'green-dot';
              // Update keyboard color to green
              updateKeyboardColor(letter, 'green', true);
              madeChanges = true;
            }
          } else if (definitivelyNotInWord.has(letter)) {
            knownIncorrectCount++;
            if (!updatedStates[i][index].dot || updatedStates[i][index].dot !== 'red-dot') {
              updatedStates[i][index].dot = 'red-dot';
              // Update keyboard color to red
              updateKeyboardColor(letter, 'red', true);
              madeChanges = true;
            }
          }
        });

        const remainingUnknown = 4 - (knownCorrectCount + knownIncorrectCount);
        if (remainingUnknown > 0 && remainingUnknown === score - knownCorrectCount) {
          guessLetters.forEach((letter, index) => {
            if (!definitivelyInWord.has(letter) && !definitivelyNotInWord.has(letter)) {
              definitivelyInWord.add(letter);
              if (!updatedStates[i][index].dot || updatedStates[i][index].dot !== 'green-dot') {
                updatedStates[i][index].dot = 'green-dot';
                // Update keyboard color to green
                updateKeyboardColor(letter, 'green', true);
                madeChanges = true;
              }
            }
          });
        }

        if (knownCorrectCount === score && remainingUnknown > 0) {
          guessLetters.forEach((letter, index) => {
            if (!definitivelyInWord.has(letter) && !definitivelyNotInWord.has(letter)) {
              definitivelyNotInWord.add(letter);
              if (!updatedStates[i][index].dot || updatedStates[i][index].dot !== 'red-dot') {
                updatedStates[i][index].dot = 'red-dot';
                // Update keyboard color to red
                updateKeyboardColor(letter, 'red', true);
                madeChanges = true;
              }
            }
          });
        }
      }

      if (madeChanges) {
        updateBoard();
      }
    };

    updateBoard();
    setTileStates(updatedStates);
  }

  const handleTileMark = (rowIndex: number, colIndex: number) => {
    if (isHardMode && tileStates[rowIndex][colIndex].color !== 'orange') return;
    
    setTileStates(prev => {
      const newStates = [...prev];
      const currentMark = newStates[rowIndex][colIndex].mark;
      
      if (!currentMark) {
        newStates[rowIndex][colIndex].mark = 'green-mark';
      } else if (currentMark === 'green-mark') {
        newStates[rowIndex][colIndex].mark = 'red-mark';
      } else {
        newStates[rowIndex][colIndex].mark = undefined;
      }
      
      return newStates;
    });
  };

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

    // Update tile states
    const currentRowIndex = 8 - guessesRemaining;
    updateTileStates(currentGuess, currentRowIndex, correctLetterCount);

    // Update keyboard colors
    const color = getLetterColor(currentGuess, correctLetterCount);
    currentGuess.split('').forEach(letter => {
      updateKeyboardColor(letter, color);
    });

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
  }, [currentGuess, gameWord, guessHistory, guessesRemaining, validGuesses, gameOver, isHardMode]);

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

  async function shareScore() {
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
  }

  const handlePlayAgain = () => {
    if (onNewGame) {
      localStorage.removeItem(cacheKey);
      onNewGame();
      setGameOver(false);
      setGameWon(false);
      setGuessesRemaining(8);
      setGuessHistory([]);
      setKeyboardColors({});
      setTileStates(Array(8).fill(null).map(() => 
        Array(4).fill(null).map(() => ({ color: '', letter: '', mark: undefined, dot: undefined }))
      ));
      setShowEndModal(false);
      setCurrentGuess('');
    }
  };

  const toggleGameMode = () => {
    if (!gameOver && guessHistory.length > 0) {
      if (!confirm('Changing game mode will restart your current game. Continue?')) {
        return;
      }
      handlePlayAgain();
    }
    setIsHardMode(!isHardMode);
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerContainer}>
        <h1>{gameTitle}</h1>
        <div className={styles.headerButtons}>
          <button 
            onClick={toggleGameMode} 
            className={`${styles.modeButton} ${isHardMode ? styles.hardMode : styles.easyMode}`}
          >
            {isHardMode ? 'Hard Mode' : 'Easy Mode'}
          </button>
          <button onClick={() => setShowRules(true)} className={styles.rulesButton}>
            Rules
          </button>
          <Link href={alternateGamePath} className={styles.navButton}>
            Play {alternateGameName}
          </Link>
          <a 
            href="https://www.buymeacoffee.com/jameswhitford" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.coffeeButton}
          >
            ☕️
          </a>
        </div>
      </header>

      <div className={styles.gameContainer}>
        {renderGuessGrid()}
        {renderKeyboard()}
      </div>

      {showRules && (
        <div className={styles.modal} onClick={() => setShowRules(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowRules(false)}>×</button>
            <h2>{gameTitle} Rules</h2>
            <p>
              {isDaily ? "Guess the daily" : "Guess a randomly selected"} 4-letter word in 8 tries.
              Each guess must be a valid 4-letter word.
            </p>
            <p>
              After each guess, a score (0-4) will be displayed, indicating how many letters
              from your guess are in the target word, regardless of position.
            </p>
            <h3>Game Modes</h3>
            <div className={styles.gameModes}>
              <div className={styles.gameMode}>
                <h4>Hard Mode</h4>
                <p>
                  - Tiles turn red for incorrect guesses (score 0)<br />
                  - Tiles turn orange for partially correct guesses<br />
                  - Tiles turn green for correct guesses<br />
                  - You can mark orange tiles to track your deductions
                </p>
              </div>
              <div className={styles.gameMode}>
                <h4>Easy Mode</h4>
                <p>
                  - The game automatically marks tiles based on deduced information<br />
                  - Green dots show letters definitely in the word<br />
                  - Red dots show letters definitely not in the word<br />
                  - Updates continuously as new information is revealed
                </p>
              </div>
            </div>
            <p>The game automatically shows:</p>
            <ul>
              <li>Orange: Letter could potentially be in the word</li>
              <li>Green: Letter is definitely in the word (not necessarily in that position)</li>
              <li>Red: Automatically applied to all letters in a guess that scores 0</li>
            </ul>
            <p>
              Important: The game does not automatically indicate if a letter is in the correct position.
              Use the score and your deduction skills to solve the puzzle!
            </p>
            {!isDaily && (
              <p>A new random word is selected for each game, so you can play as many times as you like!</p>
            )}
          </div>
        </div>
      )}

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

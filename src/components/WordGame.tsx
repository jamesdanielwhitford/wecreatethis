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
  // Initialize with empty state first
  const [initialized, setInitialized] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guessesRemaining, setGuessesRemaining] = useState(8);
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [finalAttempts, setFinalAttempts] = useState(0);
  const [keyboardColors, setKeyboardColors] = useState<Record<string, GameColor>>({});
  const [showRules, setShowRules] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // Load cached state after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadCachedState = () => {
      console.log('Loading cached state for key:', cacheKey);
      const cached = localStorage.getItem(cacheKey);
      console.log('Found cached data:', cached);
      
      if (!cached) {
        console.log('No cached data found, initializing fresh state');
        setInitialized(true);
        return null;
      }
      
      try {
        const state = JSON.parse(cached);
        console.log('Parsed state:', state);
        console.log('Current gameWord:', gameWord);
        
        if (state.word === gameWord) {
          console.log('Words match, restoring state');
          setGuessesRemaining(state.guessesRemaining);
          setGuessHistory(state.guessHistory);
          setGameOver(state.gameOver);
          setGameWon(state.gameWon);
          setFinalAttempts(state.finalAttempts);
          setKeyboardColors(state.keyboardColors);
          if (state.gameOver) {
            setShowEndModal(true);
          }
        } else {
          console.log('Words do not match, clearing cache');
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

  // Cache state whenever it changes
  useEffect(() => {
    if (!initialized || typeof window === 'undefined') return;

    const stateToCache = {
      guessesRemaining,
      guessHistory,
      gameOver,
      gameWon,
      finalAttempts,
      keyboardColors,
      word: gameWord,
    };

    console.log('Caching state:', { cacheKey, state: stateToCache });
    localStorage.setItem(cacheKey, JSON.stringify(stateToCache));
  }, [initialized, guessesRemaining, guessHistory, gameOver, gameWon, finalAttempts, keyboardColors, gameWord, cacheKey]);

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

  function updateKeyboardColor(letter: string, newColor: GameColor) {
    setKeyboardColors(prev => {
      const currentColor = prev[letter] || '';
      if (colorHierarchy[newColor] > colorHierarchy[currentColor]) {
        return { ...prev, [letter]: newColor };
      }
      return prev;
    });
  }

  const submitGuess = useCallback(() => {
    if (gameOver) return;
    
    // Check if the word exists in valid guesses
    if (!validGuesses.includes(currentGuess.toLowerCase())) {
      alert('Not a valid word!');
      return;
    }

    console.log('Submitting guess:', currentGuess);
    const correctLetterCount = getCorrectLetterCount(currentGuess, gameWord);
    const newGuessHistory = [...guessHistory, currentGuess];
    setGuessHistory(newGuessHistory);
    setGuessesRemaining(prev => prev - 1);
    
    // Update keyboard colors
    currentGuess.split('').forEach((letter) => {
      let color: GameColor;
      if (correctLetterCount === 0) {
        color = 'red';
      } else if (currentGuess === gameWord) {
        color = 'green';
      } else {
        const wasInZeroScoreGuess = guessHistory.some(guess => 
          guess.includes(letter) && 
          getCorrectLetterCount(guess, gameWord) === 0
        );
        color = wasInZeroScoreGuess ? 'red' : 'orange';
      }
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
  }, [currentGuess, gameWord, guessHistory, guessesRemaining, validGuesses, gameOver]);

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

  function getLetterColor(guess: string, index: number, correctLetterCount: number): GameColor {
    if (!guess) return '';
    if (correctLetterCount === 0) return 'red';
    if (guess === gameWord) return 'green';
    
    const letter = guess[index];
    const wasInZeroScoreGuess = guessHistory.some(g => 
      g.includes(letter) && 
      getCorrectLetterCount(g, gameWord) === 0
    );
    
    return wasInZeroScoreGuess ? 'red' : 'orange';
  }

  function renderGuessGrid() {
    return (
      <div className={styles.guessGrid}>
        {Array(8).fill(null).map((_, rowIndex) => {
          const isCurrentRow = 8 - guessesRemaining === rowIndex;
          const guess = guessHistory[rowIndex] || '';
          const correctLetterCount = guess ? getCorrectLetterCount(guess, gameWord) : '';
          
          return (
            <div 
              key={rowIndex} 
              className={`${styles.guessRow} ${guess === gameWord ? styles.correct : ''}`}
            >
              {Array(4).fill(null).map((_, colIndex) => (
                <div 
                  key={colIndex}
                  className={`${styles.letter} ${guess ? styles.guessed : ''} ${
                    guess ? styles[getLetterColor(guess, colIndex, correctLetterCount as number)] : ''
                  }`}
                >
                  {isCurrentRow ? currentGuess[colIndex] : guess[colIndex]}
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
      setShowEndModal(false);
      setCurrentGuess('');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerContainer}>
        <h1>{gameTitle}</h1>
        <div className={styles.headerButtons}>
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
            <p>You can click on the letters to mark them as:</p>
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

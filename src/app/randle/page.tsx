// page.tsx (Randle)
'use client';

import { useState, useEffect } from 'react';
import { WordGame } from '@/components/WordGame';
import { words, validGuesses, getRandomWord } from '@/utils/words';
import styles from './page.module.css';

export default function RandlePage() {
  const [randomWord, setRandomWord] = useState('');
  const [cacheKey, setCacheKey] = useState('');

  useEffect(() => {
    // Initialize the game with a random word and cache key
    const initializeGame = () => {
      const word = getRandomWord(words);
      const newCacheKey = `randle-${word}`;
      setRandomWord(word);
      setCacheKey(newCacheKey);
    };

    // Only initialize if there's no game in progress
    const existingGame = localStorage.getItem('current-randle-game');
    if (existingGame) {
      const { word } = JSON.parse(existingGame);
      setRandomWord(word);
      setCacheKey(`randle-${word}`);
    } else {
      initializeGame();
    }
  }, []);
  
  const handleNewGame = () => {
    const newWord = getRandomWord(words);
    const newCacheKey = `randle-${newWord}`;
    
    // Clear the old game's cache
    localStorage.removeItem('current-randle-game');
    localStorage.removeItem(cacheKey);
    
    // Set up the new game
    setRandomWord(newWord);
    setCacheKey(newCacheKey);
    
    // Store the new game's word
    localStorage.setItem('current-randle-game', JSON.stringify({ word: newWord }));
  };

  if (!randomWord || !cacheKey) return null; // Wait for initialization

  return (
    <div className={styles.container}>
      <WordGame 
        gameWord={randomWord}
        onNewGame={handleNewGame}
        gameTitle="Randle!"
        alternateGamePath="/hardle"
        alternateGameName="Hardle"
        isDaily={false}
        validGuesses={validGuesses}
        cacheKey={cacheKey}
      />
    </div>
  );
}

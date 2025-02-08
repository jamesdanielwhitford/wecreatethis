// page.tsx (Randle)
'use client';

import { useState, useEffect } from 'react';
import { WordGame } from '@/components/WordGame';
import { words, validGuesses, getRandomWord } from '@/utils/words';
import styles from './page.module.css';

const CURRENT_GAME_KEY = 'current-randle-game';

export default function RandlePage() {
  const [randomWord, setRandomWord] = useState('');
  const [cacheKey, setCacheKey] = useState('');

  useEffect(() => {
    const initializeGame = () => {
      try {
        // First, try to get an existing game from localStorage
        const savedGame = localStorage.getItem(CURRENT_GAME_KEY);
        
        if (savedGame) {
          // If there's a saved game, use that word
          const { word } = JSON.parse(savedGame);
          console.log('Restoring saved game with word:', word);
          setRandomWord(word);
          setCacheKey(`randle-${word}`);
        } else {
          // If no saved game, create a new one
          const newWord = getRandomWord(words);
          console.log('Starting new game with word:', newWord);
          setRandomWord(newWord);
          setCacheKey(`randle-${newWord}`);
          // Save the new game
          localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify({ word: newWord }));
        }
      } catch (error) {
        // If there's any error, start a fresh game
        console.error('Error initializing game:', error);
        const newWord = getRandomWord(words);
        setRandomWord(newWord);
        setCacheKey(`randle-${newWord}`);
        localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify({ word: newWord }));
      }
    };

    initializeGame();
  }, []); // Empty dependency array means this only runs once on mount
  
  const handleNewGame = () => {
    const newWord = getRandomWord(words);
    const newCacheKey = `randle-${newWord}`;
    
    // Clear both the game cache and the current game storage
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(CURRENT_GAME_KEY);
    
    // Set up the new game
    setRandomWord(newWord);
    setCacheKey(newCacheKey);
    
    // Store the new game's word
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify({ word: newWord }));
  };

  if (!randomWord || !cacheKey) return null;

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
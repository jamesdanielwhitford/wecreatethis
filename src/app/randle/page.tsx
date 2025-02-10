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
        const savedGame = localStorage.getItem(CURRENT_GAME_KEY);
        if (savedGame) {
          const { word } = JSON.parse(savedGame);
          setRandomWord(word);
          setCacheKey(`randle-${word}`);
        } else {
          const newWord = getRandomWord(words);
          setRandomWord(newWord);
          setCacheKey(`randle-${newWord}`);
          localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify({ word: newWord }));
        }
      } catch (error) {
        console.error('Error initializing game:', error);
        const newWord = getRandomWord(words);
        setRandomWord(newWord);
        setCacheKey(`randle-${newWord}`);
        localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify({ word: newWord }));
      }
    };
    initializeGame();
  }, []);

  const handleNewGame = () => {
    const newWord = getRandomWord(words);
    const newCacheKey = `randle-${newWord}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(CURRENT_GAME_KEY);
    setRandomWord(newWord);
    setCacheKey(newCacheKey);
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
'use client';

import { useState } from 'react';
import { WordGame } from '@/components/WordGame';
import { words, getRandomWord } from '@/utils/words';
import styles from './page.module.css';

export default function RandlePage() {
  const [randomWord, setRandomWord] = useState(() => getRandomWord(words));
  
  const handleNewGame = () => {
    setRandomWord(getRandomWord(words));
  };

  return (
    <div className={styles.container}>
      <WordGame 
        gameWord={randomWord}
        onNewGame={handleNewGame}
        gameTitle="Randle!"
        alternateGamePath="/hardle"
        alternateGameName="Hardle"
        isDaily={false}
      />
    </div>
  );
}
'use client';

import { WordGame } from '@/components/WordGame';
import { words, validGuesses, getDailyWord } from '@/utils/words';
import styles from './page.module.css';

export default function HardleGame() {
  const dailyWord = getDailyWord(words);
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `hardle-${today}`;
  
  return (
      <WordGame
        gameWord={dailyWord}
        gameTitle="Hardle!"
        alternateGamePath="/randle"
        alternateGameName="Randle"
        isDaily={true}
        validGuesses={validGuesses}
        cacheKey={cacheKey}
      />
  );
}

// page.tsx (Hardle)
'use client';

import { WordGame } from '@/components/WordGame';
import { words, validGuesses, getDailyWord } from '@/utils/words';
import styles from './page.module.css';

export default function HardlePage() {
  const dailyWord = getDailyWord(words);
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const cacheKey = `hardle-${today}`; // Include date in cache key for daily puzzle
  
  return (
    <div className={styles.container}>
      <WordGame 
        gameWord={dailyWord}
        gameTitle="Hardle!"
        alternateGamePath="/randle"
        alternateGameName="Randle"
        isDaily={true}
        validGuesses={validGuesses}
        cacheKey={cacheKey}
      />
    </div>
  );
}

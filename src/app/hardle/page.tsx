'use client';

import { WordGame } from '@/components/WordGame';
import { words, validGuesses, getDailyWord } from '@/utils/words';
import styles from './page.module.css';

export default function HardlePage() {
  const dailyWord = getDailyWord(words);
  
  return (
    <div className={styles.container}>
      <WordGame 
        gameWord={dailyWord}
        gameTitle="Hardle!"
        alternateGamePath="/randle"
        alternateGameName="Randle"
        isDaily={true}
        validGuesses={validGuesses}
      />
    </div>
  );
}

// src/app/rankings/page.tsx (Updated)
'use client';

import React, { useState } from 'react';
import HighScoreBoard from '../../utils/components/HighScoreBoard';
import { GameType } from '../../utils/firebase/types';
import styles from './page.module.css';

// Define interfaces for our data structures
interface GameOption {
  id: string;
  name: string;
  options: {
    scoreOrder?: 'asc' | 'desc';
    category?: string;
    wordGameType?: string;
  };
}

interface Game {
  id: GameType;
  name: string;
  options: GameOption[];
}

// Type-safe games array
const games: Game[] = [
  { 
    id: 'survivorPuzzle', 
    name: 'Survivor Puzzle', 
    options: [
      { id: 'default', name: 'Best Times', options: { scoreOrder: 'asc' } }
    ]
  },
  { 
    id: 'fifteenPuzzle', 
    name: '15 Puzzle', 
    options: [
      { id: 'daily', name: 'Daily Puzzle', options: {} }
    ]
  },
  { 
    id: 'picturePuzzle', 
    name: 'Picture Puzzle', 
    options: [
      { id: 'animals', name: 'Animals', options: { category: 'animals' } },
      { id: 'artworks', name: 'Artworks', options: { category: 'artworks' } }
    ]
  },
  {
    id: 'wordGame',
    name: 'Word Game',
    options: [
      { id: 'hardle', name: 'Hardle', options: { wordGameType: 'hardle' } },
      { id: 'randle', name: 'Randle', options: { wordGameType: 'randle' } }
    ]
  }
];

const RankingsPage: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<Game>(games[0]);
  const [selectedOption, setSelectedOption] = useState<GameOption>(games[0].options[0]);
  
  // Handle game change
  const handleGameChange = (gameId: string) => {
    const game = games.find(g => g.id === gameId) || games[0];
    setSelectedGame(game);
    setSelectedOption(game.options[0]);
  };
  
  // Handle option change
  const handleOptionChange = (optionId: string) => {
    const option = selectedGame.options.find(o => o.id === optionId) || selectedGame.options[0];
    setSelectedOption(option);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Game Rankings</h1>
      
      <div className={styles.selectors}>
        <div className={styles.gameSelector}>
          <label htmlFor="game-select" className={styles.label}>Game:</label>
          <select 
            id="game-select" 
            className={styles.select}
            value={selectedGame.id}
            onChange={(e) => handleGameChange(e.target.value)}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedGame.options.length > 1 && (
          <div className={styles.optionSelector}>
            <label htmlFor="option-select" className={styles.label}>Mode:</label>
            <select 
              id="option-select" 
              className={styles.select}
              value={selectedOption.id}
              onChange={(e) => handleOptionChange(e.target.value)}
            >
              {selectedGame.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className={styles.highScoreContainer}>
        <HighScoreBoard 
          gameType={selectedGame.id}
          options={selectedOption.options}
          title={`${selectedGame.name} - ${selectedOption.name}`}
        />
      </div>
      
      <div className={styles.footer}>
        <p>All scores reset weekly, except the all-time high score.</p>
        <a href="/" className={styles.backLink}>Back to Games</a>
      </div>
    </div>
  );
};

export default RankingsPage;
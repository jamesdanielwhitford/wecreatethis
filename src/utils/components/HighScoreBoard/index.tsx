// src/utils/components/HighScoreBoard/index.tsx (Updated)
import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { highScoreService } from '../../firebase/highScoreService';
import { HighScore, SurvivorPuzzleHighScore, GameType } from '../../firebase/types';

interface HighScoreBoardProps {
  gameType: GameType;
  options?: {
    scoreOrder?: 'asc' | 'desc';
    category?: string;
    wordGameType?: string;
  };
  title?: string;
  // Add new prop for the newly submitted score ID
  newScoreId?: string;
}

const HighScoreBoard: React.FC<HighScoreBoardProps> = ({ 
  gameType, 
  options = {}, 
  title = 'HIGH SCORES',
  newScoreId 
}) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchHighScores = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const scores = await highScoreService.getHighScores(gameType, options);
        setHighScores(scores);
      } catch (error) {
        console.error('Error fetching high scores:', error);
        setError('Failed to load high scores. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighScores();
  }, [gameType, options]);
  
  // Format date from timestamp
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Get rank text with ties handled properly
  const getRankText = (index: number, score: HighScore, prevScore?: HighScore): string => {
    // First place is always #1
    if (index === 0) return '1';
    
    // Check if this score equals the previous score
    if (prevScore && score.score === prevScore.score) {
      // For SurvivorPuzzle, also check moves for true ties
      if (gameType === 'survivorPuzzle') {
        const currentScoreWithMoves = score as SurvivorPuzzleHighScore;
        const prevScoreWithMoves = prevScore as SurvivorPuzzleHighScore;
        
        // If both time and moves match, it's a true tie
        if (currentScoreWithMoves.moves === prevScoreWithMoves.moves) {
          // Use the previous rank for a tie
          return getRankText(index - 1, prevScore, highScores[index - 2]);
        }
      } else {
        // For other games, just check the score
        return getRankText(index - 1, prevScore, highScores[index - 2]);
      }
    }
    
    // If not a tie, use the 1-based index
    return (index + 1).toString();
  };
  
  // Get CSS class for the row based on rank and if it's the newly submitted score
  const getRowClass = (index: number, score: HighScore, prevScore?: HighScore): string => {
    let rowClass = styles.scoreRow;
    
    // Add all-time high class if applicable
    if (score.isAllTimeHigh) {
      rowClass += ` ${styles.allTimeHigh}`;
    }
    
    // Add newly submitted score class if this is the user's newly submitted score
    if (score.id === newScoreId) {
      rowClass += ` ${styles.newScore}`;
    }
    
    // Add place classes for top 3
    const rank = parseInt(getRankText(index, score, prevScore));
    if (rank === 1) rowClass += ` ${styles.firstPlace}`;
    else if (rank === 2) rowClass += ` ${styles.secondPlace}`;
    else if (rank === 3) rowClass += ` ${styles.thirdPlace}`;
    
    return rowClass;
  };
  
  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.loading}>Loading high scores...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.loading}>{error}</div>
      </div>
    );
  }
  
  if (highScores.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.noScores}>No high scores yet. Be the first!</div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <table className={styles.scoreTable}>
        <thead>
          <tr>
            <th className={styles.rankColumn}>Rank</th>
            <th className={styles.nameColumn}>Name</th>
            <th className={styles.scoreColumn}>
              {gameType === 'survivorPuzzle' ? 'Time' : 'Score'}
            </th>
            {gameType === 'survivorPuzzle' && (
              <th className={styles.movesColumn}>Moves</th>
            )}
            <th className={styles.dateColumn}>Date</th>
          </tr>
        </thead>
        <tbody>
          {highScores.map((score, index) => (
            <tr 
              key={score.id || index} 
              className={getRowClass(index, score, index > 0 ? highScores[index - 1] : undefined)}
            >
              <td className={styles.rankColumn}>
                {getRankText(index, score, index > 0 ? highScores[index - 1] : undefined)}
              </td>
              <td className={styles.nameColumn}>{score.name}</td>
              <td className={styles.scoreColumn}>{score.formattedScore || score.score}</td>
              {gameType === 'survivorPuzzle' && (
                <td className={styles.movesColumn}>
                  {(score as SurvivorPuzzleHighScore).moves || '-'}
                </td>
              )}
              <td className={styles.dateColumn}>{formatDate(score.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HighScoreBoard;
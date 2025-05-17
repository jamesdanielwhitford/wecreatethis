// src/utils/components/HighScoreBoard/index.tsx
import React, { useEffect, useState } from 'react';
import { HighScore, GameType } from '../../firebase/types';
import { highScoreService } from '../../firebase/highScoreService';
import styles from './styles.module.css';

// Define HighScoreOptions interface to match the one in highScoreService
interface HighScoreOptions {
  scoreOrder?: 'asc' | 'desc';
  category?: string;
  wordGameType?: string;
}

interface HighScoreBoardProps {
  gameType: GameType;
  options?: HighScoreOptions;
  title?: string;
}

const HighScoreBoard: React.FC<HighScoreBoardProps> = ({ 
  gameType, 
  options = {}, 
  title = 'HIGH SCORES' 
}) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchHighScores = async () => {
      setLoading(true);
      try {
        const scores = await highScoreService.getHighScores(gameType, options);
        setHighScores(scores);
      } catch (error) {
        console.error('Error fetching high scores:', error);
        setHighScores([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighScores();
  }, [gameType, options]);
  
  // Format date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.loading}>Loading high scores...</div>
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
      
      {loading ? (
        <div className={styles.loading}>Loading high scores...</div>
      ) : highScores.length === 0 ? (
        <div className={styles.noScores}>No high scores yet. Be the first!</div>
      ) : (
        <table className={styles.scoreTable}>
          <thead>
            <tr>
              <th className={styles.rankColumn}>#</th>
              <th className={styles.nameColumn}>NAME</th>
              <th className={styles.scoreColumn}>SCORE</th>
              <th className={styles.dateColumn}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {highScores.map((score, index) => (
              <tr 
                key={score.id || index} 
                className={`
                  ${styles.scoreRow} 
                  ${score.isAllTimeHigh ? styles.allTimeHigh : ''}
                  ${index === 0 ? styles.firstPlace : ''}
                  ${index === 1 ? styles.secondPlace : ''}
                  ${index === 2 ? styles.thirdPlace : ''}
                `}
              >
                <td className={styles.rankColumn}>{index + 1}</td>
                <td className={styles.nameColumn}>{score.name}</td>
                <td className={styles.scoreColumn}>{score.formattedScore}</td>
                <td className={styles.dateColumn}>{formatDate(score.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HighScoreBoard;
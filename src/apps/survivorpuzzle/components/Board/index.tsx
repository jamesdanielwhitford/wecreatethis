// src/apps/survivorpuzzle/components/Board/index.tsx
import React from 'react';
import styles from './styles.module.css';

interface BoardProps {
  rows: number[][];
  currentNumber: number | null;
  onRowClick: (rowIndex: number) => void;
  timeRemaining: number;
  isComplete: boolean;
  isTimeout: boolean;
  isCountUp: boolean;
}

const Board: React.FC<BoardProps> = ({
  rows,
  currentNumber,
  onRowClick,
  timeRemaining,
  isComplete,
  isTimeout,
  isCountUp
}) => {
  // Format time as MM:SS
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.boardContainer}>
      <div className={`${styles.timer} ${isTimeout ? styles.timeout : ''} ${isComplete ? styles.complete : ''} ${isCountUp ? styles.countUp : ''}`}>
        {isCountUp ? `⏱️ ${formatTime(timeRemaining)}` : `⏳ ${formatTime(timeRemaining)}`}
      </div>
      
      <div className={styles.board}>
        {rows.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className={styles.row}
            onClick={() => onRowClick(rowIndex)}
          >
            {row.map((number, cellIndex) => (
              <div key={cellIndex} className={styles.cell}>
                {number}
              </div>
            ))}
            {/* Add empty cells if row has less than 5 numbers */}
            {Array.from({ length: 5 - row.length }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.cell} ${styles.emptyCell}`}></div>
            ))}
          </div>
        ))}
      </div>
      
      <div className={styles.currentNumberContainer}>
        <div className={`${styles.currentNumber} ${currentNumber === null ? styles.empty : ''}`}>
          {currentNumber !== null ? currentNumber : ''}
        </div>
      </div>
      
      {isComplete && (
        <div className={styles.completeBanner}>
          Puzzle Solved!
        </div>
      )}
      
      {isTimeout && (
        <div className={styles.timeoutBanner}>
          Time&apos;s Up!
        </div>
      )}
    </div>
  );
};

export default Board;
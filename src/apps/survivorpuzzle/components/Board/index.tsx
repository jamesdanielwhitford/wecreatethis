// src/apps/survivorpuzzle/components/Board/index.tsx (Updated)
import React from 'react';
import styles from './styles.module.css';

interface BoardProps {
  rows: number[][];
  currentNumber: number | null;
  onRowClick: (rowIndex: number) => void;
  timeElapsed: number;
  isComplete: boolean;
}

const Board: React.FC<BoardProps> = ({
  rows,
  currentNumber,
  onRowClick,
  timeElapsed,
  isComplete
}) => {
  // Format time as MM:SS.MS
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10); // Get hundredths of a second
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.boardContainer}>
      <div className={`${styles.timer} ${isComplete ? styles.complete : ''}`}>
        ⏱️ {formatTime(timeElapsed)}
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
    </div>
  );
};

export default Board;
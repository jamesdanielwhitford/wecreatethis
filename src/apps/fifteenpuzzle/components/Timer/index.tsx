// src/apps/fifteenpuzzle/components/Timer/index.tsx

import React from 'react';
import { TimerProps } from '../../types/game.types';
import { formatTime } from '../../utils/generatePuzzle';
import styles from './styles.module.css';

const Timer: React.FC<TimerProps> = ({ elapsedTime, isRunning, isPaused, onTimerClick }) => {
  return (
    <div 
      className={`
        ${styles.timer} 
        ${isRunning ? styles.running : ''} 
        ${isPaused ? styles.paused : ''}
      `}
      onClick={onTimerClick}
    >
      {isPaused ? (
        <div className={styles.pauseIcon}>⏵</div>
      ) : isRunning ? (
        <div className={styles.pauseIcon}>⏸</div>
      ) : null}
      <span className={styles.timeDisplay}>{formatTime(elapsedTime)}</span>
    </div>
  );
};

export default Timer;
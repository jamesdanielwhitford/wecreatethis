// src/apps/fifteenpuzzle/components/Timer/index.tsx

import React from 'react';
import { formatTime } from '../../utils/generatePuzzle';
import styles from './styles.module.css';

interface TimerProps {
  elapsedTime: number;
  isRunning: boolean;
}

const Timer: React.FC<TimerProps> = ({ elapsedTime, isRunning }) => {
  return (
    <div className={`${styles.timer} ${isRunning ? styles.running : ''}`}>
      <span className={styles.timeDisplay}>{formatTime(elapsedTime)}</span>
    </div>
  );
};

export default Timer;
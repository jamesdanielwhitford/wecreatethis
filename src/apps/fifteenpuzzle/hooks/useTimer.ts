// src/apps/fifteenpuzzle/hooks/useTimer.ts

import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '../types/game.types';

export const useTimer = (
  startTime: number | null,
  isComplete: boolean,
  // isPaused: boolean, // Keeping for compatibility but not using
  // pausedTime: number  // Keeping for compatibility but not using
) => {
  const [timerState, setTimerState] = useState<TimerState>({
    elapsedTime: 0,
    isRunning: false
  });

  // Update timer every 100ms
  useEffect(() => {
    if (!startTime || isComplete) {
      // If game is complete, leave timer at final value
      if (isComplete) {
        setTimerState(prev => ({
          ...prev,
          isRunning: false
        }));
      }
      return;
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = now - startTime;
      
      // Always count up, no pausing
      setTimerState({
        elapsedTime: elapsedSinceStart,
        isRunning: true
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [startTime, isComplete]);

  // Reset the timer
  const resetTimer = useCallback(() => {
    setTimerState({
      elapsedTime: 0,
      isRunning: false
    });
  }, []);

  return {
    timerState,
    resetTimer
  };
};
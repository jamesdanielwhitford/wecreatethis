// src/apps/survivorpuzzle/hooks/useTimer.ts (Updated)
import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '../types/game.types';

export const useTimer = (
  startTime: number | null,
  isComplete: boolean,
  isPaused: boolean,
  pausedTime: number
) => {
  const [timerState, setTimerState] = useState<TimerState>({
    elapsedTime: 0,
    isRunning: false
  });

  // Update timer every 100ms
  useEffect(() => {
    if (!startTime || isComplete) {
      return;
    }

    // If paused, don't setup the timer
    if (isPaused) {
      setTimerState(prev => ({
        ...prev,
        isRunning: false
      }));
      return;
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = now - startTime;
      const totalPauseTime = pausedTime > 0 ? now - pausedTime : 0;
      const actualElapsed = elapsedSinceStart - totalPauseTime;
      
      // Always count up
      setTimerState({
        elapsedTime: actualElapsed,
        isRunning: true
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [startTime, isComplete, isPaused, pausedTime]);

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
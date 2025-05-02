import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '../types/game.types';

export const useTimer = (
  startTime: number | null,
  isComplete: boolean,
  isPaused: boolean,
  pausedTime: number,
  timeLimit: number,
  onTimeout: () => void
) => {
  const [timerState, setTimerState] = useState<TimerState>({
    elapsedTime: 0,
    isRunning: false
  });

  // Update timer every 100ms
  useEffect(() => {
    if (!startTime || isComplete || isPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = now - startTime;
      const totalPauseTime = isPaused ? now - pausedTime : 0;
      const actualElapsed = elapsedSinceStart - totalPauseTime;
      
      setTimerState({
        elapsedTime: actualElapsed,
        isRunning: true
      });

      // Check if time limit has been reached
      if (actualElapsed >= timeLimit) {
        clearInterval(intervalId);
        onTimeout();
        setTimerState(prev => ({
          ...prev,
          isRunning: false
        }));
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [startTime, isComplete, isPaused, pausedTime, timeLimit, onTimeout]);

  // Reset the timer
  const resetTimer = useCallback(() => {
    setTimerState({
      elapsedTime: 0,
      isRunning: false
    });
  }, []);

  // Return time remaining instead of elapsed time
  const timeRemaining = Math.max(0, timeLimit - timerState.elapsedTime);

  return {
    timerState: {
      ...timerState,
      elapsedTime: timeRemaining
    },
    resetTimer
  };
};
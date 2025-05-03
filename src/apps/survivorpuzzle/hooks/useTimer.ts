// src/apps/survivorpuzzle/hooks/useTimer.ts
import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '../types/game.types';

export const useTimer = (
  startTime: number | null,
  isComplete: boolean,
  isPaused: boolean,
  pausedTime: number,
  timeLimit: number | null,
  onTimeout: () => void
) => {
  const [timerState, setTimerState] = useState<TimerState>({
    elapsedTime: 0,
    isRunning: false,
    isCountUp: timeLimit === null
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
      
      // For 'none' difficulty, always count up
      if (timeLimit === null) {
        setTimerState({
          elapsedTime: actualElapsed,
          isRunning: true,
          isCountUp: true
        });
      } else {
        // For timed difficulties, count down
        const remaining = Math.max(0, timeLimit - actualElapsed);
        setTimerState({
          elapsedTime: remaining,
          isRunning: true,
          isCountUp: false
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
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [startTime, isComplete, isPaused, pausedTime, timeLimit, onTimeout]);

  // Reset the timer
  const resetTimer = useCallback(() => {
    setTimerState({
      elapsedTime: 0,
      isRunning: false,
      isCountUp: timeLimit === null
    });
  }, [timeLimit]);

  return {
    timerState,
    resetTimer
  };
};
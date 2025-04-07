// src/apps/fifteenpuzzle/hooks/useTimer.ts

import { useState, useEffect, useRef } from 'react';
import { TimerState } from '../types/game.types';

export const useTimer = (
  isGameStarted: boolean, 
  isGameComplete: boolean,
  isPaused: boolean,
  pausedTime: number
) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    currentTime: Date.now(), // Initialize with current time
    elapsedTime: 0,
    isPaused: false
  });
  
  // Use a ref to track interval ID
  const intervalRef = useRef<number | null>(null);

  // Keep a ref to the last calculated time to prevent display glitches
  const lastTimeRef = useRef<number>(0);
  
  // Start the timer when the game starts
  useEffect(() => {
    if (isGameStarted && !timerState.isRunning && !isGameComplete && !isPaused) {
      const now = Date.now();
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: now - pausedTime, // Account for paused time
        currentTime: now,
        elapsedTime: pausedTime, // Initialize with existing paused time
        isPaused: false
      }));
      lastTimeRef.current = pausedTime;
    }
  }, [isGameStarted, timerState.isRunning, isGameComplete, isPaused, pausedTime]);

  // Handle pausing
  useEffect(() => {
    if (isPaused && timerState.isRunning) {
      // When pausing, save the current elapsed time to prevent jumps
      const currentElapsed = timerState.startTime 
        ? Date.now() - timerState.startTime 
        : 0;
      
      lastTimeRef.current = currentElapsed;
      
      // Pause the timer
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: true,
        elapsedTime: currentElapsed
      }));
    } else if (!isPaused && isGameStarted && !isGameComplete && timerState.isPaused) {
      // On resume, use the saved elapsed time as the basis
      const now = Date.now();
      const newStartTime = now - lastTimeRef.current;
      
      // Resume the timer
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        isPaused: false,
        startTime: newStartTime,
        currentTime: now,
        elapsedTime: lastTimeRef.current
      }));
    }
  }, [isPaused, isGameStarted, isGameComplete, timerState.isPaused, timerState.isRunning, timerState.startTime, pausedTime]);

  // Stop the timer when the game is complete
  useEffect(() => {
    if (isGameComplete && timerState.isRunning) {
      const finalElapsed = timerState.startTime 
        ? Date.now() - timerState.startTime 
        : 0;
      
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        elapsedTime: finalElapsed
      }));
      
      lastTimeRef.current = finalElapsed;
    }
  }, [isGameComplete, timerState.isRunning, timerState.startTime]);

  // Update the timer every 100ms while it's running
  useEffect(() => {
    if (!timerState.isRunning) {
      // Clear interval if timer isn't running
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const newElapsed = timerState.startTime ? now - timerState.startTime : 0;
      
      // Only update if the time has actually changed by at least 50ms
      if (Math.abs(newElapsed - lastTimeRef.current) >= 50) {
        lastTimeRef.current = newElapsed;
        
        setTimerState(prev => ({
          ...prev,
          currentTime: now,
          elapsedTime: newElapsed
        }));
      }
    }, 100);

    // Clean up interval on unmount or when timer stops
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.startTime]);

  const resetTimer = () => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    lastTimeRef.current = 0;
    
    setTimerState({
      isRunning: false,
      startTime: null,
      currentTime: Date.now(),
      elapsedTime: 0,
      isPaused: false
    });
  };

  return {
    timerState,
    resetTimer
  };
};
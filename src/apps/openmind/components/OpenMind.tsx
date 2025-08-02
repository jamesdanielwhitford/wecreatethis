// src/apps/openmind/components/OpenMind.tsx
"use client"

import React, { useState } from 'react';
import { ViewMode, OpenMindEntry } from '../types/openmind.types';
import { useOpenMindEntries } from '../hooks/useOpenMindEntries';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import VoiceRecorder from './VoiceRecorder';
import DayView from './DayView';
import MonthView from './MonthView';
import YearView from './YearView';
import NoteViewer from './NoteViewer';
import styles from './OpenMind.module.css';

const OpenMind: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedNote, setSelectedNote] = useState<OpenMindEntry | null>(null);
  
  const { entries, loading, error, refreshEntries } = useOpenMindEntries(currentDate, viewMode);
  const { recording, startRecording, stopRecording, duration } = useVoiceRecording({
    onRecordingComplete: async (audioBlob) => {
      // This will be handled by the API endpoint
      await handleVoiceNoteSubmit(audioBlob);
    }
  });

  const handleVoiceNoteSubmit = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.wav');
      formData.append('date', currentDate.toISOString());

      const response = await fetch('/api/openmind/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process voice note');
      }

      // Refresh entries to show new notes
      refreshEntries();
    } catch (error) {
      console.error('Error submitting voice note:', error);
    }
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'next') return; // No future navigation allowed
    
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    if (viewMode !== 'day') {
      setViewMode('day');
    }
  };

  const handleEntryClick = (entryId: string) => {
    // Find the note and show it in the viewer
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setSelectedNote(entry);
    }
  };

  const formatCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: viewMode === 'day' ? 'long' : undefined,
      year: 'numeric',
      month: viewMode === 'year' ? undefined : 'long',
      day: viewMode === 'year' ? undefined : 'numeric',
    };
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  if (selectedNote) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>OpenMind</h1>
            <button 
              className={styles.navButton}
              onClick={() => setSelectedNote(null)}
            >
              ← Back
            </button>
          </div>
        </div>
        <div className={styles.main}>
          <NoteViewer 
            note={selectedNote} 
            onClose={() => setSelectedNote(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>OpenMind</h1>
          <div className={styles.viewModeButtons}>
            {(['day', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={`${styles.viewModeButton} ${viewMode === mode ? styles.active : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.navigation}>
          <button
            className={styles.navButton}
            onClick={() => handleDateNavigation('prev')}
          >
            ← Previous
          </button>
          
          <div className={styles.currentDate}>
            {formatCurrentDate()}
          </div>
          
          <button
            className={styles.navButton}
            disabled={true}
          >
            Next →
          </button>
        </div>

        <div className={styles.content}>
          {viewMode === 'day' && isToday() && (
            <VoiceRecorder
              recording={recording}
              duration={duration}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          )}

          {loading && (
            <div className={styles.loading}>Loading entries...</div>
          )}

          {error && (
            <div className={styles.error}>Error: {error}</div>
          )}

          {!loading && !error && (
            <>
              {viewMode === 'day' && (
                <DayView
                  entries={entries}
                  date={currentDate}
                  onEntryClick={handleEntryClick}
                />
              )}
              
              {viewMode === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  onDateSelect={handleDateSelect}
                />
              )}
              
              {viewMode === 'year' && (
                <YearView
                  currentDate={currentDate}
                  onMonthSelect={(month) => {
                    const newDate = new Date(currentDate.getFullYear(), month, 1);
                    setCurrentDate(newDate);
                    setViewMode('month');
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenMind;
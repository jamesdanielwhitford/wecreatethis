// src/apps/openmind/components/DayView/index.tsx

import React from 'react';
import { OpenMindEntry } from '../../types/openmind.types';
import styles from './styles.module.css';

interface DayViewProps {
  entries: OpenMindEntry[];
  date: Date;
  onEntryClick: (entryId: string) => void;
}

const DayView: React.FC<DayViewProps> = ({ entries, date, onEntryClick }) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (entries.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Today&apos;s Entries</h3>
        </div>
        <div className={styles.noEntries}>
          No voice notes recorded for this day.
          {date.toDateString() === new Date().toDateString() && (
            <p>Record your first voice note above!</p>
          )}
        </div>
      </div>
    );
  }

  // Group entries by original note
  const groupedEntries = entries.reduce((groups, entry) => {
    const key = entry.originalNoteId || entry.id;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
    return groups;
  }, {} as Record<string, OpenMindEntry[]>);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Today&apos;s Entries</h3>
        <div className={styles.entryCount}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>
      
      <div className={styles.entryGroups}>
        {Object.values(groupedEntries).map((group) => {
          const originalNote = group.find(e => e.type === 'original');
          const topicNotes = group.filter(e => e.type === 'topic');
          
          return (
            <div key={originalNote?.id || group[0].id} className={styles.entryGroup}>
              {originalNote && (
                <div 
                  className={`${styles.entry} ${styles.originalEntry}`}
                  onClick={() => onEntryClick(originalNote.id)}
                >
                  <div className={styles.entryHeader}>
                    <div className={styles.entryTitle}>{originalNote.title}</div>
                    <div className={styles.entryTime}>
                      {formatTime(originalNote.created_at)}
                    </div>
                  </div>
                  <div className={styles.entryType}>
                    <span className={styles.typeTag}>🎤 Voice Note</span>
                  </div>
                </div>
              )}
              
              {topicNotes.length > 0 && (
                <div className={styles.topicNotes}>
                  {topicNotes.map((topic) => (
                    <div 
                      key={topic.id}
                      className={`${styles.entry} ${styles.topicEntry}`}
                      onClick={() => onEntryClick(topic.id)}
                    >
                      <div className={styles.entryHeader}>
                        <div className={styles.entryTitle}>{topic.title}</div>
                        <div className={styles.entryTime}>
                          {formatTime(topic.created_at)}
                        </div>
                      </div>
                      <div className={styles.entryType}>
                        <span className={styles.typeTag}>📝 {topic.topicName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
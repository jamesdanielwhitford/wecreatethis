// src/apps/openmind/components/NoteViewer/index.tsx

import React from 'react';
import { OpenMindEntry } from '../../types/openmind.types';
import styles from './styles.module.css';

interface NoteViewerProps {
  note: OpenMindEntry;
  onClose: () => void;
}

const NoteViewer: React.FC<NoteViewerProps> = ({ note, onClose }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const { date, time } = formatDateTime(note.created_at);

  const getTypeInfo = () => {
    if (note.type === 'original') {
      return {
        icon: '🎤',
        label: 'Voice Note',
        description: 'Original voice recording',
        className: styles.originalType,
      };
    } else {
      return {
        icon: '📝',
        label: note.topicName || 'Topic',
        description: 'Extracted topic',
        className: styles.topicType,
      };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.closeButton} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        
        <div className={styles.noteInfo}>
          <div className={`${styles.typeTag} ${typeInfo.className}`}>
            <span className={styles.typeIcon}>{typeInfo.icon}</span>
            <span className={styles.typeLabel}>{typeInfo.label}</span>
          </div>
          <div className={styles.dateTime}>
            <div className={styles.date}>{date}</div>
            <div className={styles.time}>{time}</div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{note.title}</h1>
        
        <div className={styles.noteContent}>
          {note.content.split('\n').map((paragraph, index) => (
            <p key={index} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.wordCount}>
          {note.content.split(' ').length} words
        </div>
        
        {note.type === 'topic' && note.originalNoteId && (
          <div className={styles.relationInfo}>
            <span className={styles.relationLabel}>From voice note</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteViewer;
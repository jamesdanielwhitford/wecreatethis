// src/apps/beautifulmind/components/NoteView/index.tsx

import React from 'react';
import { Note } from '../../types/notes.types';
import styles from './styles.module.css';

interface NoteViewProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

const NoteView: React.FC<NoteViewProps> = ({ note, onEdit, onDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.noteView}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{note.title || 'Untitled'}</h2>
          <div className={styles.metadata}>
            <span>Created: {formatDate(note.created_at)}</span>
            {note.updated_at !== note.created_at && (
              <span> • Updated: {formatDate(note.updated_at)}</span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.editButton}
            onClick={onEdit}
            aria-label="Edit note"
          >
            Edit
          </button>
          <button
            className={styles.deleteButton}
            onClick={onDelete}
            aria-label="Delete note"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        {note.content.split('\n').map((paragraph, index) => (
          paragraph.trim() ? (
            <p key={index} className={styles.paragraph}>
              {paragraph}
            </p>
          ) : (
            <br key={index} />
          )
        ))}
      </div>
    </div>
  );
};

export default NoteView;
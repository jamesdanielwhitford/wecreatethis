import React from 'react';
import styles from './NoteList.module.css';
import { Note } from '../types';
import Image from 'next/image';

interface NoteListProps {
  notes: Note[];
  onCreateNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  onCreateNote, 
  onEditNote, 
  onDeleteNote 
}) => {
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={styles.noteListContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>All Notes</h2>
        <button 
          className={styles.createButton}
          onClick={onCreateNote}
        >
          New Note
        </button>
      </div>
      
      {sortedNotes.length > 0 ? (
        <div className={styles.noteGrid}>
          {sortedNotes.map(note => (
            <div 
              key={note.id} 
              className={styles.noteCard}
              onClick={() => onEditNote(note)}
            >
              <div className={styles.noteContent}>
                {note.type === 'image' && note.imageData && (
                  <div className={styles.imagePreview}>
                    <Image 
                      src={note.imageData} 
                      alt="Note" 
                      width={300}
                      height={200}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                <h3 className={styles.noteTitle}>{note.title}</h3>
                {note.type === 'text' && (
                  <p className={styles.noteText}>{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
                )}
                <div className={styles.noteFooter}>
                  <div className={styles.noteDate}>
                    {formatDate(note.updatedAt)}
                  </div>
                  <div className={styles.noteTags}>
                    {note.tags.map(tag => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                className={styles.deleteButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this note?')) {
                    onDeleteNote(note.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No notes yet. Create your first note to get started!</p>
        </div>
      )}
    </div>
  );
};
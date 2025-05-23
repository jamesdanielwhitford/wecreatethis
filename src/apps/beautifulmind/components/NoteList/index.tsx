// src/apps/beautifulmind/components/NoteList/index.tsx

import React from 'react';
import { Note } from '../../types/notes.types';
import styles from './styles.module.css';

interface NoteListProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  onNoteDelete?: (id: string) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onNoteClick, onNoteDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPreview = (content: string) => {
    const maxLength = 150;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getMediaCount = (note: Note) => {
    if (!note.media_attachments || note.media_attachments.length === 0) return null;
    
    const imageCount = note.media_attachments.filter(m => m.media_type === 'image').length;
    const videoCount = note.media_attachments.filter(m => m.media_type === 'video').length;
    
    return { total: note.media_attachments.length, images: imageCount, videos: videoCount };
  };

  if (notes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No notes yet</h3>
        <p>Create your first note to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.noteList}>
      {notes.map((note) => {
        const mediaCount = getMediaCount(note);
        
        return (
          <div
            key={note.id}
            className={styles.noteCard}
            onClick={() => onNoteClick(note)}
          >
            <div className={styles.noteContent}>
              <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>
              <p className={styles.notePreview}>{getPreview(note.content)}</p>
              <div className={styles.noteMeta}>
                <span className={styles.noteDate}>{formatDate(note.created_at)}</span>
                {mediaCount && (
                  <div className={styles.mediaIndicators}>
                    {mediaCount.images > 0 && (
                      <span className={styles.mediaIndicator}>
                        🖼️ {mediaCount.images}
                      </span>
                    )}
                    {mediaCount.videos > 0 && (
                      <span className={styles.mediaIndicator}>
                        🎥 {mediaCount.videos}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {onNoteDelete && (
              <button
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onNoteDelete(note.id);
                }}
                aria-label="Delete note"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NoteList;
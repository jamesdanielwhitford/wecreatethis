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
    
    const imageAttachments = note.media_attachments.filter(m => m.media_type === 'image');
    const videoCount = note.media_attachments.filter(m => m.media_type === 'video').length;
    const audioAttachments = note.media_attachments.filter(m => m.media_type === 'audio');
    const audioCount = audioAttachments.length;
    const transcribedAudio = audioAttachments.filter(m => m.transcription_status === 'completed').length;
    
    // Count images with descriptions
    const imageCount = imageAttachments.length;
    const describedImages = imageAttachments.filter(m => m.description_status === 'completed').length;
    
    return { 
      total: note.media_attachments.length, 
      images: imageCount, 
      videos: videoCount,
      audio: audioCount,
      transcribed: transcribedAudio,
      described: describedImages
    };
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
                      <span className={`${styles.mediaIndicator} ${styles.imageIndicator}`}>
                        🖼️ {mediaCount.images}
                        {mediaCount.described > 0 && (
                          <span className={styles.descriptionBadge} title="Has AI descriptions">
                            🤖
                          </span>
                        )}
                      </span>
                    )}
                    {mediaCount.videos > 0 && (
                      <span className={styles.mediaIndicator}>
                        🎥 {mediaCount.videos}
                      </span>
                    )}
                    {mediaCount.audio > 0 && (
                      <span className={`${styles.mediaIndicator} ${styles.audioIndicator}`}>
                        🎵 {mediaCount.audio}
                        {mediaCount.transcribed > 0 && (
                          <span className={styles.transcriptionBadge} title="Has transcription">
                            📝
                          </span>
                        )}
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
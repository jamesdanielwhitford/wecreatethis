// src/apps/beautifulmind/components/NoteView/index.tsx

import React, { useState } from 'react';
import { Note } from '../../types/notes.types';
import styles from './styles.module.css';

interface NoteViewProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

const NoteView: React.FC<NoteViewProps> = ({ note, onEdit, onDelete }) => {
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleMediaClick = (url: string, type: string) => {
    setPreviewMedia({ url, type });
  };

  const closePreview = () => {
    setPreviewMedia(null);
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

      {/* Media Attachments */}
      {note.media_attachments && note.media_attachments.length > 0 && (
        <div className={styles.mediaSection}>
          <h3 className={styles.mediaSectionTitle}>Attachments</h3>
          <div className={styles.mediaGrid}>
            {note.media_attachments.map((attachment) => (
              <div key={attachment.id} className={styles.mediaItem}>
                {attachment.media_type === 'image' ? (
                  <div 
                    className={styles.imageContainer}
                    onClick={() => handleMediaClick(attachment.url!, attachment.media_type)}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.file_name}
                      className={styles.mediaThumbnail}
                    />
                    <div className={styles.mediaOverlay}>
                      <span className={styles.mediaName}>{attachment.file_name}</span>
                      <span className={styles.mediaSize}>{formatFileSize(attachment.file_size)}</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={styles.videoContainer}
                    onClick={() => handleMediaClick(attachment.url!, attachment.media_type)}
                  >
                    <div className={styles.videoThumbnail}>
                      <span className={styles.videoIcon}>🎥</span>
                    </div>
                    <div className={styles.mediaInfo}>
                      <span className={styles.mediaName}>{attachment.file_name}</span>
                      <span className={styles.mediaSize}>{formatFileSize(attachment.file_size)}</span>
                      {attachment.duration && (
                        <span className={styles.mediaDuration}>
                          {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewMedia && (
        <div className={styles.previewModal} onClick={closePreview}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            {previewMedia.type === 'video' ? (
              <video 
                src={previewMedia.url} 
                controls 
                autoPlay
                className={styles.previewVideo} 
              />
            ) : (
              <img 
                src={previewMedia.url} 
                alt="Preview" 
                className={styles.previewImage} 
              />
            )}
            <button className={styles.closeButton} onClick={closePreview}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteView;
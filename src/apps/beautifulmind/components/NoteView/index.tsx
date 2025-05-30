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
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMediaClick = (url: string, type: string) => {
    setPreviewMedia({ url, type });
  };

  const closePreview = () => {
    setPreviewMedia(null);
  };

  const toggleTranscriptionExpansion = (attachmentId: string) => {
    setExpandedTranscriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attachmentId)) {
        newSet.delete(attachmentId);
      } else {
        newSet.add(attachmentId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getTranscriptionStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '📝';
    }
  };

  const truncateTranscription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
                ) : attachment.media_type === 'video' ? (
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
                          {formatDuration(attachment.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.audioContainer}>
                    <div className={styles.audioHeader}>
                      <div className={styles.audioIcon}>🎵</div>
                      <div className={styles.audioControls}>
                        <button
                          className={styles.audioPreviewButton}
                          onClick={() => handleMediaClick(attachment.url!, attachment.media_type)}
                          aria-label="Preview audio in modal"
                        >
                          🔍
                        </button>
                        {attachment.transcription_status && (
                          <span className={styles.transcriptionStatusBadge}>
                            {getTranscriptionStatusIcon(attachment.transcription_status)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.audioPlayer}>
                      <audio
                        src={attachment.url}
                        controls
                        preload="metadata"
                        className={styles.audioControl}
                      />
                    </div>
                    <div className={styles.mediaInfo}>
                      <span className={styles.mediaName}>{attachment.file_name}</span>
                      <div className={styles.mediaDetails}>
                        <span className={styles.mediaSize}>{formatFileSize(attachment.file_size)}</span>
                        {attachment.duration && (
                          <span className={styles.mediaDuration}>
                            {formatDuration(attachment.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transcription Section */}
                    {attachment.transcription_text && (
                      <div className={styles.transcriptionSection}>
                        <div className={styles.transcriptionHeader}>
                          <span className={styles.transcriptionLabel}>Transcription</span>
                          <div className={styles.transcriptionActions}>
                            <button
                              className={styles.copyButton}
                              onClick={() => copyToClipboard(attachment.transcription_text!)}
                              title="Copy transcription"
                            >
                              📋
                            </button>
                            {attachment.transcription_text.length > 150 && (
                              <button
                                className={styles.expandButton}
                                onClick={() => toggleTranscriptionExpansion(attachment.id)}
                              >
                                {expandedTranscriptions.has(attachment.id) ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={styles.transcriptionContent}>
                          <p className={styles.transcriptionText}>
                            {expandedTranscriptions.has(attachment.id) 
                              ? attachment.transcription_text
                              : truncateTranscription(attachment.transcription_text)
                            }
                          </p>
                          {attachment.transcribed_at && (
                            <span className={styles.transcriptionDate}>
                              Transcribed {formatDate(attachment.transcribed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {attachment.transcription_status === 'pending' && (
                      <div className={styles.transcriptionPending}>
                        <span className={styles.transcriptionPendingText}>
                          ⏳ Transcription in progress...
                        </span>
                      </div>
                    )}

                    {attachment.transcription_status === 'failed' && (
                      <div className={styles.transcriptionError}>
                        <span className={styles.transcriptionErrorText}>
                          ❌ Transcription failed
                        </span>
                        {attachment.transcription_error && (
                          <span className={styles.transcriptionErrorMessage}>
                            {attachment.transcription_error}
                          </span>
                        )}
                      </div>
                    )}
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
            ) : previewMedia.type === 'audio' ? (
              <div className={styles.audioPreview}>
                <div className={styles.audioPreviewIcon}>🎵</div>
                <audio 
                  src={previewMedia.url} 
                  controls 
                  autoPlay
                  className={styles.previewAudio} 
                />
              </div>
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
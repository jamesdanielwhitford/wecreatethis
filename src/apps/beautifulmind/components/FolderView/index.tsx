// src/apps/beautifulmind/components/FolderView/index.tsx

import React, { useState, useEffect } from 'react';
import { Folder, FolderNoteResult } from '../../types/notes.types';
import styles from './styles.module.css';

interface FolderViewProps {
  folder: Folder;
  onEdit: () => void;
  onDelete: () => void;
  onNoteClick: (noteId: string) => void;
}

const FolderView: React.FC<FolderViewProps> = ({ folder, onEdit, onDelete, onNoteClick }) => {
  const [notes, setNotes] = useState<FolderNoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.7);

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

  const formatSimilarity = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'var(--success-color, #22c55e)';
    if (score >= 0.8) return 'var(--primary-color, #3b82f6)';
    if (score >= 0.7) return 'var(--warning-color, #f59e0b)';
    return 'var(--text-muted, #71717a)';
  };

  const getMatchedFieldsDisplay = (fields: string[]) => {
    const fieldMap: Record<string, string> = {
      'title': '📝 Title',
      'content': '📄 Content',
      'summary': '📋 Summary',
      'media_transcription': '🎵 Audio',
      'media_description': '🖼️ Image'
    };
    
    return fields.map(field => fieldMap[field] || field).join(', ');
  };

  const fetchFolderNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/folders/${folder.id}/notes?threshold=${threshold}`);
      if (!response.ok) {
        throw new Error('Failed to fetch folder notes');
      }
      
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderNotes();
  }, [folder.id, threshold]);

  const getPreview = (content: string) => {
    const maxLength = 200;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className={styles.folderView}>
      <div className={styles.header}>
        <div className={styles.folderInfo}>
          <div className={styles.folderHeader}>
            <span className={styles.folderIcon}>📁</span>
            <h1 className={styles.title}>{folder.title}</h1>
          </div>
          {folder.description && (
            <p className={styles.description}>{folder.description}</p>
          )}
          <div className={styles.metadata}>
            <span>Created: {formatDate(folder.created_at)}</span>
            {folder.updated_at !== folder.created_at && (
              <span> • Updated: {formatDate(folder.updated_at)}</span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.editButton}
            onClick={onEdit}
            aria-label="Edit folder"
          >
            Edit
          </button>
          <button
            className={styles.deleteButton}
            onClick={onDelete}
            aria-label="Delete folder"
          >
            Delete
          </button>
        </div>
      </div>

      <div className={styles.searchControls}>
        <div className={styles.searchInfo}>
          <h2 className={styles.sectionTitle}>📊 Semantically Related Notes</h2>
          <p className={styles.searchDescription}>
            Notes that match this folder's topics are automatically discovered using AI
          </p>
        </div>
        <div className={styles.thresholdControl}>
          <label className={styles.thresholdLabel}>
            Similarity Threshold: {formatSimilarity(threshold)}
          </label>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className={styles.thresholdSlider}
          />
          <div className={styles.thresholdHints}>
            <span>More Notes</span>
            <span>More Precise</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}>🔍</div>
          <span>Searching for related notes...</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span>❌ {error}</span>
          <button onClick={fetchFolderNotes} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.notesSection}>
          <div className={styles.notesHeader}>
            <h3 className={styles.notesCount}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} found
            </h3>
            {notes.length > 0 && (
              <span className={styles.sortInfo}>Sorted by relevance</span>
            )}
          </div>

          {notes.length === 0 ? (
            <div className={styles.emptyNotes}>
              <div className={styles.emptyIcon}>🔍</div>
              <h4>No related notes found</h4>
              <p>Try lowering the similarity threshold or create notes about "{folder.title}"</p>
            </div>
          ) : (
            <div className={styles.notesList}>
              {notes.map((result) => (
                <div
                  key={result.note.id}
                  className={styles.noteCard}
                  onClick={() => onNoteClick(result.note.id)}
                >
                  <div className={styles.noteContent}>
                    <div className={styles.noteHeader}>
                      <h4 className={styles.noteTitle}>
                        {result.note.title || 'Untitled'}
                      </h4>
                      <div className={styles.similarityBadge}>
                        <span 
                          className={styles.similarityScore}
                          style={{ color: getSimilarityColor(result.similarity_score) }}
                        >
                          {formatSimilarity(result.similarity_score)}
                        </span>
                      </div>
                    </div>
                    
                    <p className={styles.notePreview}>
                      {getPreview(result.note.content)}
                    </p>
                    
                    <div className={styles.noteFooter}>
                      <span className={styles.noteDate}>
                        {formatDate(result.note.created_at)}
                      </span>
                      <div className={styles.matchInfo}>
                        <span className={styles.matchedFields}>
                          {getMatchedFieldsDisplay(result.matched_fields)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {result.note.media_attachments && result.note.media_attachments.length > 0 && (
                    <div className={styles.mediaIndicators}>
                      {result.note.media_attachments.some(m => m.media_type === 'image') && (
                        <span className={styles.mediaIcon}>🖼️</span>
                      )}
                      {result.note.media_attachments.some(m => m.media_type === 'audio') && (
                        <span className={styles.mediaIcon}>🎵</span>
                      )}
                      {result.note.media_attachments.some(m => m.media_type === 'video') && (
                        <span className={styles.mediaIcon}>🎥</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderView;
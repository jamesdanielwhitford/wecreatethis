// src/apps/beautifulmind/components/NoteView/index.tsx

import React, { useState, useEffect } from 'react';
import { Note, Folder } from '../../types/notes.types';
import { notesService, folderManagementService } from '../../utils/api';
import styles from './styles.module.css';

interface NoteViewProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

const NoteView: React.FC<NoteViewProps> = ({ note, onEdit, onDelete }) => {
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
  // New folder management state
  const [currentFolders, setCurrentFolders] = useState<Folder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [suggestedFolders, setSuggestedFolders] = useState<Array<{
    folder: Folder;
    similarity_score: number;
    match_reason: string;
  }>>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  const formatSimilarity = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'var(--success-color, #22c55e)';
    if (score >= 0.6) return 'var(--primary-color, #3b82f6)';
    if (score >= 0.4) return 'var(--warning-color, #f59e0b)';
    if (score >= 0.2) return 'var(--text-secondary, #a1a1aa)';
    return 'var(--text-muted, #71717a)';
  };

  const getMatchReasonDisplay = (reason: string) => {
    const reasonMap: Record<string, string> = {
      'ai_categorization_match': '🧠 AI Match',
      'title_similarity': '📝 Title',
      'content_similarity': '📄 Content',
      'creation_order': '📅 Recent',
      'no_note_embedding': '📋 Basic'
    };
    return reasonMap[reason] || reason;
  };

  // Load current folders for this note
  const loadCurrentFolders = async () => {
    try {
      setLoadingFolders(true);
      setFoldersError(null);
      
      const response = await notesService.getNoteFolders(note.id);
      setCurrentFolders(response.folders || []);
    } catch (err) {
      setFoldersError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  // Load suggested folders for this note
  const loadSuggestedFolders = async () => {
    try {
      setLoadingSuggestions(true);
      
      // Get ALL available folders not currently containing this note (threshold=0)
      const response = await notesService.getSuggestedFolders(note.id, 0, 50);
      setSuggestedFolders(response.suggested_folders || []);
    } catch (err) {
      console.error('Failed to load suggested folders:', err);
      setSuggestedFolders([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Add note to a folder
  const handleAddToFolder = async (folderId: string) => {
    try {
      await folderManagementService.addNoteToFolder(folderId, note.id);
      
      // Refresh current folders
      await loadCurrentFolders();
      
      // Remove from suggestions
      setSuggestedFolders(prev => prev.filter(s => s.folder.id !== folderId));
      
      setFoldersError(null);
    } catch (err) {
      setFoldersError(err instanceof Error ? err.message : 'Failed to add note to folder');
    }
  };

  // Remove note from a folder
  const handleRemoveFromFolder = async (folderId: string) => {
    if (!window.confirm('Remove this note from the folder?')) return;
    
    try {
      await folderManagementService.removeNoteFromFolder(folderId, note.id);
      
      // Remove from current folders
      setCurrentFolders(prev => prev.filter(f => f.id !== folderId));
      
      // Refresh suggestions to potentially add it back
      if (showFolderModal) {
        await loadSuggestedFolders();
      }
      
      setFoldersError(null);
    } catch (err) {
      setFoldersError(err instanceof Error ? err.message : 'Failed to remove note from folder');
    }
  };

  // Show folder management modal
  const handleShowFolderModal = () => {
    setShowFolderModal(true);
    loadSuggestedFolders();
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

  const toggleDescriptionExpansion = (attachmentId: string) => {
    setExpandedDescriptions(prev => {
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

  const getDescriptionStatusIcon = (status?: string) => {
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

  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Load current folders on component mount
  useEffect(() => {
    loadCurrentFolders();
  }, [note.id]);

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

      {/* NEW: Folder Management Section */}
      <div className={styles.folderSection}>
        <div className={styles.folderHeader}>
          <h3 className={styles.sectionTitle}>📁 Folders</h3>
          <button
            className={styles.manageFoldersButton}
            onClick={handleShowFolderModal}
            disabled={loadingFolders}
          >
            Manage Folders
          </button>
        </div>
        
        {loadingFolders ? (
          <div className={styles.foldersLoading}>
            <span>📁</span>
            <span>Loading folders...</span>
          </div>
        ) : foldersError ? (
          <div className={styles.foldersError}>
            <span>❌ {foldersError}</span>
            <button onClick={loadCurrentFolders} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        ) : currentFolders.length === 0 ? (
          <div className={styles.noFolders}>
            <span className={styles.noFoldersIcon}>📂</span>
            <span>This note is not in any folders</span>
          </div>
        ) : (
          <div className={styles.currentFolders}>
            {currentFolders.map((folder) => (
              <div key={folder.id} className={styles.folderTag}>
                <span className={styles.folderIcon}>📁</span>
                <span className={styles.folderName}>{folder.title}</span>
                <button
                  className={styles.removeFolderButton}
                  onClick={() => handleRemoveFromFolder(folder.id)}
                  title="Remove from folder"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <div className={styles.imageContainer}>
                    <div 
                      className={styles.imageWrapper}
                      onClick={() => handleMediaClick(attachment.url!, attachment.media_type)}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.description || attachment.file_name}
                        className={styles.mediaThumbnail}
                      />
                      <div className={styles.mediaOverlay}>
                        <span className={styles.mediaName}>{attachment.file_name}</span>
                        <span className={styles.mediaSize}>{formatFileSize(attachment.file_size)}</span>
                      </div>
                    </div>

                    {/* Image Description Section */}
                    {attachment.description && (
                      <div className={styles.descriptionSection}>
                        <div className={styles.descriptionHeader}>
                          <span className={styles.descriptionLabel}>Description</span>
                          <div className={styles.descriptionActions}>
                            <button
                              className={styles.copyButton}
                              onClick={() => copyToClipboard(attachment.description!)}
                              title="Copy description"
                            >
                              📋
                            </button>
                            {attachment.description.length > 150 && (
                              <button
                                className={styles.expandButton}
                                onClick={() => toggleDescriptionExpansion(attachment.id)}
                              >
                                {expandedDescriptions.has(attachment.id) ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={styles.descriptionContent}>
                          <p className={styles.descriptionText}>
                            {expandedDescriptions.has(attachment.id) 
                              ? attachment.description
                              : truncateDescription(attachment.description)
                            }
                          </p>
                          {attachment.ai_generated_description && (
                            <span className={styles.aiGeneratedBadge}>🤖 AI Generated</span>
                          )}
                          {attachment.described_at && (
                            <span className={styles.descriptionDate}>
                              Described {formatDate(attachment.described_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {attachment.description_status === 'pending' && (
                      <div className={styles.descriptionPending}>
                        <span className={styles.descriptionPendingText}>
                          ⏳ Generating description...
                        </span>
                      </div>
                    )}

                    {attachment.description_status === 'failed' && (
                      <div className={styles.descriptionError}>
                        <span className={styles.descriptionErrorText}>
                          ❌ Description generation failed
                        </span>
                        {attachment.description_error && (
                          <span className={styles.descriptionErrorMessage}>
                            {attachment.description_error}
                          </span>
                        )}
                      </div>
                    )}
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

      {/* Folder Management Modal */}
      {showFolderModal && (
        <div className={styles.folderModal} onClick={() => setShowFolderModal(false)}>
          <div className={styles.folderModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.folderModalHeader}>
              <h3 className={styles.folderModalTitle}>Manage Folders for "{note.title || 'Untitled'}"</h3>
              <button 
                className={styles.folderModalClose}
                onClick={() => setShowFolderModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.folderModalBody}>
              {/* Current Folders Section */}
              <div className={styles.currentFoldersSection}>
                <h4 className={styles.folderSectionTitle}>📁 Current Folders ({currentFolders.length})</h4>
                {currentFolders.length === 0 ? (
                  <p className={styles.noCurrentFolders}>This note is not in any folders yet.</p>
                ) : (
                  <div className={styles.currentFoldersList}>
                    {currentFolders.map((folder) => (
                      <div key={folder.id} className={styles.currentFolderItem}>
                        <div className={styles.folderItemContent}>
                          <span className={styles.folderIcon}>📁</span>
                          <div className={styles.folderItemInfo}>
                            <span className={styles.folderItemName}>{folder.title}</span>
                            {folder.description && (
                              <span className={styles.folderItemDescription}>{folder.description}</span>
                            )}
                            {folder.added_to_folder_at && (
                              <span className={styles.folderItemDate}>
                                Added {formatDate(folder.added_to_folder_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className={styles.removeFromFolderButton}
                          onClick={() => handleRemoveFromFolder(folder.id)}
                          title="Remove from folder"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Folders Section */}
              <div className={styles.availableFoldersSection}>
                <h4 className={styles.folderSectionTitle}>📋 Available Folders</h4>
                <p className={styles.availableFoldersDescription}>
                  Add this note to additional folders (ordered by relevance)
                </p>
                
                {loadingSuggestions && (
                  <div className={styles.foldersLoading}>
                    <span>🔍</span>
                    <span>Finding relevant folders...</span>
                  </div>
                )}
                
                {!loadingSuggestions && (
                  <>
                    {suggestedFolders.length === 0 ? (
                      <div className={styles.noAvailableFolders}>
                        <div className={styles.noFoldersIcon}>📂</div>
                        <h5>No additional folders available</h5>
                        <p>This note is already in all existing folders, or no folders have been created yet.</p>
                      </div>
                    ) : (
                      <div className={styles.availableFoldersList}>
                        {suggestedFolders.map((suggestion) => (
                          <div
                            key={suggestion.folder.id}
                            className={styles.availableFolderItem}
                          >
                            <div className={styles.folderItemContent}>
                              <span className={styles.folderIcon}>📁</span>
                              <div className={styles.folderItemInfo}>
                                <div className={styles.folderItemHeader}>
                                  <span className={styles.folderItemName}>{suggestion.folder.title}</span>
                                  <div className={styles.folderItemMeta}>
                                    <span 
                                      className={styles.similarityScore}
                                      style={{ color: getSimilarityColor(suggestion.similarity_score) }}
                                    >
                                      {formatSimilarity(suggestion.similarity_score)}
                                    </span>
                                    <span className={styles.matchReason}>
                                      {getMatchReasonDisplay(suggestion.match_reason)}
                                    </span>
                                  </div>
                                </div>
                                {suggestion.folder.description && (
                                  <span className={styles.folderItemDescription}>
                                    {suggestion.folder.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              className={styles.addToFolderButton}
                              onClick={() => handleAddToFolder(suggestion.folder.id)}
                            >
                              Add to Folder
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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
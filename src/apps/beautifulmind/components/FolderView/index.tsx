// src/apps/beautifulmind/components/FolderView/index.tsx

import React, { useState, useEffect } from 'react';
import { Folder, Note, NoteSuggestion } from '../../types/notes.types';
import { folderManagementService } from '../../utils/api';
import Breadcrumb from '../Breadcrumb';
import { getFolderPath } from '../../utils/folder-hierarchy';
import styles from './styles.module.css';

interface FolderViewProps {
  folder: Folder;
  allFolders: Folder[]; // Need all folders for breadcrumb and subfolder display
  onEdit: () => void;
  onDelete: () => void;
  onNoteClick: (noteId: string) => void;
  onFolderClick: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
  onNavigateToFolder: (folderId: string | null) => void;
}

const FolderView: React.FC<FolderViewProps> = ({ 
  folder, 
  allFolders, 
  onEdit, 
  onDelete, 
  onNoteClick, 
  onFolderClick, 
  onCreateSubfolder, 
  onNavigateToFolder 
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [suggestedNotes, setSuggestedNotes] = useState<NoteSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

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
    if (score >= 0.8) return 'var(--success-color, #22c55e)';
    if (score >= 0.6) return 'var(--primary-color, #3b82f6)';
    if (score >= 0.4) return 'var(--warning-color, #f59e0b)';
    if (score >= 0.2) return 'var(--text-secondary, #a1a1aa)';
    return 'var(--text-muted, #71717a)';
  };

  const getMatchReasonDisplay = (reason: string) => {
    const reasonMap: Record<string, string> = {
      'ai_categorization': '🧠 AI Match',
      'title_similarity': '📝 Title',
      'content_similarity': '📄 Content',
      'creation_order': '📅 Recent',
      'no_note_embedding': '📋 Basic'
    };
    return reasonMap[reason] || reason;
  };

  const fetchFolderNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await folderManagementService.getFolderNotes(folder.id);
      setNotes(response.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedNotes = async () => {
    try {
      setLoadingSuggestions(true);
      setSuggestionsError(null);
      
      // Get ALL notes not in folder, ordered by relevance (no threshold filtering)
      const response = await folderManagementService.getSuggestedNotes(folder.id, 0, 50); // threshold=0, limit=50
      setSuggestedNotes(response.suggested_notes as NoteSuggestion[] || []);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddNote = async (noteId: string) => {
    try {
      await folderManagementService.addNoteToFolder(folder.id, noteId);
      
      // Refresh the folder notes
      await fetchFolderNotes();
      
      // Remove the note from suggestions
      setSuggestedNotes(prev => prev.filter(s => s.note.id !== noteId));
      
      // If no more suggestions, close modal
      if (suggestedNotes.length <= 1) {
        setShowAddNotesModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note to folder');
    }
  };

  const handleRemoveNote = async (noteId: string) => {
    if (!window.confirm('Remove this note from the folder?')) return;
    
    try {
      await folderManagementService.removeNoteFromFolder(folder.id, noteId);
      
      // Remove the note from the local state
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove note from folder');
    }
  };

  const handleShowAddNotes = () => {
    setShowAddNotesModal(true);
    fetchSuggestedNotes();
  };

  const getPreview = (content: string) => {
    const maxLength = 200;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    fetchFolderNotes();
  }, [folder.id]);

  // Get breadcrumb path and subfolders
  const breadcrumbPath = getFolderPath(folder.id, allFolders);
  const subfolders = allFolders.filter(f => f.parent_folder_id === folder.id);

  const handleCreateSubfolder = () => {
    onCreateSubfolder(folder.id);
  };

  return (
    <div className={styles.folderView}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        path={breadcrumbPath}
        onNavigate={onNavigateToFolder}
        showHome={true}
      />

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

      {/* Subfolders Section */}
      {subfolders.length > 0 && (
        <div className={styles.subfoldersSection}>
          <div className={styles.subfoldersHeader}>
            <h2 className={styles.sectionTitle}>📁 Subfolders</h2>
            <button
              className={styles.createSubfolderButton}
              onClick={handleCreateSubfolder}
            >
              + New Subfolder
            </button>
          </div>
          <div className={styles.subfoldersList}>
            {subfolders.map((subfolder) => (
              <div
                key={subfolder.id}
                className={styles.subfolderCard}
                onClick={() => onFolderClick(subfolder)}
              >
                <div className={styles.subfolderIcon}>📁</div>
                <div className={styles.subfolderInfo}>
                  <h4 className={styles.subfolderTitle}>{subfolder.title}</h4>
                  {subfolder.description && (
                    <p className={styles.subfolderDescription}>{subfolder.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Subfolder Section - show if no subfolders exist */}
      {subfolders.length === 0 && (
        <div className={styles.createSubfolderSection}>
          <button
            className={styles.createSubfolderButton}
            onClick={handleCreateSubfolder}
          >
            📁+ Create Subfolder
          </button>
        </div>
      )}

      {/* Manual folder management info */}
      <div className={styles.folderControls}>
        <div className={styles.folderInfo}>
          <h2 className={styles.sectionTitle}>📂 Folder Contents</h2>
          <p className={styles.folderDescription}>
            Notes you&apos;ve manually added to this folder
          </p>
        </div>
        <button
          className={styles.addNotesButton}
          onClick={handleShowAddNotes}
          disabled={loading}
        >
          + Add Notes
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}>📁</div>
          <span>Loading folder contents...</span>
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
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} in folder
            </h3>
            {notes.length > 0 && (
              <span className={styles.sortInfo}>Recently added first</span>
            )}
          </div>

          {notes.length === 0 ? (
            <div className={styles.emptyNotes}>
              <div className={styles.emptyIcon}>📝</div>
              <h4>No notes in this folder yet</h4>
              <p>Click &quot;Add Notes&quot; to manually add notes to &quot;{folder.title}&quot;</p>
            </div>
          ) : (
            <div className={styles.notesList}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={styles.noteCard}
                  onClick={() => onNoteClick(note.id)}
                >
                  <div className={styles.noteContent}>
                    <div className={styles.noteHeader}>
                      <h4 className={styles.noteTitle}>
                        {note.title || 'Untitled'}
                      </h4>
                      <div className={styles.noteActions}>
                        {note.added_to_folder_at && (
                          <span className={styles.addedDate}>
                            Added {formatDate(note.added_to_folder_at)}
                          </span>
                        )}
                        <button
                          className={styles.removeButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNote(note.id);
                          }}
                          title="Remove from folder"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    <p className={styles.notePreview}>
                      {getPreview(note.content)}
                    </p>
                    
                    <div className={styles.noteFooter}>
                      <span className={styles.noteDate}>
                        Created {formatDate(note.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  {note.media_attachments && note.media_attachments.length > 0 && (
                    <div className={styles.mediaIndicators}>
                      {note.media_attachments.some(m => m.media_type === 'image') && (
                        <span className={styles.mediaIcon}>🖼️</span>
                      )}
                      {note.media_attachments.some(m => m.media_type === 'audio') && (
                        <span className={styles.mediaIcon}>🎵</span>
                      )}
                      {note.media_attachments.some(m => m.media_type === 'video') && (
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

      {/* Add Notes Modal */}
      {showAddNotesModal && (
        <div className={styles.modal} onClick={() => setShowAddNotesModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Notes to &quot;{folder.title}&quot;</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowAddNotesModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                📋 All available notes, ordered by relevance to this folder
              </p>
              
              {loadingSuggestions && (
                <div className={styles.suggestionsLoading}>
                  <div className={styles.loadingSpinner}>🔍</div>
                  <span>Finding relevant notes...</span>
                </div>
              )}
              
              {suggestionsError && (
                <div className={styles.suggestionsError}>
                  <span>❌ {suggestionsError}</span>
                  <button onClick={fetchSuggestedNotes} className={styles.retryButton}>
                    Try Again
                  </button>
                </div>
              )}
              
              {!loadingSuggestions && !suggestionsError && (
                <>
                  {suggestedNotes.length === 0 ? (
                    <div className={styles.noSuggestions}>
                      <div className={styles.noSuggestionsIcon}>📝</div>
                      <h4>No notes available to add</h4>
                      <p>All existing notes are already in this folder, or you haven&apos;t created any notes yet.</p>
                    </div>
                  ) : (
                    <div className={styles.suggestionsList}>
                      {suggestedNotes.map((suggestion) => (
                        <div
                          key={suggestion.note.id}
                          className={styles.suggestionCard}
                        >
                          <div className={styles.suggestionContent}>
                            <div className={styles.suggestionHeader}>
                              <h4 className={styles.suggestionTitle}>
                                {suggestion.note.title || 'Untitled'}
                              </h4>
                              <div className={styles.suggestionMeta}>
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
                            
                            <p className={styles.suggestionPreview}>
                              {getPreview(suggestion.note.content)}
                            </p>
                            
                            <div className={styles.suggestionFooter}>
                              <span className={styles.suggestionDate}>
                                {formatDate(suggestion.note.created_at)}
                              </span>
                              <button
                                className={styles.addButton}
                                onClick={() => handleAddNote(suggestion.note.id)}
                              >
                                + Add to Folder
                              </button>
                            </div>
                          </div>
                          
                          {suggestion.note.media_attachments && suggestion.note.media_attachments.length > 0 && (
                            <div className={styles.suggestionMediaIndicators}>
                              {suggestion.note.media_attachments.some(m => m.media_type === 'image') && (
                                <span className={styles.mediaIcon}>🖼️</span>
                              )}
                              {suggestion.note.media_attachments.some(m => m.media_type === 'audio') && (
                                <span className={styles.mediaIcon}>🎵</span>
                              )}
                              {suggestion.note.media_attachments.some(m => m.media_type === 'video') && (
                                <span className={styles.mediaIcon}>🎥</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderView;
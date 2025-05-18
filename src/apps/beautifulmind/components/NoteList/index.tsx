/**
 * File: src/apps/beautifulmind/components/NoteList/index.tsx
 * Note List component for displaying and selecting notes
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './styles.module.css';
import { Note } from '../../types';
import { getNotesByFolder, deleteNote } from '../../utils';
import { DocumentSnapshot } from 'firebase/firestore';
import MoveNoteModal from '../MoveNoteModal';

interface NoteListProps {
  userId: string;
  folderId: string | null;
  activeNoteId: string | null;
  onNoteSelect: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  searchQuery?: string;
  searchResults?: Note[];
}

const NoteList: React.FC<NoteListProps> = ({
  userId,
  folderId,
  activeNoteId,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  searchResults
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [selectMode, setSelectMode] = useState<boolean>(false);
  
  // Loading notes based on folder or search
  useEffect(() => {
    // If we have search results, use them instead of fetching from Firestore
    if (searchQuery && searchResults) {
      setNotes(searchResults);
      setHasMore(false);
      return;
    }
    
    const loadNotes = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      setLastDoc(null);
      
      try {
        const { notes: loadedNotes, lastDoc: newLastDoc } = await getNotesByFolder(folderId, userId);
        setNotes(loadedNotes);
        setLastDoc(newLastDoc);
        setHasMore(loadedNotes.length === pageSize);
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotes();
  }, [userId, folderId, searchQuery, searchResults, pageSize]);
  
  // Load more notes when scrolling to bottom
  const loadMoreNotes = async () => {
    if (!hasMore || isLoading || !lastDoc || !userId) return;
    
    setIsLoading(true);
    
    try {
      const { notes: moreNotes, lastDoc: newLastDoc } = await getNotesByFolder(
        folderId, 
        userId, 
        lastDoc,
        pageSize
      );
      
      setNotes(prev => [...prev, ...moreNotes]);
      setLastDoc(newLastDoc);
      setHasMore(moreNotes.length === pageSize);
    } catch (error) {
      console.error('Error loading more notes:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle scroll to detect when to load more notes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // If scrolled to bottom (with 50px threshold) and more notes exist
    if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoading) {
      loadMoreNotes();
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If yesterday, show "Yesterday"
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
  // Get text preview from note content
  const getPreview = (text: string) => {
    if (!text) return '';
    
    // Limit to ~100 characters, cut at word boundary
    const limit = 100;
    if (text.length <= limit) return text;
    
    const truncated = text.substring(0, limit).trim();
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace === -1) return `${truncated}...`;
    return `${truncated.substring(0, lastSpace)}...`;
  };
  
  // Handle note deletion with confirmation
  const handleDeleteNote = async (noteId: string) => {
    if (deletingNoteId !== noteId || !confirmDelete) {
      setDeletingNoteId(noteId);
      setConfirmDelete(true);
      return;
    }
    
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      onDeleteNote(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setDeletingNoteId(null);
      setConfirmDelete(false);
    }
  };
  
  // Cancel delete confirmation
  const cancelDelete = () => {
    setDeletingNoteId(null);
    setConfirmDelete(false);
  };
  
  // Enable or disable select mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    // Clear selections when exiting select mode
    if (selectMode) {
      setSelectedNotes(new Set());
    }
  };
  
  // Handle note selection
  const handleNoteSelection = useCallback((noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev);
      
      if (newSelectedNotes.has(noteId)) {
        newSelectedNotes.delete(noteId);
      } else {
        newSelectedNotes.add(noteId);
      }
      
      return newSelectedNotes;
    });
  }, []);
  
  // Show move modal for selected notes
  const handleMoveNotes = () => {
    if (selectedNotes.size === 0) return;
    setShowMoveModal(true);
  };
  
  // After notes have been moved successfully
  const handleMoveSuccess = useCallback(() => {
    setShowMoveModal(false);
    setSelectedNotes(new Set());
    setSelectMode(false);
    
    // Refresh notes list
    if (searchQuery && searchResults) {
      // For search results, we need to re-run the search
      // In a real app, this would re-query the vector DB
    } else {
      // For regular folder view, just reload the notes
      const loadNotes = async () => {
        if (!userId) return;
        
        setIsLoading(true);
        setLastDoc(null);
        
        try {
          const { notes: loadedNotes, lastDoc: newLastDoc } = await getNotesByFolder(folderId, userId);
          setNotes(loadedNotes);
          setLastDoc(newLastDoc);
          setHasMore(loadedNotes.length === pageSize);
        } catch (error) {
          console.error('Error loading notes:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadNotes();
    }
  }, [folderId, pageSize, searchQuery, searchResults, userId]);
  
  // Create a safe click handler for select mode
  const handleNoteItemClick = (note: Note) => {
    if (selectMode) {
      // Using a synthetic event for selection
      const syntheticEvent = {
        stopPropagation: () => {}
      } as React.MouseEvent;
      handleNoteSelection(note.id, syntheticEvent);
    } else {
      onNoteSelect(note);
    }
  };
  
  return (
    <div className={styles.noteList} onScroll={handleScroll} ref={listRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {searchQuery ? `Search Results: "${searchQuery}"` : 'Notes'}
        </h3>
        
        <div className={styles.headerActions}>
          {selectMode && selectedNotes.size > 0 && (
            <button 
              className={styles.moveButton} 
              onClick={handleMoveNotes}
              title="Move selected notes to folder"
            >
              Move ({selectedNotes.size})
            </button>
          )}
          
          <button 
            className={`${styles.selectButton} ${selectMode ? styles.active : ''}`} 
            onClick={toggleSelectMode}
            title={selectMode ? "Exit selection mode" : "Select multiple notes"}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
          
          <button className={styles.createButton} onClick={onCreateNote}>
            + New
          </button>
        </div>
      </div>
      
      {isLoading && notes.length === 0 ? (
        <div className={styles.loading}>Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery ? 'No results found' : 'No notes yet'}
          {!searchQuery && (
            <button className={styles.createEmptyButton} onClick={onCreateNote}>
              Create your first note
            </button>
          )}
        </div>
      ) : (
        <ul className={styles.noteItems}>
          {notes.map(note => {
            const isSelected = selectedNotes.has(note.id);
            
            return (
              <li 
                key={note.id} 
                className={`${styles.noteItem} ${note.id === activeNoteId ? styles.activeNote : ''} ${isSelected ? styles.selectedNote : ''}`}
                onClick={() => handleNoteItemClick(note)}
              >
                {selectMode && (
                  <div 
                    className={styles.checkboxContainer} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNoteSelection(note.id, e);
                    }}
                  >
                    <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                      {isSelected && <span className={styles.checkmark}>✓</span>}
                    </div>
                  </div>
                )}
                
                <div className={styles.noteContent}>
                  <h4 className={styles.noteTitle}>{note.title || 'Untitled'}</h4>
                  <p className={styles.notePreview}>{getPreview(note.text)}</p>
                </div>
                
                <div className={styles.noteFooter}>
                  <span className={styles.noteDate}>
                    {formatDate(note.updatedAt)}
                  </span>
                  
                  {!selectMode && (deletingNoteId === note.id && confirmDelete) ? (
                    <div className={styles.deleteConfirm}>
                      <span className={styles.confirmText}>Delete?</span>
                      <button 
                        className={styles.confirmButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                      >
                        Yes
                      </button>
                      <button 
                        className={styles.cancelButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelDelete();
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : !selectMode && (
                    <button 
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      
      {isLoading && notes.length > 0 && (
        <div className={styles.loadingMore}>Loading more notes...</div>
      )}
      
      {/* Move Note Modal */}
      {showMoveModal && (
        <MoveNoteModal
          userId={userId}
          noteIds={Array.from(selectedNotes)}
          onClose={() => setShowMoveModal(false)}
          onSuccess={handleMoveSuccess}
        />
      )}
    </div>
  );
};

export default NoteList;
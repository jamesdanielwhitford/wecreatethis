/**
 * File: src/apps/beautifulmind/components/NoteEditor/index.tsx
 * Note Editor component for creating and editing notes
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';
import { Note } from '../../types';
import { createNote, updateNote, generateEmbedding } from '../../utils';

interface NoteEditorProps {
  userId: string;
  activeNote: Note | null;
  folderPath: string[];
  onSave: (note: Note) => void;
  onCancel: () => void;
  isNewNote: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  userId,
  activeNote,
  folderPath,
  onSave,
  onCancel,
  isNewNote
}) => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentChanged = useRef<boolean>(false);
  
  // Initialize editor with active note data or empty for a new note
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.text || '');
    } else {
      setTitle('');
      setContent('');
    }
    
    contentChanged.current = false;
    
    // Focus on title input when opening editor
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [activeNote]);
  
  // Save the note
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your note');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      let savedNote: Note;
      
      // Generate embedding for semantic search
      const fullText = `${title} ${content}`;
      const embedding = await generateEmbedding(fullText);
      
      if (isNewNote) {
        // Create new note
        savedNote = await createNote({
          title: title.trim(),
          text: content.trim(),
          folderPath,
          userId,
          embedding,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (activeNote) {
        // Update existing note
        const updatedFields: Partial<Note> = {
          title: title.trim(),
          text: content.trim(),
          updatedAt: Date.now(),
        };
        
        // Only update embedding if content changed significantly
        if (contentChanged.current && embedding) {
          updatedFields.embedding = embedding;
        }
        
        await updateNote(activeNote.id, updatedFields);
        
        savedNote = {
          ...activeNote,
          ...updatedFields
        };
      } else {
        throw new Error('No active note to update');
      }
      
      onSave(savedNote);
      contentChanged.current = false;
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle content changes and track if content has changed
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    contentChanged.current = true;
  };
  
  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    contentChanged.current = true;
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    
    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  
  return (
    <div className={styles.noteEditor} onKeyDown={handleKeyDown}>
      <div className={styles.editorHeader}>
        <input
          ref={titleInputRef}
          type="text"
          className={styles.titleInput}
          placeholder="Note title"
          value={title}
          onChange={handleTitleChange}
          maxLength={100}
        />
      </div>
      
      <textarea
        className={styles.contentTextarea}
        placeholder="Write your note here..."
        value={content}
        onChange={handleContentChange}
      />
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.editorFooter}>
        <div className={styles.footerLeft}>
          {contentChanged.current && <span className={styles.unsavedIndicator}>Unsaved changes</span>}
        </div>
        <div className={styles.footerRight}>
          <button 
            className={styles.cancelButton} 
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
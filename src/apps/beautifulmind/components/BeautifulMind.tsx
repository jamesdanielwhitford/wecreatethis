// src/apps/beautifulmind/components/BeautifulMind.tsx

import React, { useState } from 'react';
import { Note, ViewMode, MediaAttachment, UploadProgress } from '../types/notes.types';
import { useNotes } from '../hooks/useNotes';
import Navbar from './Navbar';
import NoteList from './NoteList';
import NoteView from './NoteView';
import NoteEditor from './NoteEditor';
import styles from './BeautifulMind.module.css';

const BeautifulMind: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Lift media state to parent level - this survives component remounts
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<UploadProgress[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
  
  const { notes, loading, error, createNote, updateNote, deleteNote, getNoteById } = useNotes();

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreating(true);
    // Clear any pending media from previous sessions
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setViewMode('create');
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsCreating(false);
    // Clear pending media when switching to view existing note
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setViewMode('view');
  };

  const handleEdit = () => {
    setIsCreating(false);
    // When editing existing note, load its media into pending state
    if (selectedNote?.media_attachments) {
      setPendingMedia([...selectedNote.media_attachments]);
    }
    setDeletedMediaIds([]);
    setViewMode('edit');
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(selectedNote.id);
        setViewMode('list');
        setSelectedNote(null);
        setIsCreating(false);
        setPendingMedia([]);
        setPendingUploads([]);
        setDeletedMediaIds([]);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const handleSave = async (data: { title: string; content: string }, keepMedia?: boolean): Promise<Note> => {
    if (isCreating || !selectedNote) {
      // Creating new note
      const newNote = await createNote(data);
      setSelectedNote(newNote);
      
      if (!keepMedia) {
        // Normal save - go to view mode and clear pending media
        setIsCreating(false);
        setViewMode('view');
        setPendingMedia([]);
        setPendingUploads([]);
        setDeletedMediaIds([]);
      } else {
        // Media is being added - transition to edit but keep pending media
        setIsCreating(false);
        setViewMode('edit');
      }
      return newNote;
    } else {
      // Updating existing note
      const updatedNote = await updateNote(selectedNote.id, data);
      setSelectedNote(updatedNote);
      if (!keepMedia) {
        setViewMode('view');
        setPendingMedia([]);
        setPendingUploads([]);
        setDeletedMediaIds([]);
      }
      return updatedNote;
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      setViewMode('list');
      setIsCreating(false);
      setSelectedNote(null);
    } else {
      setViewMode('view');
    }
    // Clear pending media on cancel
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedNote(null);
    setIsCreating(false);
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Navbar
          viewMode={viewMode}
          onNewNote={handleNewNote}
          onBackToList={handleBackToList}
        />
        <div className={styles.loading}>Loading notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Navbar
          viewMode={viewMode}
          onNewNote={handleNewNote}
          onBackToList={handleBackToList}
        />
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navbar
        viewMode={viewMode}
        onNewNote={handleNewNote}
        onBackToList={handleBackToList}
      />
      
      <main className={styles.main}>
        {viewMode === 'list' && (
          <NoteList
            notes={notes}
            onNoteClick={handleNoteClick}
            onNoteDelete={deleteNote}
          />
        )}
        
        {viewMode === 'view' && selectedNote && (
          <NoteView
            note={getNoteById(selectedNote.id) || selectedNote}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        
        {(viewMode === 'create' || viewMode === 'edit') && (
          <NoteEditor
            note={selectedNote}
            onSave={handleSave}
            onCancel={handleCancel}
            isCreating={isCreating}
            // Pass media state from parent
            pendingMedia={pendingMedia}
            setPendingMedia={setPendingMedia}
            pendingUploads={pendingUploads}
            setPendingUploads={setPendingUploads}
            deletedMediaIds={deletedMediaIds}
            setDeletedMediaIds={setDeletedMediaIds}
          />
        )}
      </main>
    </div>
  );
};

export default BeautifulMind;
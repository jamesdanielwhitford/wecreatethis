// src/apps/beautifulmind/components/BeautifulMind.tsx

import React, { useState } from 'react';
import { Note, ViewMode, MediaAttachment, UploadProgress, PendingMediaFile } from '../types/notes.types';
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
  
  // New state for files during creation (before note exists)
  const [pendingFiles, setPendingFiles] = useState<PendingMediaFile[]>([]);
  
  const { notes, loading, error, createNote, updateNote, deleteNote, getNoteById, updateNoteInList } = useNotes();

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreating(true);
    // Clear any pending media from previous sessions
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setPendingFiles([]);
    setViewMode('create');
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsCreating(false);
    // Clear pending media when switching to view existing note
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setPendingFiles([]);
    setViewMode('view');
  };

  const handleEdit = () => {
    setIsCreating(false);
    // When editing existing note, load its media into pending state
    if (selectedNote?.media_attachments) {
      setPendingMedia([...selectedNote.media_attachments]);
    }
    setDeletedMediaIds([]);
    setPendingFiles([]);
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
        setPendingFiles([]);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const handleSave = async (data: { title: string; content: string }): Promise<Note> => {
    if (isCreating || !selectedNote) {
      // Creating new note
      const newNote = await createNote(data);
      
      // After note creation and potential title generation, get the updated note
      // The NoteEditor will handle title generation, so we should get the final note
      const finalNote = getNoteById(newNote.id) || newNote;
      
      setSelectedNote(finalNote);
      setIsCreating(false);
      setViewMode('view');
      
      // Clear all pending states after successful creation
      setPendingMedia([]);
      setPendingUploads([]);
      setDeletedMediaIds([]);
      setPendingFiles([]);
      
      return finalNote;
    } else {
      // Updating existing note
      const updatedNote = await updateNote(selectedNote.id, data);
      
      // After note update and potential title generation, get the updated note
      const finalNote = getNoteById(updatedNote.id) || updatedNote;
      
      setSelectedNote(finalNote);
      setViewMode('view');
      setPendingMedia([]);
      setPendingUploads([]);
      setDeletedMediaIds([]);
      setPendingFiles([]);
      return finalNote;
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
    setPendingFiles([]);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedNote(null);
    setIsCreating(false);
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setPendingFiles([]);
  };

  // Custom save handler that includes title generation logic
  const handleSaveWithTitleGeneration = async (data: { title: string; content: string }): Promise<Note> => {
    let savedNote: Note;
    
    if (isCreating || !selectedNote) {
      // Creating new note
      savedNote = await createNote(data);
    } else {
      // Updating existing note
      savedNote = await updateNote(selectedNote.id, data);
    }
    
    // Update the note in our local state if title was generated
    // This will be handled by the NoteEditor component
    return savedNote;
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
            // New file state for creation mode
            pendingFiles={pendingFiles}
            setPendingFiles={setPendingFiles}
          />
        )}
      </main>
    </div>
  );
};

export default BeautifulMind;
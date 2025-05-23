// src/apps/beautifulmind/components/BeautifulMind.tsx

import React, { useState } from 'react';
import { Note, ViewMode } from '../types/notes.types';
import { useNotes } from '../hooks/useNotes';
import Navbar from './Navbar';
import NoteList from './NoteList';
import NoteView from './NoteView';
import NoteEditor from './NoteEditor';
import styles from './BeautifulMind.module.css';

const BeautifulMind: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const { notes, loading, error, createNote, updateNote, deleteNote, getNoteById } = useNotes();

  const handleNewNote = () => {
    setSelectedNote(null);
    setViewMode('create');
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setViewMode('view');
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(selectedNote.id);
        setViewMode('list');
        setSelectedNote(null);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const handleSave = async (data: { title: string; content: string }, keepMedia?: boolean): Promise<Note> => {
    if (viewMode === 'create') {
      const newNote = await createNote(data);
      if (!keepMedia) {
        setSelectedNote(newNote);
        setViewMode('view');
      }
      return newNote;
    } else if (viewMode === 'edit' && selectedNote) {
      const updatedNote = await updateNote(selectedNote.id, data);
      setSelectedNote(updatedNote);
      if (!keepMedia) {
        setViewMode('view');
      }
      return updatedNote;
    }
    throw new Error('Invalid state');
  };

  const handleCancel = () => {
    if (viewMode === 'create') {
      setViewMode('list');
    } else {
      setViewMode('view');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedNote(null);
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
            note={viewMode === 'edit' ? selectedNote : null}
            onSave={handleSave}
            onCancel={handleCancel}
            isCreating={viewMode === 'create'}
          />
        )}
      </main>
    </div>
  );
};

export default BeautifulMind;
'use client';

import React, { useState, useEffect } from 'react';
import styles from './BeautifulMindApp.module.css';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { FolderView } from './components/FolderView';
import { Sidebar } from './components/Sidebar';
import { useNotes } from './hooks/useNotes';
import { Note, View } from './types';

export function BeautifulMindApp() {
  const [currentView, setCurrentView] = useState<View>('notes');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [folderNotes, setFolderNotes] = useState<Note[]>([]);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  
  const { 
    notes, 
    tags, 
    isLoading, 
    error,
    addNote, 
    updateNote, 
    deleteNote,
    getNotesByTag 
  } = useNotes();

  // Load notes for the current folder when it changes
  useEffect(() => {
    if (currentView === 'folder' && currentFolder) {
      const loadFolderNotes = async () => {
        setIsLoadingFolder(true);
        try {
          const notesForFolder = await getNotesByTag(currentFolder);
          setFolderNotes(notesForFolder);
        } finally {
          setIsLoadingFolder(false);
        }
      };
      
      loadFolderNotes();
    }
  }, [currentView, currentFolder, getNotesByTag]);

  const handleCreateNote = () => {
    setActiveNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setActiveNote(note);
    setIsEditing(true);
  };

  const handleSaveNote = async (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (activeNote) {
        await updateNote({ 
          ...note, 
          id: activeNote.id,
          createdAt: activeNote.createdAt,
          updatedAt: Date.now()
        });
      } else {
        await addNote(note);
      }
      setIsEditing(false);
      setActiveNote(null);
      
      // Reload folder notes if in folder view
      if (currentView === 'folder' && currentFolder) {
        const updatedFolderNotes = await getNotesByTag(currentFolder);
        setFolderNotes(updatedFolderNotes);
      }
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setActiveNote(null);
  };

  const handleSelectFolder = (tag: string) => {
    setCurrentFolder(tag);
    setCurrentView('folder');
  };

  const handleBackToNotes = () => {
    setCurrentView('notes');
    setCurrentFolder(null);
  };
  
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      
      // If in folder view, update folder notes
      if (currentView === 'folder' && currentFolder) {
        const updatedFolderNotes = await getNotesByTag(currentFolder);
        setFolderNotes(updatedFolderNotes);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
      return false;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Beautiful Mind</h1>
        {error && <div className={styles.errorMessage}>{error}</div>}
      </header>
      
      <div className={styles.content}>
        <Sidebar 
          tags={tags}
          onSelectFolder={handleSelectFolder}
          onBackToNotes={handleBackToNotes}
          currentView={currentView}
        />
        
        <main className={styles.main}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <p>Loading your notes...</p>
            </div>
          ) : isEditing ? (
            <NoteEditor 
              note={activeNote}
              availableTags={tags}
              onSave={handleSaveNote}
              onCancel={handleCancelEdit}
            />
          ) : currentView === 'notes' ? (
            <NoteList 
              notes={notes}
              onCreateNote={handleCreateNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
            />
          ) : currentView === 'folder' && currentFolder ? (
            <FolderView
              folderTag={currentFolder}
              notes={folderNotes}
              isLoading={isLoadingFolder}
              onCreateNote={handleCreateNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
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
  
  const { 
    notes, 
    tags, 
    addNote, 
    updateNote, 
    deleteNote,
    getNotesByTag 
  } = useNotes();

  const handleCreateNote = () => {
    setActiveNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setActiveNote(note);
    setIsEditing(true);
  };

  const handleSaveNote = (note: Note) => {
    if (activeNote) {
      updateNote({ ...note, id: activeNote.id });
    } else {
      addNote(note);
    }
    setIsEditing(false);
    setActiveNote(null);
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Beautiful Mind</h1>
      </header>
      
      <div className={styles.content}>
        <Sidebar 
          tags={tags}
          onSelectFolder={handleSelectFolder}
          onBackToNotes={handleBackToNotes}
          currentView={currentView}
        />
        
        <main className={styles.main}>
          {isEditing ? (
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
              onDeleteNote={deleteNote}
            />
          ) : currentView === 'folder' && currentFolder ? (
            <FolderView
              folderTag={currentFolder}
              notes={getNotesByTag(currentFolder)}
              onCreateNote={handleCreateNote}
              onEditNote={handleEditNote}
              onDeleteNote={deleteNote}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
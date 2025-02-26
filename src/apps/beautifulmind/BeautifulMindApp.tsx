'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './BeautifulMindApp.module.css';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { FolderView } from './components/FolderView';
import { Sidebar } from './components/Sidebar';
import { useNotes } from './hooks/useNotes';
import { useFolders } from './hooks/useFolders';
import { Note, View, SubfolderView } from './types';

export function BeautifulMindApp() {
  const [currentView, setCurrentView] = useState<View>('notes');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentSubfolder, setCurrentSubfolder] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeFolderNotes, setActiveFolderNotes] = useState<Note[]>([]);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  
  const { 
    notes, 
    tags, 
    isLoading: isLoadingNotes, 
    error: notesError,
    addNote, 
    updateNote, 
    deleteNote,
    getNotesByTag 
  } = useNotes();

  const {
    rootFolders,
    folderTags,
    isLoading: isLoadingFolders,
    error: foldersError,
    createFolder,
    getFolderByTag
  } = useFolders();

  // Current active folder metadata
  const activeFolderMetadata = useMemo(() => {
    if (!currentFolder) return null;
    return getFolderByTag(currentFolder);
  }, [currentFolder, getFolderByTag]);

  // Generate subfolder views for the current folder
  const subfolderViews = useMemo<SubfolderView[]>(() => {
    if (!currentFolder || !activeFolderMetadata) {
      return [];
    }
    
    // Get all subfolders created by the user for this parent folder
    const userSubfolders = rootFolders.filter(folder => 
      folder.parentId === activeFolderMetadata.id
    );
    
    // Convert to SubfolderView format with count
    return userSubfolders.map(subfolder => {
      // Count notes that have both the parent folder tag and this subfolder tag
      const count = activeFolderNotes.filter(note => 
        note.tags.includes(subfolder.tag)
      ).length;
      
      return {
        id: subfolder.id,
        name: subfolder.name,
        tag: subfolder.tag,
        count
      };
    });
  }, [currentFolder, activeFolderMetadata, activeFolderNotes, rootFolders]);

  // Load notes for the current folder when it changes
  useEffect(() => {
    if (currentView === 'folder' && currentFolder) {
      const loadFolderNotes = async () => {
        setIsLoadingFolder(true);
        try {
          const notesForFolder = await getNotesByTag(currentFolder);
          setActiveFolderNotes(notesForFolder);
          // Reset subfolder when folder changes
          setCurrentSubfolder(null);
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
      // If we're in a folder view, automatically add the folder tag
      if (currentView === 'folder' && currentFolder && !note.tags.includes(currentFolder)) {
        note.tags = [...note.tags, currentFolder];
      }
      
      // If we're in a subfolder view, also add the subfolder tag
      if (currentSubfolder && !note.tags.includes(currentSubfolder)) {
        note.tags = [...note.tags, currentSubfolder];
      }
      
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
        setActiveFolderNotes(updatedFolderNotes);
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

  const handleSelectFolder = (folderTag: string) => {
    setCurrentFolder(folderTag);
    setCurrentSubfolder(null);
    setCurrentView('folder');
  };

  const handleSelectSubfolder = (tag: string | null) => {
    setCurrentSubfolder(tag);
  };

  const handleBackToNotes = () => {
    setCurrentView('notes');
    setCurrentFolder(null);
    setCurrentSubfolder(null);
  };
  
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      
      // If in folder view, update folder notes
      if (currentView === 'folder' && currentFolder) {
        const updatedFolderNotes = await getNotesByTag(currentFolder);
        setActiveFolderNotes(updatedFolderNotes);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
      return false;
    }
  };
  
  const handleCreateRootFolder = (folderName: string) => {
    try {
      const newFolder = createFolder(folderName, null);
      handleSelectFolder(newFolder.tag);
    } catch (err) {
      console.error('Error creating folder:', err);
      alert('Failed to create folder. Please try again.');
    }
  };
  
  const handleCreateSubfolder = (folderName: string) => {
    if (!currentFolder || !activeFolderMetadata) return;
    
    try {
      const newFolder = createFolder(folderName, activeFolderMetadata.id);
      // Switch to this subfolder view
      setCurrentSubfolder(newFolder.tag);
    } catch (err) {
      console.error('Error creating subfolder:', err);
      alert('Failed to create subfolder. Please try again.');
    }
  };

  // Combine errors
  const error = notesError || foldersError;
  // Combine loading states
  const isLoading = isLoadingNotes || isLoadingFolders;
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Beautiful Mind</h1>
        {error && <div className={styles.errorMessage}>{error}</div>}
      </header>
      
      <div className={styles.content}>
        <Sidebar 
          allTags={tags}
          rootFolders={rootFolders}
          folderTags={folderTags}
          onSelectFolder={handleSelectFolder}
          onBackToNotes={handleBackToNotes}
          onCreateFolder={handleCreateRootFolder}
          currentView={currentView}
          currentFolder={currentFolder}
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
              currentFolder={currentFolder}
              currentSubfolder={currentSubfolder}
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
              folderMetadata={activeFolderMetadata}
              currentSubfolder={currentSubfolder}
              notes={activeFolderNotes}
              subfolders={subfolderViews}
              allTags={tags}
              folderTags={folderTags}
              isLoading={isLoadingFolder}
              onCreateNote={handleCreateNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onCreateSubfolder={handleCreateSubfolder}
              onSelectSubfolder={handleSelectSubfolder}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
// src/apps/beautifulmind/components/BeautifulMind.tsx

import React, { useState } from 'react';
import { Note, Folder, ViewMode, MediaAttachment, UploadProgress, PendingMediaFile, FolderFormData } from '../types/notes.types';
import { useNotes } from '../hooks/useNotes';
import { useFolders } from '../hooks/useFolders';
import Navbar from './Navbar';
import NoteList from './NoteList';
import NoteView from './NoteView';
import NoteEditor from './NoteEditor';
import FolderList from './FolderList';
import FolderView from './FolderView';
import FolderEditor from './FolderEditor';
import styles from './BeautifulMind.module.css';

const BeautifulMind: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Lift media state to parent level - this survives component remounts
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<UploadProgress[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
  
  // New state for files during creation (before note exists)
  const [pendingFiles, setPendingFiles] = useState<PendingMediaFile[]>([]);
  
  const { notes, loading: notesLoading, error: notesError, createNote, updateNote, deleteNote, getNoteById } = useNotes();
  const { folders, loading: foldersLoading, error: foldersError, createFolder, updateFolder, deleteFolder, getFolderById } = useFolders();

  // Clear states helper
  const clearStates = () => {
    setPendingMedia([]);
    setPendingUploads([]);
    setDeletedMediaIds([]);
    setPendingFiles([]);
  };

  // Note handlers
  const handleNewNote = () => {
    setSelectedNote(null);
    setSelectedFolder(null);
    setIsCreatingNote(true);
    setIsCreatingFolder(false);
    clearStates();
    setViewMode('create');
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setSelectedFolder(null);
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    clearStates();
    setViewMode('view');
  };

  const handleNoteEdit = () => {
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    // When editing existing note, load its media into pending state
    if (selectedNote?.media_attachments) {
      setPendingMedia([...selectedNote.media_attachments]);
    }
    setDeletedMediaIds([]);
    setPendingFiles([]);
    setViewMode('edit');
  };

  const handleNoteDelete = async () => {
    if (!selectedNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(selectedNote.id);
        handleBackToList();
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  const handleNoteSave = async (data: { title: string; content: string }): Promise<Note> => {
    if (isCreatingNote || !selectedNote) {
      // Creating new note
      const newNote = await createNote(data);
      const finalNote = getNoteById(newNote.id) || newNote;
      
      setSelectedNote(finalNote);
      setIsCreatingNote(false);
      setViewMode('view');
      clearStates();
      
      return finalNote;
    } else {
      // Updating existing note
      const updatedNote = await updateNote(selectedNote.id, data);
      const finalNote = getNoteById(updatedNote.id) || updatedNote;
      
      setSelectedNote(finalNote);
      setViewMode('view');
      clearStates();
      return finalNote;
    }
  };

  // Folder handlers
  const handleNewFolder = (parentId?: string) => {
    setSelectedNote(null);
    setIsCreatingNote(false);
    setIsCreatingFolder(true);
    clearStates();
    // Store parent folder info for subfolder creation
    if (parentId) {
      const parentFolder = folders.find(f => f.id === parentId);
      setSelectedFolder({ 
        id: '', // This will be generated on save
        title: '',
        description: '',
        parent_folder_id: parentId,
        user_id: '',
        created_at: '',
        updated_at: '',
        // Include parent folder title for display
        parentTitle: parentFolder?.title || 'Parent Folder'
      } as any);
    } else {
      setSelectedFolder(null);
    }
    setViewMode('folder-create');
  };

  const handleFolderClick = (folder: Folder) => {
    setSelectedNote(null);
    setSelectedFolder(folder);
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    clearStates();
    setViewMode('folder-view');
  };

  const handleFolderEdit = () => {
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    setViewMode('folder-edit');
  };

  const handleFolderDelete = async () => {
    if (!selectedFolder) return;
    
    if (window.confirm('Are you sure you want to delete this folder? Notes will not be deleted.')) {
      try {
        await deleteFolder(selectedFolder.id);
        handleBackToList();
      } catch (err) {
        console.error('Failed to delete folder:', err);
      }
    }
  };

  const handleFolderSave = async (data: FolderFormData): Promise<Folder> => {
    if (isCreatingFolder || !selectedFolder) {
      // Creating new folder
      const newFolder = await createFolder(data);
      setSelectedFolder(newFolder);
      setIsCreatingFolder(false);
      setViewMode('folder-view');
      return newFolder;
    } else {
      // Updating existing folder
      const updatedFolder = await updateFolder(selectedFolder.id, data);
      setSelectedFolder(updatedFolder);
      setViewMode('folder-view');
      return updatedFolder;
    }
  };

  // Navigation handlers
  const handleCancel = () => {
    if (isCreatingNote || isCreatingFolder) {
      handleBackToList();
    } else if (viewMode === 'edit') {
      setViewMode('view');
    } else if (viewMode === 'folder-edit') {
      setViewMode('folder-view');
    }
    clearStates();
  };

  const handleBackToList = () => {
    // Determine which list to return to
    if (viewMode.startsWith('folder') || selectedFolder) {
      setViewMode('folders');
    } else {
      setViewMode('list');
    }
    
    setSelectedNote(null);
    setSelectedFolder(null);
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    clearStates();
  };

  const handleSwitchToNotes = () => {
    setViewMode('list');
    setSelectedNote(null);
    setSelectedFolder(null);
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    clearStates();
  };

  const handleSwitchToFolders = () => {
    setViewMode('folders');
    setSelectedNote(null);
    setSelectedFolder(null);
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    clearStates();
  };

  // Handle note click from folder view
  const handleFolderNoteClick = (noteId: string) => {
    const note = getNoteById(noteId);
    if (note) {
      handleNoteClick(note);
    }
  };

  const loading = notesLoading || foldersLoading;
  const error = notesError || foldersError;

  if (loading) {
    return (
      <div className={styles.container}>
        <Navbar
          viewMode={viewMode}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
          onBackToList={handleBackToList}
          onSwitchToNotes={handleSwitchToNotes}
          onSwitchToFolders={handleSwitchToFolders}
        />
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Navbar
          viewMode={viewMode}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
          onBackToList={handleBackToList}
          onSwitchToNotes={handleSwitchToNotes}
          onSwitchToFolders={handleSwitchToFolders}
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
        onNewFolder={handleNewFolder}
        onBackToList={handleBackToList}
        onSwitchToNotes={handleSwitchToNotes}
        onSwitchToFolders={handleSwitchToFolders}
      />
      
      <main className={styles.main}>
        {viewMode === 'list' && (
          <NoteList
            notes={notes}
            onNoteClick={handleNoteClick}
            onNoteDelete={deleteNote}
          />
        )}
        
        {viewMode === 'folders' && (
          <FolderList
            folders={folders}
            onFolderClick={handleFolderClick}
            onFolderDelete={deleteFolder}
            onCreateSubfolder={handleNewFolder}
          />
        )}
        
        {viewMode === 'view' && selectedNote && (
          <NoteView
            note={getNoteById(selectedNote.id) || selectedNote}
            onEdit={handleNoteEdit}
            onDelete={handleNoteDelete}
          />
        )}
        
        {viewMode === 'folder-view' && selectedFolder && (
          <FolderView
            folder={getFolderById(selectedFolder.id) || selectedFolder}
            allFolders={folders}
            onEdit={handleFolderEdit}
            onDelete={handleFolderDelete}
            onNoteClick={handleFolderNoteClick}
            onFolderClick={handleFolderClick}
            onCreateSubfolder={handleNewFolder}
            onNavigateToFolder={(folderId) => {
              if (folderId) {
                const folder = getFolderById(folderId);
                if (folder) handleFolderClick(folder);
              } else {
                handleSwitchToFolders();
              }
            }}
          />
        )}
        
        {(viewMode === 'create' || viewMode === 'edit') && (
          <NoteEditor
            note={selectedNote}
            onSave={handleNoteSave}
            onCancel={handleCancel}
            isCreating={isCreatingNote}
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
        
        {(viewMode === 'folder-create' || viewMode === 'folder-edit') && (
          <FolderEditor
            folder={selectedFolder}
            onSave={handleFolderSave}
            onCancel={handleCancel}
            isCreating={isCreatingFolder}
          />
        )}
      </main>
    </div>
  );
};

export default BeautifulMind;
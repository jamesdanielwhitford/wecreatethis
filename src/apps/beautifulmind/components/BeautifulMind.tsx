/**
 * File: src/apps/beautifulmind/components/BeautifulMind.tsx
 * Main component for the Beautiful Mind note-taking app
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './BeautifulMind.module.css';
import FolderTree from './FolderTree';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import BreadcrumbNav from './BreadcrumbNav';
import SearchBar from './SearchBar';
import FolderSuggestionModal from './FolderSuggestionModal';
import Login from './Login';
import AuthProvider, { useAuthContext } from './AuthProvider';
import { Note, FolderSuggestion } from '../types';
import { getNoteById, generateEmbedding, semanticSearch, getFolderSuggestions } from '../utils';

interface BeautifulMindProps {
  initialUserId?: string;
}

export const BeautifulMindContent: React.FC = () => {
  const { user, isLoading: authLoading, signOut } = useAuthContext();
  const userId = user?.uid;
  
  // Selected folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string[]>([]);
  
  // Note state
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [isNewNote, setIsNewNote] = useState<boolean>(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Folder suggestion state
  const [showFolderSuggestions, setShowFolderSuggestions] = useState<boolean>(false);
  
  // Update folder path when folder is selected
  useEffect(() => {
    // In a real app, we would fetch the full path from Firestore
    // For now, we'll use a simplified approach
    if (selectedFolderId) {
      setFolderPath([selectedFolderId]);
    } else {
      setFolderPath([]);
    }
  }, [selectedFolderId]);
  
  // If not authenticated, show login screen
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }
  
  if (!userId) {
    return <Login />;
  }
  
  // Handle folder selection
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    // Clear search when changing folders
    setSearchQuery('');
    setSearchResults(null);
    // Clear active note
    setActiveNote(null);
    setIsEditingNote(false);
  };
  
  // Handle note selection
  const handleNoteSelect = (note: Note) => {
    setActiveNote(note);
    setIsEditingNote(false);
    setIsNewNote(false);
  };
  
  // Handle creating a new note
  const handleCreateNote = () => {
    setActiveNote(null);
    setIsEditingNote(true);
    setIsNewNote(true);
  };
  
  // Handle editing an existing note
  const handleEditNote = () => {
    setIsEditingNote(true);
    setIsNewNote(false);
  };
  
  // Handle saving a note
  const handleSaveNote = (note: Note) => {
    setActiveNote(note);
    setIsEditingNote(false);
    
    // Reset search results if we were searching
    if (searchQuery) {
      setSearchQuery('');
      setSearchResults(null);
    }
  };
  
  // Handle canceling note editing
  const handleCancelEdit = () => {
    setIsEditingNote(false);
    if (isNewNote) {
      setActiveNote(null);
    }
  };
  
  // Handle deleting a note
  const handleDeleteNote = (noteId: string) => {
    if (activeNote && activeNote.id === noteId) {
      setActiveNote(null);
      setIsEditingNote(false);
    }
  };
  
  // Handle search
  const handleSearchResults = (results: Note[], query: string) => {
    setSearchResults(results);
    setSearchQuery(query);
  };
  
  // Handle clearing search
  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
  };
  
  // Handle showing folder suggestions
  const handleShowFolderSuggestions = () => {
    setShowFolderSuggestions(true);
  };
  
  // Handle folder suggestion success
  const handleFolderSuggestionSuccess = (folderId: string, folderName: string, noteIds: string[]) => {
    // Close the suggestion modal
    setShowFolderSuggestions(false);
    
    // Navigate to the new folder
    handleFolderSelect(folderId);
    
    // Show a success message (in a real app, you'd add a toast notification here)
    console.log(`Created folder "${folderName}" with ${noteIds.length} notes`);
  };
  
  // Render folder suggestion modal
  const renderSuggestionModal = () => {
    if (!showSuggestions) return null;
    
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Suggested Folders</h3>
            <button 
              className={styles.closeButton}
              onClick={() => setShowSuggestions(false)}
            >
              ×
            </button>
          </div>
          
          <div className={styles.modalContent}>
            {folderSuggestions.length === 0 ? (
              <p className={styles.noSuggestions}>
                No folder suggestions available. Add more notes to get suggestions.
              </p>
            ) : (
              <ul className={styles.suggestionsList}>
                {folderSuggestions.map((suggestion, index) => (
                  <li key={index} className={styles.suggestionItem}>
                    <div className={styles.suggestionInfo}>
                      <h4 className={styles.suggestionName}>{suggestion.folderName}</h4>
                      <span className={styles.suggestionNotes}>
                        {suggestion.noteIds.length} notes • 
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <button 
                      className={styles.acceptButton}
                      onClick={() => handleAcceptSuggestion(suggestion)}
                    >
                      Create Folder
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className={styles.modalFooter}>
            <button 
              className={styles.closeModalButton}
              onClick={() => setShowSuggestions(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={styles.beautifulMind}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>Beautiful Mind</h1>
        
        <div className={styles.searchBar}>
          <SearchBar 
            userId={userId}
            onSearchResults={handleSearchResults}
            onClearSearch={handleClearSearch}
          />
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.suggestButton}
            onClick={handleShowFolderSuggestions}
            title="Get folder suggestions based on your notes"
          >
            Suggest Folders
          </button>
          
          <button
            className={styles.signOutButton}
            onClick={signOut}
            title="Sign out"
          >
            Sign Out
          </button>
          
          {user?.displayName && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.displayName}</span>
            </div>
          )}
        </div>
      </header>
      
      <main className={styles.mainContainer}>
        <aside className={styles.sidebarLeft}>
          <FolderTree
            userId={userId}
            selectedFolderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
          />
        </aside>
        
        <div className={styles.contentWrapper}>
          <BreadcrumbNav 
            folderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
          />
          
          <div className={styles.contentSplit}>
            <aside className={styles.sidebarRight}>
              <NoteList
                userId={userId}
                folderId={selectedFolderId}
                activeNoteId={activeNote?.id || null}
                onNoteSelect={handleNoteSelect}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                searchQuery={searchQuery}
                searchResults={searchResults || undefined}
              />
                </aside>
            
            <section className={styles.contentArea}>
              {isEditingNote ? (
                <NoteEditor
                  userId={userId}
                  activeNote={activeNote}
                  folderPath={folderPath}
                  onSave={handleSaveNote}
                  onCancel={handleCancelEdit}
                  isNewNote={isNewNote}
                />
              ) : activeNote ? (
                <div className={styles.noteViewer}>
                  <div className={styles.viewerHeader}>
                    <h2 className={styles.noteTitle}>{activeNote.title || 'Untitled'}</h2>
                    <button 
                      className={styles.editButton}
                      onClick={handleEditNote}
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div className={styles.noteContent}>
                    {activeNote.text ? (
                      <p className={styles.noteText}>{activeNote.text}</p>
                    ) : (
                      <p className={styles.emptyNote}>This note is empty.</p>
                    )}
                  </div>
                  
                  <div className={styles.viewerFooter}>
                    <span className={styles.timestamp}>
                      Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className={styles.welcomeState}>
                  <h2 className={styles.welcomeTitle}>Welcome to Beautiful Mind</h2>
                  <p className={styles.welcomeText}>
                    Select a note from the list or create a new one to get started.
                  </p>
                  <button 
                    className={styles.createWelcomeButton}
                    onClick={handleCreateNote}
                  >
                    Create a New Note
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      
      {/* Folder Suggestion Modal */}
      {showFolderSuggestions && (
        <FolderSuggestionModal
          userId={userId}
          onClose={() => setShowFolderSuggestions(false)}
          onSuccess={handleFolderSuggestionSuccess}
        />
      )}
    </div>
  );
};

export const BeautifulMind: React.FC<BeautifulMindProps> = ({ initialUserId }) => {
  return (
    <AuthProvider>
      <BeautifulMindContent />
    </AuthProvider>
  );
};

export default BeautifulMind;
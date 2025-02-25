import React, { useState, useEffect } from 'react';
import styles from './FolderView.module.css';
import { Note, FolderMetadata, SubfolderView } from '../types';
import Image from 'next/image';
import { FolderManager } from './FolderManager';

interface FolderViewProps {
  folderMetadata: FolderMetadata | null;
  currentSubfolder: string | null;
  notes: Note[];
  subfolders: SubfolderView[];
  allTags: string[];
  folderTags: string[];
  isLoading?: boolean;
  onCreateNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => Promise<boolean>;
  onCreateSubfolder: (folderName: string) => void;
  onSelectSubfolder: (tag: string | null) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({ 
  folderMetadata,
  currentSubfolder,
  notes, 
  subfolders,
  allTags,
  folderTags,
  isLoading = false,
  onCreateNote, 
  onEditNote, 
  onDeleteNote,
  onCreateSubfolder,
  onSelectSubfolder
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  
  // If we don't have folder metadata (shouldn't happen)
  if (!folderMetadata) {
    return <div className={styles.errorState}>Folder not found</div>;
  }

  // Filter the notes based on current subfolder selection
  const filteredNotes = currentSubfolder 
    ? notes.filter(note => note.tags.includes(currentSubfolder))
    : notes;
  
  const sortedNotes = [...filteredNotes].sort((a, b) => b.updatedAt - a.updatedAt);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      setInternalLoading(true);
      try {
        await onDeleteNote(noteId);
      } finally {
        setInternalLoading(false);
      }
    }
  };

  // Use either external loading state or internal loading state
  const isLoadingState = isLoading || internalLoading;

  return (
    <div className={styles.folderViewContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {folderMetadata.name}
          {currentSubfolder && <span className={styles.subfolderTitle}> / {currentSubfolder}</span>}
        </h2>
        <button 
          className={styles.createButton}
          onClick={onCreateNote}
        >
          New Note
        </button>
      </div>
      
      <div className={styles.subfolderNavigation}>
        <button 
          className={`${styles.subfolderButton} ${!currentSubfolder ? styles.active : ''}`}
          onClick={() => onSelectSubfolder(null)}
        >
          All
        </button>
        {subfolders.map(subfolder => (
          <button 
            key={subfolder.id} 
            className={`${styles.subfolderButton} ${currentSubfolder === subfolder.tag ? styles.active : ''}`}
            onClick={() => onSelectSubfolder(subfolder.tag)}
          >
            {subfolder.name} ({subfolder.count})
          </button>
        ))}
        
        <div className={styles.createSubfolderContainer}>
          <FolderManager 
            availableTags={allTags}
            existingFolderTags={folderTags}
            onCreateFolder={onCreateSubfolder}
          />
        </div>
      </div>
      
      {isLoadingState ? (
        <div className={styles.loadingState}>
          <p>Loading...</p>
        </div>
      ) : sortedNotes.length > 0 ? (
        <div className={styles.noteGrid}>
          {sortedNotes.map(note => (
            <div 
              key={note.id} 
              className={styles.noteCard}
              onClick={() => onEditNote(note)}
            >
              <div className={styles.noteContent}>
                {note.type === 'image' && note.imageData && (
                  <div className={styles.imagePreview}>
                    <Image 
                      src={note.imageData} 
                      alt={note.title} 
                      width={300} 
                      height={200} 
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                <h3 className={styles.noteTitle}>{note.title}</h3>
                {note.type === 'text' && (
                  <p className={styles.noteText}>{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
                )}
                <div className={styles.noteFooter}>
                  <div className={styles.noteDate}>
                    {formatDate(note.updatedAt)}
                  </div>
                  <div className={styles.noteTags}>
                    {note.tags.map(tag => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                className={styles.deleteButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>
            {currentSubfolder 
              ? `No notes with tags "${folderMetadata.tag}" and "${currentSubfolder}". Add notes with both tags to see them here.`
              : `No notes with tag "${folderMetadata.tag}". Add notes with this tag to see them here.`
            }
          </p>
        </div>
      )}
    </div>
  );
};
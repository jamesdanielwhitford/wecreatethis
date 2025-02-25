import React, { useState } from 'react';
import styles from './FolderView.module.css';
import { Note } from '../types';
import Image from 'next/image';

interface FolderViewProps {
  folderTag: string;
  notes: Note[];
  onCreateNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({ 
  folderTag, 
  notes, 
  onCreateNote, 
  onEditNote, 
  onDeleteNote 
}) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  
  // Find all other tags that are used together with the current folder tag
  const getSubfolderTags = () => {
    const subfoldersSet = new Set<string>();
    
    notes.forEach(note => {
      note.tags.forEach(tag => {
        // Only include tags that are not the current folder tag
        if (tag !== folderTag) {
          subfoldersSet.add(tag);
        }
      });
    });
    
    return Array.from(subfoldersSet);
  };
  
  const subfolderTags = getSubfolderTags();
  
  // Filter notes based on selected subfolder
  const getFilteredNotes = () => {
    if (!selectedSubfolder) {
      return notes;
    }
    
    return notes.filter(note => note.tags.includes(selectedSubfolder));
  };
  
  const filteredNotes = getFilteredNotes();
  const sortedNotes = [...filteredNotes].sort((a, b) => b.updatedAt - a.updatedAt);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={styles.folderViewContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{folderTag}</h2>
        <button 
          className={styles.createButton}
          onClick={onCreateNote}
        >
          New Note
        </button>
      </div>
      
      {subfolderTags.length > 0 && (
        <div className={styles.subfolders}>
          <button 
            className={`${styles.subfolder} ${!selectedSubfolder ? styles.active : ''}`}
            onClick={() => setSelectedSubfolder(null)}
          >
            All
          </button>
          {subfolderTags.map(tag => (
            <button 
              key={tag} 
              className={`${styles.subfolder} ${selectedSubfolder === tag ? styles.active : ''}`}
              onClick={() => setSelectedSubfolder(tag === selectedSubfolder ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      
      {sortedNotes.length > 0 ? (
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
                      alt="Note" 
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
                  if (window.confirm('Are you sure you want to delete this note?')) {
                    onDeleteNote(note.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No notes in this folder. Create a note and add the tag &quot;{folderTag}&quot; to it.</p>
        </div>
      )}
    </div>
  );
};
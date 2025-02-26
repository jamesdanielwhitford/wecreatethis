import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { localStorageService } from '../services/localStorageService';


export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load notes with image data
        const loadedNotes = await localStorageService.getNotes();
        setNotes(loadedNotes);
        
        // Load tags
        const storedTags = localStorageService.getTags();
        setTags(storedTags);
      } catch (err) {
        console.error('Error loading notes:', err);
        setError('Failed to load notes. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Add a new note
  const addNote = useCallback(async (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    try {
      setError(null);
      
      // Add to storage and get updated metadata
      await localStorageService.addNote(noteData);
      
      // Reload notes with image data
      const updatedNotes = await localStorageService.getNotes();
      setNotes(updatedNotes);
      
      // Update tags
      const updatedTags = localStorageService.getTags();
      setTags(updatedTags);
      
      return true;
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
      return false;
    }
  }, []);

  // Update an existing note
  const updateNote = useCallback(async (updatedNote: Note) => {
    try {
      setError(null);
      
      // Update in storage
      await localStorageService.updateNote(updatedNote);
      
      // Reload notes with image data
      const updatedNotes = await localStorageService.getNotes();
      setNotes(updatedNotes);
      
      // Update tags
      const updatedTags = localStorageService.getTags();
      setTags(updatedTags);
      
      return true;
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note. Please try again.');
      return false;
    }
  }, []);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      setError(null);
      
      // Delete from storage
      await localStorageService.deleteNote(noteId);
      
      // Update local state
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
      // Update tags
      const updatedTags = localStorageService.getTags();
      setTags(updatedTags);
      
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
      return false;
    }
  }, []);

  // Get notes by tag, including hierarchical support
  const getNotesByTag = useCallback(async (tag: string): Promise<Note[]> => {
    try {
      // Get all notes that exactly match the tag
      const exactMatches = await localStorageService.getNotesByTag(tag);
      
      // For hierarchical folders, we need to also get notes with child folder tags
      // For example, if tag is "Design", also get notes with "Design/Art", "Design/Art/Painting", etc.
      const childMatches = notes.filter(note => 
        note.tags.some(noteTag => 
          noteTag !== tag && noteTag.startsWith(`${tag}/`)
        )
      );
      
      // For backward compatibility: if tag is hierarchical (e.g., "Design/Art"),
      // also include notes that have separate tags for each level
      let legacyMatches: Note[] = [];
      if (tag.includes('/')) {
        // Get the individual parts (e.g., ["Design", "Art"])
        const parts = tag.split('/');
        // Find notes that have all these parts as separate tags
        legacyMatches = notes.filter(note => 
          parts.every(part => note.tags.includes(part))
        );
      }
      
      // Combine all types of matches, removing duplicates
      const allNotes = [...exactMatches];
      
      const addUniqueNotes = (notesToAdd: Note[]) => {
        notesToAdd.forEach(noteToAdd => {
          if (!allNotes.some(note => note.id === noteToAdd.id)) {
            allNotes.push(noteToAdd);
          }
        });
      };
      
      addUniqueNotes(childMatches);
      addUniqueNotes(legacyMatches);
      
      return allNotes;
    } catch (err) {
      console.error('Error getting notes by tag:', err);
      setError('Failed to load notes for this folder.');
      return [];
    }
  }, [notes]);

  return {
    notes,
    tags,
    isLoading,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNotesByTag
  };
};
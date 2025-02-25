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
  const addNote = useCallback(async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  // Get notes by tag
  const getNotesByTag = useCallback(async (tag: string): Promise<Note[]> => {
    try {
      return await localStorageService.getNotesByTag(tag);
    } catch (err) {
      console.error('Error getting notes by tag:', err);
      setError('Failed to load notes for this folder.');
      return [];
    }
  }, []);

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
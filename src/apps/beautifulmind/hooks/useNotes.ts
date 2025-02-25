import { useState, useEffect } from 'react';
import { Note } from '../types';
import { localStorageService } from '../services/localStorageService';
import { v4 as uuidv4 } from 'uuid';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    // Load initial data from localStorage
    const storedNotes = localStorageService.getNotes();
    setNotes(storedNotes);
    
    const storedTags = localStorageService.getTags();
    setTags(storedTags);
  }, []);

  const addNote = (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const timestamp = Date.now();
    const newNote: Note = {
      ...noteData,
      id: uuidv4(),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    const updatedNotes = localStorageService.addNote(newNote);
    setNotes(updatedNotes);
    
    // Update tags if necessary
    updateTagsList();
  };

  const updateNote = (updatedNote: Note) => {
    const noteToUpdate = {
      ...updatedNote,
      updatedAt: Date.now()
    };
    
    const updatedNotes = localStorageService.updateNote(noteToUpdate);
    setNotes(updatedNotes);
    
    // Update tags if necessary
    updateTagsList();
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = localStorageService.deleteNote(noteId);
    setNotes(updatedNotes);
    
    // Recalculate tags after deletion
    const updatedTags = localStorageService.getTags();
    setTags(updatedTags);
  };

  const getNotesByTag = (tag: string) => {
    return localStorageService.getNotesByTag(tag);
  };

  // Helper to update tags list
  const updateTagsList = () => {
    const updatedTags = localStorageService.getTags();
    setTags(updatedTags);
  };

  return {
    notes,
    tags,
    addNote,
    updateNote,
    deleteNote,
    getNotesByTag
  };
};
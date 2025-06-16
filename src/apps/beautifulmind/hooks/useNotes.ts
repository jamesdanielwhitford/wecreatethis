// src/apps/beautifulmind/hooks/useNotes.ts

import { useState, useEffect } from 'react';
import { Note, NoteFormData } from '../types/notes.types';
import { notesService } from '../utils/api';

// Helper function to auto-process embeddings
async function autoProcessEmbeddings(): Promise<void> {
  try {
    console.log('Auto-processing note embeddings...');
    
    const response = await fetch('/api/embeddings/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 10 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Auto-embedding processing failed:', errorText);
    } else {
      const result = await response.json();
      console.log('Auto-embedding processing completed:', result);
    }
  } catch (error) {
    console.warn('Auto-embedding processing error:', error);
    // Don't throw - this is a background process
  }
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.getAllNotes();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  // Create a new note
  const createNote = async (noteData: NoteFormData) => {
    try {
      const newNote = await notesService.createNote(noteData);
      // Add the new note to the list immediately
      setNotes(prev => [newNote, ...prev]);
      
      // Auto-process embeddings in the background
      setTimeout(async () => {
        await autoProcessEmbeddings();
      }, 1000);
      
      return newNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      throw err;
    }
  };

  // Update an existing note
  const updateNote = async (id: string, updates: Partial<NoteFormData>) => {
    try {
      const updatedNote = await notesService.updateNote(id, updates);
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));
      
      // Auto-process embeddings in the background (content may have changed)
      setTimeout(async () => {
        await autoProcessEmbeddings();
      }, 1000);
      
      return updatedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      throw err;
    }
  };

  // Delete a note
  const deleteNote = async (id: string) => {
    try {
      await notesService.deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      throw err;
    }
  };

  // Generate title for a note
  const generateNoteTitle = async (id: string) => {
    try {
      const result = await notesService.generateTitle(id);
      
      // Update the specific note in the list
      setNotes(prev => prev.map(note => 
        note.id === id ? result.note : note
      ));
      
      // Auto-process embeddings since title changed
      setTimeout(async () => {
        await autoProcessEmbeddings();
      }, 1000);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate title');
      throw err;
    }
  };

  // Get a single note by ID with fresh data
  const getNoteById = (id: string) => {
    return notes.find(note => note.id === id);
  };

  // Update a specific note in the list (useful for real-time updates)
  const updateNoteInList = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    ));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    generateNoteTitle,
    getNoteById,
    updateNoteInList,
    refreshNotes: fetchNotes
  };
};
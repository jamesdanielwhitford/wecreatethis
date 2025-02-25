import { Note } from '../types';

const NOTES_STORAGE_KEY = 'beautiful-mind-notes';

export const localStorageService = {
  getNotes: (): Note[] => {
    if (typeof window === 'undefined') return [];
    
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    return storedNotes ? JSON.parse(storedNotes) : [];
  },

  saveNotes: (notes: Note[]): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  },

  addNote: (note: Note): Note[] => {
    const notes = localStorageService.getNotes();
    const updatedNotes = [...notes, note];
    localStorageService.saveNotes(updatedNotes);
    return updatedNotes;
  },

  updateNote: (updatedNote: Note): Note[] => {
    const notes = localStorageService.getNotes();
    const updatedNotes = notes.map(note => 
      note.id === updatedNote.id ? updatedNote : note
    );
    localStorageService.saveNotes(updatedNotes);
    return updatedNotes;
  },

  deleteNote: (noteId: string): Note[] => {
    const notes = localStorageService.getNotes();
    const updatedNotes = notes.filter(note => note.id !== noteId);
    localStorageService.saveNotes(updatedNotes);
    return updatedNotes;
  },

  getTags: (): string[] => {
    const notes = localStorageService.getNotes();
    const tags = new Set<string>();
    
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags);
  },

  getNotesByTag: (tag: string): Note[] => {
    const notes = localStorageService.getNotes();
    return notes.filter(note => note.tags.includes(tag));
  }
};
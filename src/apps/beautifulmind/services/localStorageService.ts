import { Note, NoteMetadata } from '../types';
import { indexedDBService } from './indexedDBService';
import { v4 as uuidv4 } from 'uuid';

const NOTES_STORAGE_KEY = 'beautiful-mind-notes';

export const localStorageService = {
  /**
   * Get all notes metadata from localStorage
   */
  getNotesMetadata: (): NoteMetadata[] => {
    if (typeof window === 'undefined') return [];
    
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    return storedNotes ? JSON.parse(storedNotes) : [];
  },

  /**
   * Save notes metadata to localStorage
   */
  saveNotesMetadata: (notes: NoteMetadata[]): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  },

  /**
   * Get a single note with its image data (if applicable)
   */
  getNote: async (noteId: string): Promise<Note | null> => {
    const notesMetadata = localStorageService.getNotesMetadata();
    const noteMetadata = notesMetadata.find(note => note.id === noteId);
    
    if (!noteMetadata) return null;
    
    // If it's an image note, fetch the image data from IndexedDB
    if (noteMetadata.type === 'image' && noteMetadata.imageId) {
      try {
        const imageData = await indexedDBService.getImage(noteMetadata.imageId);
        
        return {
          ...noteMetadata,
          imageData: imageData || undefined
        };
      } catch (error) {
        console.error('Error fetching image data:', error);
        return noteMetadata as Note;
      }
    }
    
    // For text notes, just return the metadata as is
    return noteMetadata as Note;
  },

  /**
   * Get all notes with their image data (if applicable)
   */
  getNotes: async (): Promise<Note[]> => {
    const notesMetadata = localStorageService.getNotesMetadata();
    
    // Load each note individually to get image data for image notes
    const notesPromises = notesMetadata.map(async noteMetadata => {
      if (noteMetadata.type === 'image' && noteMetadata.imageId) {
        try {
          const imageData = await indexedDBService.getImage(noteMetadata.imageId);
          
          return {
            ...noteMetadata,
            imageData: imageData || undefined
          };
        } catch (error) {
          console.error(`Error fetching image for note ${noteMetadata.id}:`, error);
          return noteMetadata as Note;
        }
      }
      
      return noteMetadata as Note;
    });
    
    return Promise.all(notesPromises);
  },

  /**
   * Add a new note
   */
  addNote: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<NoteMetadata[]> => {
    const timestamp = Date.now();
    const id = uuidv4();
    let imageId: string | undefined = undefined;
    
    // If it's an image note, store the image data in IndexedDB
    if (note.type === 'image' && note.imageData) {
      try {
        imageId = `img_${id}`;
        await indexedDBService.saveImage(imageId, note.imageData);
      } catch (error) {
        console.error('Error saving image data:', error);
        throw new Error('Could not save image data. Please try again.');
      }
    }
    
    // Create note metadata (without image data)
    const newNoteMetadata: NoteMetadata = {
      id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      type: note.type,
      imageId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Save metadata to localStorage
    const notesMetadata = localStorageService.getNotesMetadata();
    const updatedNotesMetadata = [...notesMetadata, newNoteMetadata];
    localStorageService.saveNotesMetadata(updatedNotesMetadata);
    
    return updatedNotesMetadata;
  },

  /**
   * Update an existing note
   */
  updateNote: async (updatedNote: Note): Promise<NoteMetadata[]> => {
    const notesMetadata = localStorageService.getNotesMetadata();
    const existingNoteIndex = notesMetadata.findIndex(note => note.id === updatedNote.id);
    
    if (existingNoteIndex === -1) {
      return notesMetadata;
    }
    
    const existingNote = notesMetadata[existingNoteIndex];
    let imageId = existingNote.imageId;
    
    // Handle image data if needed
    if (updatedNote.type === 'image') {
      if (updatedNote.imageData) {
        // Image data changed or new image
        try {
          if (!imageId) {
            imageId = `img_${updatedNote.id}`;
          }
          await indexedDBService.saveImage(imageId, updatedNote.imageData);
        } catch (error) {
          console.error('Error updating image data:', error);
          throw new Error('Could not update image data. Please try again.');
        }
      }
    } else if (existingNote.type === 'image' && existingNote.imageId) {
      // Note changed from image to text - delete old image
      try {
        await indexedDBService.deleteImage(existingNote.imageId);
        imageId = undefined;
      } catch (error) {
        console.error('Error deleting old image data:', error);
      }
    }
    
    // Update note metadata
    const updatedNoteMetadata: NoteMetadata = {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      tags: updatedNote.tags,
      type: updatedNote.type,
      imageId,
      createdAt: existingNote.createdAt,
      updatedAt: Date.now()
    };
    
    // Save updated metadata
    const updatedNotesMetadata = [...notesMetadata];
    updatedNotesMetadata[existingNoteIndex] = updatedNoteMetadata;
    localStorageService.saveNotesMetadata(updatedNotesMetadata);
    
    return updatedNotesMetadata;
  },

  /**
   * Delete a note
   */
  deleteNote: async (noteId: string): Promise<NoteMetadata[]> => {
    const notesMetadata = localStorageService.getNotesMetadata();
    const noteToDelete = notesMetadata.find(note => note.id === noteId);
    
    // If it's an image note, delete the image data from IndexedDB
    if (noteToDelete && noteToDelete.type === 'image' && noteToDelete.imageId) {
      try {
        await indexedDBService.deleteImage(noteToDelete.imageId);
      } catch (error) {
        console.error('Error deleting image data:', error);
      }
    }
    
    // Update metadata in localStorage
    const updatedNotesMetadata = notesMetadata.filter(note => note.id !== noteId);
    localStorageService.saveNotesMetadata(updatedNotesMetadata);
    
    return updatedNotesMetadata;
  },

  /**
   * Get all unique tags from notes
   */
  getTags: (): string[] => {
    const notesMetadata = localStorageService.getNotesMetadata();
    const tags = new Set<string>();
    
    notesMetadata.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags);
  },

  /**
   * Get notes with a specific tag
   */
  getNotesByTag: async (tag: string): Promise<Note[]> => {
    const notes = await localStorageService.getNotes();
    return notes.filter(note => note.tags.includes(tag));
  }
};
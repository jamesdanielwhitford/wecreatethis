// src/apps/beautifulmind/utils/api.ts

import { Note, MediaAttachment, NoteFormData } from '../types/notes.types';

// Base API URL - will work for both local development and Vercel deployment
const API_BASE = '/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Media service
export const mediaService = {
  async uploadFiles(noteId: string, files: File[]): Promise<MediaAttachment[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await fetch(`${API_BASE}/notes/${noteId}/media`, {
      method: 'POST',
      body: formData
    });
    
    return handleResponse<MediaAttachment[]>(response);
  },
  
  async deleteAttachment(attachmentId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/media/${attachmentId}`, {
      method: 'DELETE'
    });
    
    await handleResponse<{ message: string }>(response);
  }
};

// Notes service
export const notesService = {
  async getAllNotes(): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/notes`);
    return handleResponse<Note[]>(response);
  },

  async getNoteById(id: string): Promise<Note | null> {
    try {
      const response = await fetch(`${API_BASE}/notes/${id}`);
      return handleResponse<Note>(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createNote(note: NoteFormData): Promise<Note> {
    const response = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(note)
    });
    
    return handleResponse<Note>(response);
  },

  async updateNote(id: string, updates: Partial<NoteFormData>): Promise<Note> {
    const response = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    return handleResponse<Note>(response);
  },

  async deleteNote(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE'
    });
    
    await handleResponse<{ message: string }>(response);
  }
};
// src/apps/beautifulmind/utils/api.ts

import { Note, MediaAttachment, NoteFormData, Folder } from '../types/notes.types';

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
  async uploadFiles(noteId: string, files: File[], shouldTranscribe?: boolean[], shouldDescribe?: boolean[], descriptions?: string[]): Promise<MediaAttachment[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add transcription flags if provided
    if (shouldTranscribe) {
      shouldTranscribe.forEach((flag, index) => {
        formData.append(`transcribe_${index}`, flag.toString());
      });
    }
    
    // Add description flags and manual descriptions if provided
    if (shouldDescribe) {
      shouldDescribe.forEach((flag, index) => {
        formData.append(`describe_${index}`, flag.toString());
      });
    }
    
    if (descriptions) {
      descriptions.forEach((description, index) => {
        if (description && description.trim()) {
          formData.append(`description_${index}`, description.trim());
        }
      });
    }
    
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
  },

  async retryTranscription(attachmentId: string): Promise<MediaAttachment> {
    const response = await fetch(`${API_BASE}/media/${attachmentId}/transcribe`, {
      method: 'POST'
    });
    
    return handleResponse<MediaAttachment>(response);
  },

  async getTranscription(attachmentId: string): Promise<{ status: string; text?: string; error?: string }> {
    const response = await fetch(`${API_BASE}/media/${attachmentId}/transcription`);
    
    return handleResponse<{ status: string; text?: string; error?: string }>(response);
  },

  async generateDescription(attachmentId: string): Promise<MediaAttachment> {
    const response = await fetch(`${API_BASE}/media/${attachmentId}/describe`, {
      method: 'POST'
    });
    
    return handleResponse<MediaAttachment>(response);
  },

  async updateDescription(attachmentId: string, description: string): Promise<MediaAttachment> {
    const response = await fetch(`${API_BASE}/media/${attachmentId}/describe`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description })
    });
    
    return handleResponse<MediaAttachment>(response);
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
  },

  async generateTitle(noteId: string): Promise<{ note: Note; title: string; message: string }> {
    const response = await fetch(`${API_BASE}/notes/${noteId}/generate-title`, {
      method: 'POST'
    });
    
    return handleResponse<{ note: Note; title: string; message: string }>(response);
  },

  // NEW: Get folders containing a note
  async getNoteFolders(noteId: string): Promise<{ note: { id: string; title: string }; folders: Folder[] }> {
    const response = await fetch(`${API_BASE}/notes/${noteId}/folders`);
    return handleResponse<{ note: { id: string; title: string }; folders: Folder[] }>(response);
  },

  // NEW: Get AI-suggested folders for a note
  async getSuggestedFolders(noteId: string, threshold: number = 0.5, limit: number = 10): Promise<{
    note: { id: string; title: string };
    suggested_folders: Array<{
      folder: Folder;
      similarity_score: number;
      match_reason: string;
    }>;
    total_suggestions: number;
  }> {
    const response = await fetch(`${API_BASE}/notes/${noteId}/suggested-folders?threshold=${threshold}&limit=${limit}`);
    return handleResponse<{
      note: { id: string; title: string };
      suggested_folders: Array<{
        folder: Folder;
        similarity_score: number;
        match_reason: string;
      }>;
      total_suggestions: number;
    }>(response);
  }
};

// NEW: Folder management service for manual folder-note relationships
export const folderManagementService = {
  // Get notes manually added to a folder
  async getFolderNotes(folderId: string): Promise<{
    folder: Folder;
    notes: Note[];
    total_notes: number;
  }> {
    const response = await fetch(`${API_BASE}/folders/${folderId}/notes`);
    return handleResponse<{
      folder: Folder;
      notes: Note[];
      total_notes: number;
    }>(response);
  },

  // Add a note to a folder manually
  async addNoteToFolder(folderId: string, noteId: string): Promise<{
    message: string;
    folder: { id: string; title: string };
    note: { id: string; title: string };
    added_at: string;
  }> {
    const response = await fetch(`${API_BASE}/folders/${folderId}/notes/${noteId}`, {
      method: 'POST'
    });
    return handleResponse<{
      message: string;
      folder: { id: string; title: string };
      note: { id: string; title: string };
      added_at: string;
    }>(response);
  },

  // Remove a note from a folder
  async removeNoteFromFolder(folderId: string, noteId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/folders/${folderId}/notes/${noteId}`, {
      method: 'DELETE'
    });
    return handleResponse<{ message: string }>(response);
  },

  // Get AI-suggested notes for a folder
  async getSuggestedNotes(folderId: string, threshold: number = 0.5, limit: number = 20): Promise<{
    folder: { id: string; title: string; description?: string };
    suggested_notes: Array<{
      note: Note;
      similarity_score: number;
      match_reason: string;
    }>;
    total_suggestions: number;
  }> {
    const response = await fetch(`${API_BASE}/folders/${folderId}/suggested-notes?threshold=${threshold}&limit=${limit}`);
    return handleResponse<{
      folder: { id: string; title: string; description?: string };
      suggested_notes: Array<{
        note: Note;
        similarity_score: number;
        match_reason: string;
      }>;
      total_suggestions: number;
    }>(response);
  }
};
// src/apps/beautifulmind/hooks/useFolders.ts

import { useState, useEffect } from 'react';
import { Folder, FolderFormData } from '../types/notes.types';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Folders service
const foldersService = {
  async getAllFolders(): Promise<Folder[]> {
    const response = await fetch('/api/folders');
    return handleResponse<Folder[]>(response);
  },

  async getFolderById(id: string): Promise<Folder | null> {
    try {
      const response = await fetch(`/api/folders/${id}`);
      return handleResponse<Folder>(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createFolder(folder: FolderFormData): Promise<Folder> {
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folder)
    });
    
    return handleResponse<Folder>(response);
  },

  async updateFolder(id: string, updates: Partial<FolderFormData>): Promise<Folder> {
    const response = await fetch(`/api/folders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    return handleResponse<Folder>(response);
  },

  async deleteFolder(id: string): Promise<void> {
    const response = await fetch(`/api/folders/${id}`, {
      method: 'DELETE'
    });
    
    await handleResponse<{ message: string }>(response);
  }
};

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all folders
  const fetchFolders = async () => {
    try {
      setLoading(true);
      const data = await foldersService.getAllFolders();
      setFolders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  };

  // Create a new folder
  const createFolder = async (folderData: FolderFormData) => {
    try {
      const newFolder = await foldersService.createFolder(folderData);
      // Add the new folder to the list immediately
      setFolders(prev => [newFolder, ...prev]);
      
      // Auto-process embeddings in the background
      setTimeout(async () => {
        try {
          await fetch('/api/embeddings/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.NEXT_PUBLIC_EMBEDDING_API_KEY || 'auto-process'
            },
            body: JSON.stringify({ batchSize: 5 })
          });
        } catch (err) {
          console.warn('Auto-embedding processing failed:', err);
        }
      }, 1000);
      
      return newFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    }
  };

  // Update an existing folder
  const updateFolder = async (id: string, updates: Partial<FolderFormData>) => {
    try {
      const updatedFolder = await foldersService.updateFolder(id, updates);
      setFolders(prev => prev.map(folder => 
        folder.id === id ? updatedFolder : folder
      ));
      return updatedFolder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      throw err;
    }
  };

  // Delete a folder
  const deleteFolder = async (id: string) => {
    try {
      await foldersService.deleteFolder(id);
      setFolders(prev => prev.filter(folder => folder.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      throw err;
    }
  };

  // Get a single folder by ID
  const getFolderById = (id: string) => {
    return folders.find(folder => folder.id === id);
  };

  // Update a specific folder in the list (useful for real-time updates)
  const updateFolderInList = (updatedFolder: Folder) => {
    setFolders(prev => prev.map(folder => 
      folder.id === updatedFolder.id ? updatedFolder : folder
    ));
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderById,
    updateFolderInList,
    refreshFolders: fetchFolders
  };
};
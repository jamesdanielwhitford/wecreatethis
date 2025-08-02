// src/apps/beautifulmind/hooks/useFolders.ts

import { useState, useEffect } from 'react';
import { Folder, FolderFormData, FolderHierarchy } from '../types/notes.types';
import { foldersService } from '../utils/api';
import { autoProcessEmbeddings } from '../utils/auto-embeddings';
import { buildFolderTree } from '../utils/folder-hierarchy';

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<FolderHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Fetch all folders
  const fetchFolders = async (hierarchy: boolean = false) => {
    try {
      setLoading(true);
      const data = await foldersService.getAllFolders(hierarchy);
      
      if (hierarchy) {
        setFolderTree(data as FolderHierarchy[]);
        // Also set the flat folders list for compatibility
        const flatFolders = (data as FolderHierarchy[]).reduce((acc: Folder[], tree) => {
          const extractFolders = (nodes: FolderHierarchy[]): Folder[] => {
            const result: Folder[] = [];
            nodes.forEach(node => {
              const { children, ...folder } = node;
              result.push(folder);
              if (children && children.length > 0) {
                result.push(...extractFolders(children));
              }
            });
            return result;
          };
          return [...acc, ...extractFolders([tree])];
        }, []);
        setFolders(flatFolders);
      } else {
        setFolders(data as Folder[]);
        // Build tree from flat data for components that need it
        setFolderTree(buildFolderTree(data as Folder[]));
      }
      
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
        await autoProcessEmbeddings();
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
    // Rebuild folder tree
    setFolderTree(buildFolderTree(folders.map(folder => 
      folder.id === updatedFolder.id ? updatedFolder : folder
    )));
  };

  // Move a note between folders (exclusive)
  const moveNote = async (targetFolderId: string, noteId: string, sourceFolderId?: string) => {
    try {
      return await foldersService.moveNote(targetFolderId, noteId, sourceFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move note');
      throw err;
    }
  };

  // Add a note to a folder (additive)
  const addNoteToFolder = async (folderId: string, noteId: string) => {
    try {
      return await foldersService.addNoteToFolder(folderId, noteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note to folder');
      throw err;
    }
  };

  // Remove a note from a folder
  const removeNoteFromFolder = async (folderId: string, noteId: string) => {
    try {
      return await foldersService.removeNoteFromFolder(folderId, noteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove note from folder');
      throw err;
    }
  };

  // Get children of a specific folder
  const getChildFolders = (parentId: string | null): Folder[] => {
    return folders.filter(folder => folder.parent_folder_id === parentId);
  };

  // Navigate to a folder (for hierarchical navigation)
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Get current folder path (breadcrumb)
  const getCurrentPath = (): Folder[] => {
    if (!currentFolderId) return [];
    
    const path: Folder[] = [];
    let current = folders.find(f => f.id === currentFolderId);
    
    while (current) {
      path.unshift(current);
      current = current.parent_folder_id 
        ? folders.find(f => f.id === current!.parent_folder_id) 
        : undefined;
    }
    
    return path;
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  return {
    // Data
    folders,
    folderTree,
    currentFolderId,
    loading,
    error,
    
    // CRUD operations
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderById,
    updateFolderInList,
    refreshFolders: fetchFolders,
    
    // Note management
    moveNote,
    addNoteToFolder,
    removeNoteFromFolder,
    
    // Hierarchy navigation
    getChildFolders,
    navigateToFolder,
    getCurrentPath
  };
};
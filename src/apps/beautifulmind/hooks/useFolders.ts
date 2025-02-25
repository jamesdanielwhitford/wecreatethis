import { useState, useEffect, useCallback } from 'react';
import { FolderMetadata, Note, SubfolderView } from '../types';
import { folderService } from '../services/folderService';

export const useFolders = () => {
  const [rootFolders, setRootFolders] = useState<FolderMetadata[]>([]);
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load root folders
      const loadedRootFolders = folderService.getRootFolders();
      setRootFolders(loadedRootFolders);
      
      // Load all folder tags
      const tags = folderService.getAllFolderTags();
      setFolderTags(tags);
    } catch (err) {
      console.error('Error loading folders:', err);
      setError('Failed to load folders. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new folder
  const createFolder = useCallback((name: string, parentFolder: string | null): FolderMetadata => {
    try {
      setError(null);
      
      // Create folder in storage
      const newFolder = folderService.createFolder(name, parentFolder);
      
      // Reload data
      loadData();
      
      return newFolder;
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Failed to create folder. Please try again.');
      throw err;
    }
  }, [loadData]);

  // Delete a folder
  const deleteFolder = useCallback((folderId: string): void => {
    try {
      setError(null);
      
      // Delete folder from storage
      folderService.deleteFolder(folderId);
      
      // Reload data
      loadData();
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder. Please try again.');
    }
  }, [loadData]);

  // Get subfolders for a folder
  const getSubfolders = useCallback((parentFolderId: string): FolderMetadata[] => {
    return folderService.getSubfolders(parentFolderId);
  }, []);

  // Get a folder by its tag
  const getFolderByTag = useCallback((tag: string): FolderMetadata | null => {
    return folderService.getFolderByTag(tag);
  }, []);

  // Generate subfolder views for a parent folder based on available notes and tags
  const getSubfolderViews = useCallback((parentFolder: FolderMetadata, notes: Note[]): SubfolderView[] => {
    // Find notes that belong to this folder
    const folderNotes = notes.filter(note => note.tags.includes(parentFolder.tag));
    
    // Get all unique tags from these notes
    const uniqueTags = new Set<string>();
    folderNotes.forEach(note => {
      note.tags.forEach(tag => {
        // Don't include the parent folder's tag itself
        if (tag !== parentFolder.tag) {
          uniqueTags.add(tag);
        }
      });
    });
    
    // Create a subfolder view for each tag
    return Array.from(uniqueTags).map(tag => {
      // Count notes that have both the parent folder tag and this tag
      const count = folderNotes.filter(note => note.tags.includes(tag)).length;
      
      return {
        id: `subfolder_${parentFolder.tag}_${tag}`,
        name: tag,
        tag: tag,
        count
      };
    }).sort((a, b) => b.count - a.count); // Sort by count descending
  }, []);

  return {
    rootFolders,
    folderTags,
    isLoading,
    error,
    createFolder,
    deleteFolder,
    getSubfolders,
    getFolderByTag,
    getSubfolderViews
  };
};
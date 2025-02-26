import { useState, useEffect, useCallback } from 'react';
import { FolderMetadata } from '../types';
import { folderService } from '../services/folderService';

export const useFolders = () => {
  const [rootFolders, setRootFolders] = useState<FolderMetadata[]>([]);
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define loadData first before using it in useEffect
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load all folders (both root and subfolders)
      const allFolders = folderService.getFoldersMetadata();
      setRootFolders(allFolders);
      
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

  // Load initial data with proper dependency array
  useEffect(() => {
    loadData();
  }, [loadData]); // Add loadData to the dependency array

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

  // Get a folder by its tag
  const getFolderByTag = useCallback((tag: string): FolderMetadata | null => {
    return folderService.getFolderByTag(tag);
  }, []);

  return {
    rootFolders,
    folderTags,
    isLoading,
    error,
    createFolder,
    deleteFolder,
    getFolderByTag
  };
};
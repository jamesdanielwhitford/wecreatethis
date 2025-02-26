import { FolderMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';

const FOLDERS_STORAGE_KEY = 'beautiful-mind-folders';

// Define the type for folder with children
interface FolderWithChildren extends FolderMetadata {
  children: FolderWithChildren[];
}

export const folderService = {
  /**
   * Get all folders metadata from localStorage
   */
  getFoldersMetadata: (): FolderMetadata[] => {
    if (typeof window === 'undefined') return [];
    
    const storedFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
    return storedFolders ? JSON.parse(storedFolders) : [];
  },

  /**
   * Save folders metadata to localStorage
   */
  saveFoldersMetadata: (folders: FolderMetadata[]): void => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  },

  /**
   * Create a new folder
   */
  createFolder: (name: string, parentId: string | null): FolderMetadata => {
    const folders = folderService.getFoldersMetadata();
    const id = uuidv4();
    const timestamp = Date.now();
    
    // Construct the path and tag based on parent folder if it exists
    let path = name;
    let tag = name;
    
    if (parentId) {
      const parentFolder = folderService.getFolderById(parentId);
      if (parentFolder) {
        // For deeply nested folders, use the full path
        path = `${parentFolder.path}/${name}`;
        // The tag should also follow the full path structure
        tag = `${parentFolder.tag}/${name}`;
      }
    }
    
    // Create the new folder
    const newFolder: FolderMetadata = {
      id,
      name,
      tag,
      path,
      parentId,
      createdAt: timestamp
    };
    
    // Save to localStorage
    folderService.saveFoldersMetadata([...folders, newFolder]);
    
    return newFolder;
  },

  /**
   * Delete a folder
   */
  deleteFolder: (folderId: string): void => {
    const folders = folderService.getFoldersMetadata();
    
    // Find all folders to delete (the folder itself and any subfolders)
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;
    
    // Get all subfolders recursively
    const getAllChildFolderIds = (parentId: string): string[] => {
      const childFolders = folders.filter(f => f.parentId === parentId);
      return [
        ...childFolders.map(f => f.id),
        ...childFolders.flatMap(f => getAllChildFolderIds(f.id))
      ];
    };
    
    const childFolderIds = getAllChildFolderIds(folderId);
    const folderIdsToDelete = [folderId, ...childFolderIds];
    
    // Filter out deleted folders
    const updatedFolders = folders.filter(f => !folderIdsToDelete.includes(f.id));
    
    // Save updated folders
    folderService.saveFoldersMetadata(updatedFolders);
  },

  /**
   * Get root folders (folders without a parent)
   */
  getRootFolders: (): FolderMetadata[] => {
    const folders = folderService.getFoldersMetadata();
    return folders.filter(folder => folder.parentId === null);
  },

  /**
   * Get subfolders for a parent folder
   */
  getSubfolders: (parentFolderId: string): FolderMetadata[] => {
    const folders = folderService.getFoldersMetadata();
    return folders.filter(folder => folder.parentId === parentFolderId);
  },

  /**
   * Get the entire folder hierarchy as a nested structure
   */
  getFolderHierarchy: (): FolderWithChildren[] => {
    const allFolders = folderService.getFoldersMetadata();
    
    // Build nested hierarchy recursively
    const buildHierarchy = (parentId: string | null): FolderWithChildren[] => {
      return allFolders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildHierarchy(folder.id)
        }));
    };
    
    return buildHierarchy(null);
  },

  /**
   * Get folder by tag name
   */
  getFolderByTag: (tag: string): FolderMetadata | null => {
    const folders = folderService.getFoldersMetadata();
    return folders.find(folder => folder.tag === tag) || null;
  },

  /**
   * Get folder by ID
   */
  getFolderById: (id: string): FolderMetadata | null => {
    const folders = folderService.getFoldersMetadata();
    return folders.find(folder => folder.id === id) || null;
  },

  /**
   * Get all folder tags
   */
  getAllFolderTags: (): string[] => {
    const folders = folderService.getFoldersMetadata();
    return folders.map(folder => folder.tag);
  },
  
  /**
   * Get ancestor folder tags for a given folder tag
   * Returns an array of tags from root to the specified folder
   */
  getAncestorTags: (tag: string): string[] => {
    const parts = tag.split('/');
    const ancestorTags: string[] = [];
    
    // Build the path parts incrementally
    for (let i = 0; i < parts.length; i++) {
      const ancestorTag = parts.slice(0, i + 1).join('/');
      ancestorTags.push(ancestorTag);
    }
    
    return ancestorTags;
  }
};
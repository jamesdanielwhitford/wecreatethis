import { FolderMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';

const FOLDERS_STORAGE_KEY = 'beautiful-mind-folders';

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
    
    // The tag for this folder is simply the folder name
    const tag = name;
    
    // Construct the path based on parent folder if exists
    let path = name;
    if (parentId) {
      const parentFolder = folderService.getFolderById(parentId);
      if (parentFolder) {
        path = `${parentFolder.path}/${name}`;
      }
    }
    
    // Create the new folder with parentId instead of parentFolder
    const newFolder: FolderMetadata = {
      id,
      name,
      tag,
      path,
      parentId, // Changed from parentFolder to parentId
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
      const childFolders = folders.filter(f => f.parentId === parentId); // Changed from parentFolder to parentId
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
    return folders.filter(folder => folder.parentId === null); // Changed from parentFolder to parentId
  },

  /**
   * Get subfolders for a parent folder
   */
  getSubfolders: (parentFolderId: string): FolderMetadata[] => {
    const folders = folderService.getFoldersMetadata();
    return folders.filter(folder => folder.parentId === parentFolderId); // Changed from parentFolder to parentId
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
  }
};
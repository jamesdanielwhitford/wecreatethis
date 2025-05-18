/**
 * File: src/apps/beautifulmind/types/index.ts
 * Contains type definitions for the Beautiful Mind note-taking app
 */

// User Authentication
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Note Document Model
export interface Note {
  id: string;
  text: string;
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  userId: string;
  folderPath: string[]; // Array of folder IDs from root to leaf
  embedding?: number[]; // Vector embedding for semantic search
  tags?: string[];
}

// Folder Document Model
export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  path: string[]; // Array of ancestor folder IDs for easy querying
  createdAt: number;
  updatedAt: number;
  userId: string;
}

// For folder tree view component
export interface FolderTreeItem {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeItem[];
}

// For API response when fetching notes
export interface NotesResponse {
  notes: Note[];
  hasMore: boolean;
  nextCursor?: string;
}

// For semantic search results
export interface SearchResult {
  noteId: string;
  score: number; // similarity score
}

// For suggested folders from clustering
export interface FolderSuggestion {
  folderName: string;
  noteIds: string[];
  confidence: number;
  parentFolderId?: string; // If it's a subfolder suggestion
}

// UI State related types
export interface NoteEditorState {
  activeNoteId: string | null;
  isEditing: boolean;
  isDirty: boolean;
}

export interface FolderState {
  activeFolderId: string | null;
  expandedFolderIds: string[];
}

// Vector DB related types
export interface EmbeddingVector {
  id: string;
  values: number[];
  metadata: {
    noteId: string;
    userId: string;
  };
}
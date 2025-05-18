/**
 * File: src/apps/beautifulmind/utils/embeddings.ts
 * Utilities for working with OpenAI embeddings and vector storage
 */

'use client';

import { Note, SearchResult, FolderSuggestion } from '../types';
import { storeEmbedding } from './pinecone';
import { auth } from '../../../utils/firebase/config';

// Generate text embeddings using OpenAI API
export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    const response = await fetch('/api/beautifulmind/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Error generating embedding: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
};

// Vector similarity calculation (cosine similarity)
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) throw new Error('Vectors must have the same dimensions');

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
};

// Search notes semantically
export const semanticSearch = async (query: string, userId: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch('/api/beautifulmind/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ searchText: query, userId }),
    });

    if (!response.ok) {
      throw new Error(`Error searching notes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
};

// Get folder suggestions based on clustering
export const getFolderSuggestions = async (userId: string, numClusters: number = 3): Promise<FolderSuggestion[]> => {
  try {
    const response = await fetch('/api/beautifulmind/suggest-folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, numClusters }),
    });

    if (!response.ok) {
      throw new Error(`Error getting folder suggestions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error getting folder suggestions:', error);
    return [];
  }
};

// Save embedding to storage when a note is created or updated
export const saveEmbeddingToPinecone = async (
  noteId: string,
  embedding: number[],
  userId: string,
  title?: string
): Promise<boolean> => {
  return storeEmbedding(noteId, embedding, { userId, title });
};

// Placeholder for folder name suggestion - this would call the API in production
export const suggestFolderName = async (noteContent: string): Promise<string> => {
  try {
    // This would call an API in production
    return `Folder ${Math.floor(Math.random() * 1000)}`;
  } catch (error) {
    console.error('Error suggesting folder name:', error);
    return 'New Folder';
  }
};

// For in-memory clustering (not used in client)
export const suggestFolders = async (notes: Note[], k: number = 3): Promise<FolderSuggestion[]> => {
  console.warn('Client-side clustering not implemented - use API instead');
  return [];
};
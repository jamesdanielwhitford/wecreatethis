/**
 * File: src/apps/beautifulmind/utils/index.ts
 * Export utility functions for Beautiful Mind app
 */

// Re-export all utility functions
export * from './firestore';
export * from './embeddings';
export * from './pinecone';

// Constants for the app
export const APP_NAME = 'Beautiful Mind';
export const MAX_NOTE_LENGTH = 10000; // characters
export const MAX_FOLDER_NAME_LENGTH = 50; // characters
export const DEFAULT_PAGE_SIZE = 20;
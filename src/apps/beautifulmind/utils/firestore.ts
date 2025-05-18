/**
 * File: src/apps/beautifulmind/utils/firestore.ts
 * Firestore service functions for Beautiful Mind app
 */

import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, limit, startAfter, DocumentSnapshot, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../utils/firebase/config'; // Using existing Firebase config
import { Note, Folder, FolderTreeItem } from '../types';

// Collection names
const NOTES_COLLECTION = 'beautiful_mind_notes';
const FOLDERS_COLLECTION = 'beautiful_mind_folders';

// Notes CRUD operations
export const createNote = async (note: Omit<Note, 'id'>): Promise<Note> => {
  const notesRef = collection(db, NOTES_COLLECTION);
  const docRef = await addDoc(notesRef, {
    ...note,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  const createdNote = {
    id: docRef.id,
    ...note,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // If the note has an embedding, store it in Pinecone
  if (note.embedding && note.embedding.length > 0) {
    try {
      // Import dynamically to avoid SSR issues
      const { saveEmbeddingToPinecone } = await import('./embeddings');
      await saveEmbeddingToPinecone(
        docRef.id,
        note.embedding,
        note.userId,
        note.title
      );
    } catch (error) {
      console.error('Error storing embedding in Pinecone:', error);
      // Continue even if Pinecone storage fails
    }
  }
  
  return createdNote;
};

export const getNoteById = async (noteId: string): Promise<Note | null> => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);
  const noteSnap = await getDoc(noteRef);
  
  if (noteSnap.exists()) {
    return { id: noteSnap.id, ...noteSnap.data() } as Note;
  }
  
  return null;
};

export const updateNote = async (noteId: string, noteData: Partial<Note>): Promise<void> => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);
  
  const updateData = {
    ...noteData,
    updatedAt: Date.now()
  };
  
  await updateDoc(noteRef, updateData);
  
  // If the note data has an updated embedding, update it in Pinecone
  if (noteData.embedding && noteData.embedding.length > 0 && noteData.userId) {
    try {
      // Import dynamically to avoid SSR issues
      const { saveEmbeddingToPinecone } = await import('./embeddings');
      await saveEmbeddingToPinecone(
        noteId,
        noteData.embedding,
        noteData.userId,
        noteData.title
      );
    } catch (error) {
      console.error('Error updating embedding in Pinecone:', error);
      // Continue even if Pinecone update fails
    }
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);
  
  // Delete from Firestore
  await deleteDoc(noteRef);
  
  // Delete from Pinecone
  try {
    // Import dynamically to avoid SSR issues
    const { deleteEmbedding } = await import('./pinecone');
    await deleteEmbedding(noteId);
  } catch (error) {
    console.error('Error deleting embedding from Pinecone:', error);
    // Continue even if Pinecone deletion fails
  }
};

export const getNotesByFolder = async (
  folderId: string | null, 
  userId: string,
  cursor?: DocumentSnapshot,
  pageSize: number = 20
): Promise<{ notes: Note[], lastDoc: DocumentSnapshot | null }> => {
  const notesRef = collection(db, NOTES_COLLECTION);
  let q;
  
  if (folderId === null) {
    // Get root notes (not in any folder)
    q = query(
      notesRef, 
      where('userId', '==', userId),
      where('folderPath', '==', []),
      orderBy('updatedAt', 'desc'),
      limit(pageSize)
    );
  } else {
    // Get notes in the specified folder
    q = query(
      notesRef, 
      where('userId', '==', userId),
      where('folderPath', 'array-contains', folderId),
      orderBy('updatedAt', 'desc'),
      limit(pageSize)
    );
  }
  
  if (cursor) {
    q = query(q, startAfter(cursor));
  }
  
  const querySnapshot = await getDocs(q);
  const notes: Note[] = [];
  let lastDoc: DocumentSnapshot | null = null;
  
  querySnapshot.forEach((doc) => {
    notes.push({ id: doc.id, ...doc.data() } as Note);
    lastDoc = doc;
  });
  
  return { notes, lastDoc };
};

// Folders CRUD operations
export const createFolder = async (folder: Omit<Folder, 'id'>): Promise<Folder> => {
  const foldersRef = collection(db, FOLDERS_COLLECTION);
  const docRef = await addDoc(foldersRef, {
    ...folder,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  return {
    id: docRef.id,
    ...folder,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

export const getFolderById = async (folderId: string): Promise<Folder | null> => {
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
  const folderSnap = await getDoc(folderRef);
  
  if (folderSnap.exists()) {
    return { id: folderSnap.id, ...folderSnap.data() } as Folder;
  }
  
  return null;
};

export const updateFolder = async (folderId: string, folderData: Partial<Folder>): Promise<void> => {
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
  await updateDoc(folderRef, {
    ...folderData,
    updatedAt: Date.now()
  });
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
  await deleteDoc(folderRef);
};

export const getFoldersByParentId = async (parentId: string | null, userId: string): Promise<Folder[]> => {
  const foldersRef = collection(db, FOLDERS_COLLECTION);
  const q = query(
    foldersRef,
    where('userId', '==', userId),
    where('parentId', '==', parentId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  const folders: Folder[] = [];
  
  querySnapshot.forEach((doc) => {
    folders.push({ id: doc.id, ...doc.data() } as Folder);
  });
  
  return folders;
};

// Gets all folders for a user and builds a folder tree
export const getUserFolderTree = async (userId: string): Promise<FolderTreeItem[]> => {
  const foldersRef = collection(db, FOLDERS_COLLECTION);
  const q = query(
    foldersRef,
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  const folders: Folder[] = [];
  
  querySnapshot.forEach((doc) => {
    folders.push({ id: doc.id, ...doc.data() } as Folder);
  });
  
  // Build folder tree
  const folderMap: { [key: string]: FolderTreeItem } = {};
  
  // Initialize map with all folders
  folders.forEach(folder => {
    folderMap[folder.id] = {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      children: []
    };
  });
  
  // Build tree structure
  const rootFolders: FolderTreeItem[] = [];
  
  folders.forEach(folder => {
    if (folder.parentId === null) {
      // Root level folder
      rootFolders.push(folderMap[folder.id]);
    } else if (folderMap[folder.parentId]) {
      // Add as child to parent
      folderMap[folder.parentId].children.push(folderMap[folder.id]);
    }
  });
  
  return rootFolders;
};

// Move notes to a folder (update their folderPath)
export const moveNotesToFolder = async (noteIds: string[], folderId: string, userId: string): Promise<void> => {
  // Get the folder to get its path
  const folder = await getFolderById(folderId);
  
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }
  
  // Create a batch write
  const batch = writeBatch(db);
  
  // Update each note
  for (const noteId of noteIds) {
    const noteRef = doc(db, NOTES_COLLECTION, noteId);
    batch.update(noteRef, {
      folderPath: folder.path.concat(folder.id),
      updatedAt: Date.now()
    });
  }
  
  // Commit the batch
  await batch.commit();
};
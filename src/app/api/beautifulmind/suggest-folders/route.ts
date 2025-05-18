/**
 * File: src/app/api/beautifulmind/suggest-folders/route.ts
 * API route for suggesting folders based on note clustering
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Firebase config (should match your client config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (create a new app instance for the API)
const app = initializeApp(firebaseConfig, 'suggest-folders-api');
const db = getFirestore(app);

// Calculate cosine similarity between two vectors
const cosineSimilarity = (a: number[], b: number[]): number => {
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

// Suggest folder name using OpenAI
const suggestFolderName = async (noteContent: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an organizational assistant.' },
        { role: 'user', content: `Suggest a short, concise folder name (1-3 words) for these notes:\n\n${noteContent}` }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || 'New Folder';
  } catch (error) {
    console.error('Error suggesting folder name:', error);
    return 'New Folder';
  }
};

// K-means clustering for folder suggestions
const suggestFolders = async (notes: any[], k: number = 3) => {
  // Filter notes with embeddings
  const notesWithEmbeddings = notes.filter(note => note.embedding && note.embedding.length > 0);
  
  if (notesWithEmbeddings.length < k) {
    return []; // Not enough data for clustering
  }

  // Initialize k random centroids
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();

  while (centroids.length < k) {
    const randomIndex = Math.floor(Math.random() * notesWithEmbeddings.length);
    if (!usedIndices.has(randomIndex) && notesWithEmbeddings[randomIndex].embedding) {
      usedIndices.add(randomIndex);
      centroids.push([...notesWithEmbeddings[randomIndex].embedding!]);
    }
  }

  // Assign notes to clusters
  const clusters: { noteIds: string[], notes: any[] }[] = Array(k).fill(null).map(() => ({
    noteIds: [],
    notes: []
  }));

  notesWithEmbeddings.forEach(note => {
    let bestCluster = 0;
    let bestSimilarity = -1;

    for (let i = 0; i < k; i++) {
      const similarity = cosineSimilarity(note.embedding!, centroids[i]);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = i;
      }
    }

    clusters[bestCluster].noteIds.push(note.id);
    clusters[bestCluster].notes.push(note);
  });

  // Generate folder suggestions
  const suggestions = [];

  for (let i = 0; i < k; i++) {
    if (clusters[i].noteIds.length > 0) {
      // Calculate average similarity as confidence
      let totalSimilarity = 0;
      clusters[i].notes.forEach(note => {
        totalSimilarity += cosineSimilarity(note.embedding!, centroids[i]);
      });
      
      const confidence = totalSimilarity / clusters[i].notes.length;
      
      suggestions.push({
        folderName: 'New Folder', // Will be replaced later
        noteIds: clusters[i].noteIds,
        confidence
      });
    }
  }

  return suggestions;
};

export async function POST(request: Request) {
  try {
    // Parse request body - we're just going to accept user ID now
    // This is a simplified approach - in production, you would still verify tokens
    const { userId, numClusters = 3 } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Getting notes for user ${userId}`);

    // Get all notes for this user
    try {
      const notesRef = collection(db, 'beautiful_mind_notes');
      const q = query(notesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.docs.length} notes`);
      
      const notes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Skip if not enough notes with embeddings
      const notesWithEmbeddings = notes.filter(note => 
        note.embedding && note.embedding.length > 0
      );
      
      console.log(`Found ${notesWithEmbeddings.length} notes with embeddings`);
      
      if (notesWithEmbeddings.length < 2) {
        return NextResponse.json({
          message: 'Not enough notes with embeddings for clustering',
          suggestions: []
        });
      }
      
      // Use fewer clusters if we don't have many notes
      const adjustedNumClusters = Math.min(numClusters, Math.floor(notesWithEmbeddings.length / 2));
      
      // Perform clustering to suggest folders
      const suggestedFolders = await suggestFolders(notesWithEmbeddings, adjustedNumClusters);
      
      // For each cluster, use OpenAI to suggest a folder name
      for (const suggestion of suggestedFolders) {
        if (!suggestion.folderName || suggestion.folderName === 'New Folder') {
          // Sample some notes from this cluster for naming
          const clusterNotes = suggestion.noteIds
            .map(id => notes.find(note => note.id === id))
            .filter(Boolean)
            .slice(0, 3);
          
          const sampleText = clusterNotes
            .map(note => note.title || note.text.substring(0, 100))
            .join('\n\n');
          
          // Generate a folder name suggestion
          suggestion.folderName = await suggestFolderName(sampleText);
        }
      }
      
      return NextResponse.json({
        suggestions: suggestedFolders
      });
    } catch (error) {
      console.error('Error querying Firestore:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error suggesting folders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest folders' },
      { status: 500 }
    );
  }
}
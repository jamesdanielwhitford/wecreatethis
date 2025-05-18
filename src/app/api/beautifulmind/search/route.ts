/**
 * File: src/app/api/beautifulmind/search/route.ts
 * API route for semantic search using embeddings
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig, 'search-api');
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

export async function POST(request: Request) {
  try {
    // Parse request body
    const { searchText, userId } = await request.json();

    if (!searchText) {
      return NextResponse.json(
        { error: 'Search text is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: searchText,
      encoding_format: 'float',
    });
    
    const searchEmbedding = embeddingResponse.data[0].embedding;

    try {
      // Get all notes for this user
      const notesRef = collection(db, 'beautiful_mind_notes');
      const q = query(notesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Calculate similarity and rank results
      const searchResults = [];
      
      for (const doc of querySnapshot.docs) {
        const note = { id: doc.id, ...doc.data() };
        
        // Skip notes without embeddings
        if (!note.embedding || note.embedding.length === 0) continue;
        
        // Calculate similarity score
        const similarity = cosineSimilarity(searchEmbedding, note.embedding);
        
        // Add to results if above threshold
        if (similarity > 0.7) {
          searchResults.push({
            noteId: note.id,
            title: note.title,
            text: note.text,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            folderPath: note.folderPath,
            score: similarity
          });
        }
      }
      
      // Sort by similarity score (highest first)
      searchResults.sort((a, b) => b.score - a.score);
      
      // Return top results
      return NextResponse.json({
        results: searchResults.slice(0, 20)
      });
    } catch (error) {
      console.error('Error querying Firestore:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error performing semantic search:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    );
  }
}
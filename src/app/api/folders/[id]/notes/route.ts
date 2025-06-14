// src/app/api/folders/[id]/notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FolderNoteResult } from '@/apps/beautifulmind/types/notes.types';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// GET /api/folders/[id]/notes - Get notes that match this folder's semantic space
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== SIMPLE: Folder Notes Search ===');
    console.log('Folder ID:', params.id);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    
    console.log('Search params:', { limit, threshold });

    // Step 1: Get the folder and its embeddings
    console.log('Step 1: Fetching folder...');
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (folderError) {
      console.error('Folder fetch error:', folderError);
      throw folderError;
    }
    
    if (!folder) {
      console.log('Folder not found');
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    console.log('Folder found:', {
      id: folder.id,
      title: folder.title,
      has_title_embedding: !!folder.title_embedding,
      has_description_embedding: !!folder.description_embedding,
      has_enhanced_description_embedding: !!folder.enhanced_description_embedding
    });

    // Check if folder has embeddings
    if (!folder.title_embedding && !folder.description_embedding && !folder.enhanced_description_embedding) {
      console.log('No embeddings found for folder');
      return NextResponse.json({
        folder,
        notes: [],
        total_matches: 0,
        search_threshold: threshold,
        message: 'Folder embeddings are still being generated. Please wait a moment and try again.'
      });
    }

    // Use the best available embedding
    let searchEmbedding = folder.enhanced_description_embedding || 
                         folder.description_embedding || 
                         folder.title_embedding;
    
    const embeddingType = folder.enhanced_description_embedding ? 'enhanced_description' :
                         folder.description_embedding ? 'description' : 'title';
    
    console.log('Using embedding type:', embeddingType);

    // Step 2: Get all notes with embeddings
    console.log('Step 2: Fetching all notes with embeddings...');
    const { data: allNotes, error: notesError } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .or('title_embedding.not.is.null,content_embedding.not.is.null,summary_embedding.not.is.null');
    
    if (notesError) {
      console.error('Notes fetch error:', notesError);
      throw notesError;
    }
    
    console.log('Notes fetched:', allNotes?.length || 0);

    if (!allNotes || allNotes.length === 0) {
      console.log('No notes with embeddings found');
      return NextResponse.json({
        folder,
        notes: [],
        total_matches: 0,
        search_threshold: threshold,
        message: 'No notes with embeddings found. Create some notes and wait for embeddings to be generated.'
      });
    }

    // Step 3: Calculate similarities manually
    console.log('Step 3: Calculating similarities...');
    const noteResults: Array<{ note: any; similarity_score: number; matched_fields: string[] }> = [];
    
    for (const note of allNotes) {
      let bestSimilarity = 0;
      let matchedFields: string[] = [];
      
      // Check title embedding
      if (note.title_embedding && searchEmbedding) {
        try {
          const titleSim = cosineSimilarity(searchEmbedding, note.title_embedding);
          if (titleSim > bestSimilarity) {
            bestSimilarity = titleSim;
            matchedFields = ['title'];
          }
        } catch (err) {
          console.warn('Title similarity calculation failed:', err);
        }
      }
      
      // Check content embedding
      if (note.content_embedding && searchEmbedding) {
        try {
          const contentSim = cosineSimilarity(searchEmbedding, note.content_embedding);
          if (contentSim > bestSimilarity) {
            bestSimilarity = contentSim;
            matchedFields = ['content'];
          } else if (contentSim > threshold) {
            matchedFields.push('content');
          }
        } catch (err) {
          console.warn('Content similarity calculation failed:', err);
        }
      }
      
      // Check summary embedding
      if (note.summary_embedding && searchEmbedding) {
        try {
          const summarySim = cosineSimilarity(searchEmbedding, note.summary_embedding);
          if (summarySim > bestSimilarity) {
            bestSimilarity = summarySim;
            matchedFields = ['summary'];
          } else if (summarySim > threshold) {
            matchedFields.push('summary');
          }
        } catch (err) {
          console.warn('Summary similarity calculation failed:', err);
        }
      }
      
      // Include if above threshold
      if (bestSimilarity >= threshold) {
        // Add URLs to media attachments
        const noteWithUrls = {
          ...note,
          media_attachments: note.media_attachments?.map((attachment: any) => ({
            ...attachment,
            url: getMediaUrl(attachment.storage_path),
            thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
          }))
        };
        
        noteResults.push({
          note: noteWithUrls,
          similarity_score: bestSimilarity,
          matched_fields: matchedFields
        });
      }
    }

    // Sort by similarity score (highest first)
    noteResults.sort((a, b) => b.similarity_score - a.similarity_score);
    
    // Limit results
    const limitedResults = noteResults.slice(0, limit);
    
    console.log('Final results:', limitedResults.length, 'notes found');
    
    return NextResponse.json({
      folder,
      notes: limitedResults,
      total_matches: limitedResults.length,
      search_threshold: threshold,
      debug: {
        embedding_type: embeddingType,
        total_notes_checked: allNotes.length,
        notes_above_threshold: noteResults.length
      }
    });
    
  } catch (error) {
    console.error('Error in folder notes search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search folder notes',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
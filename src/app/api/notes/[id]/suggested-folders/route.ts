// src/app/api/notes/[id]/suggested-folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to calculate cosine similarity between two embeddings
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.warn('Embedding lengths do not match:', a.length, 'vs', b.length);
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }
  
  return dotProduct / denominator;
}

// Helper function to parse PostgreSQL array back to number array
function parseEmbeddingFromDb(dbArray: any): number[] {
  if (typeof dbArray === 'string') {
    return dbArray.replace(/^\[|\]$/g, '').split(',').map(Number);
  }
  if (Array.isArray(dbArray)) {
    return dbArray.map(Number);
  }
  return [];
}

// GET /api/notes/[id]/suggested-folders - Get AI-suggested folders for a note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== AI-SUGGESTED FOLDERS FOR NOTE ===');
    console.log('Note ID:', params.id);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.5');
    
    console.log('Search params:', { limit, threshold });

    // Step 1: Get the note and its embeddings
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (noteError) {
      console.error('Note fetch error:', noteError);
      throw noteError;
    }
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    console.log('Note found:', note.title);

    // Step 2: Get folders the note is already in (to exclude from suggestions)
    const { data: currentFolders, error: currentFoldersError } = await supabase
      .from('folder_notes')
      .select('folder_id')
      .eq('note_id', params.id);
    
    if (currentFoldersError) {
      console.error('Current folders fetch error:', currentFoldersError);
      throw currentFoldersError;
    }
    
    const excludeFolderIds = (currentFolders || []).map(fn => fn.folder_id);
    console.log('Excluding current folders:', excludeFolderIds.length);

    // Step 3: Determine which note embedding to use for searching
    let searchEmbedding: number[] | null = null;
    let embeddingType: string = 'none';
    
    if (note.ai_categorization_embedding) {
      searchEmbedding = parseEmbeddingFromDb(note.ai_categorization_embedding);
      embeddingType = 'ai_categorization';
    } else if (note.title_embedding) {
      searchEmbedding = parseEmbeddingFromDb(note.title_embedding);
      embeddingType = 'title';
    } else if (note.content_embedding) {
      searchEmbedding = parseEmbeddingFromDb(note.content_embedding);
      embeddingType = 'content';
    }
    
    console.log('Using note embedding type:', embeddingType);
    
    if (!searchEmbedding) {
      console.log('Note has no embeddings available');
      return NextResponse.json({
        note: { id: note.id, title: note.title },
        suggested_folders: [],
        total_suggestions: 0,
        method: 'no_embeddings',
        message: 'Note embeddings are still being generated. Please wait a moment and try again.'
      });
    }
    
    console.log('Search embedding length:', searchEmbedding.length);

    // Step 4: Get all folders with embeddings (we'll calculate similarity in memory)
    let folderQuery = supabase
      .from('folders')
      .select('id, title, description, ai_matching_description, created_at, ai_matching_embedding, title_embedding, description_embedding')
      .limit(100); // Get more than needed for filtering
    
    // Exclude folders the note is already in
    excludeFolderIds.forEach(excludeId => {
      folderQuery = folderQuery.neq('id', excludeId);
    });
    
    const { data: allFolders, error: foldersError } = await folderQuery;
    
    if (foldersError) {
      console.error('Folders fetch error:', foldersError);
      throw foldersError;
    }
    
    console.log('Found folders to check:', allFolders?.length || 0);
    
    if (!allFolders || allFolders.length === 0) {
      return NextResponse.json({
        note: { id: note.id, title: note.title },
        suggested_folders: [],
        total_suggestions: 0,
        method: 'no_folders_available'
      });
    }

    // Step 5: Calculate similarities and create suggestions
    const suggestions: Array<{
      folder: any;
      similarity_score: number;
      match_reason: string;
    }> = [];
    
    for (const folder of allFolders) {
      let bestSimilarity = 0;
      let bestMatchReason = 'creation_order';
      
      // Try AI matching embedding first (best for suggestions)
      if (folder.ai_matching_embedding) {
        try {
          const folderEmbedding = parseEmbeddingFromDb(folder.ai_matching_embedding);
          const similarity = calculateCosineSimilarity(searchEmbedding, folderEmbedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatchReason = embeddingType === 'ai_categorization' ? 'ai_categorization_match' : `${embeddingType}_to_ai_matching`;
          }
        } catch (err) {
          console.warn('Error calculating AI matching similarity for folder:', folder.id, err);
        }
      }
      
      // Try title embedding
      if (folder.title_embedding) {
        try {
          const folderEmbedding = parseEmbeddingFromDb(folder.title_embedding);
          const similarity = calculateCosineSimilarity(searchEmbedding, folderEmbedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatchReason = 'title_similarity';
          }
        } catch (err) {
          console.warn('Error calculating title similarity for folder:', folder.id, err);
        }
      }
      
      // Try description embedding
      if (folder.description_embedding) {
        try {
          const folderEmbedding = parseEmbeddingFromDb(folder.description_embedding);
          const similarity = calculateCosineSimilarity(searchEmbedding, folderEmbedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatchReason = 'description_similarity';
          }
        } catch (err) {
          console.warn('Error calculating description similarity for folder:', folder.id, err);
        }
      }
      
      // Only include if above threshold or if threshold is 0 (show all)
      if (bestSimilarity >= threshold || threshold === 0) {
        suggestions.push({
          folder: {
            id: folder.id,
            title: folder.title,
            description: folder.description,
            ai_matching_description: folder.ai_matching_description,
            created_at: folder.created_at
          },
          similarity_score: bestSimilarity,
          match_reason: bestMatchReason
        });
      }
    }
    
    // Step 6: Sort by similarity score (highest first) and limit
    suggestions.sort((a, b) => b.similarity_score - a.similarity_score);
    const limitedSuggestions = suggestions.slice(0, limit);
    
    console.log('Returning suggestions:', limitedSuggestions.length);
    
    return NextResponse.json({
      note: { id: note.id, title: note.title },
      suggested_folders: limitedSuggestions,
      total_suggestions: limitedSuggestions.length,
      threshold,
      method: 'in_memory_similarity_calculation',
      debug: {
        note_embedding_type: embeddingType,
        total_folders_checked: allFolders.length,
        excluded_folders: excludeFolderIds.length,
        ai_categorization_matches: limitedSuggestions.filter(s => s.match_reason === 'ai_categorization_match').length,
        title_matches: limitedSuggestions.filter(s => s.match_reason === 'title_similarity').length,
        description_matches: limitedSuggestions.filter(s => s.match_reason === 'description_similarity').length
      }
    });
    
  } catch (error) {
    console.error('Error fetching suggested folders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch suggested folders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
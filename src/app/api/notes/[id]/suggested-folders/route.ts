// src/app/api/notes/[id]/suggested-folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to format embedding as PostgreSQL array
function formatEmbeddingForQuery(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
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

    // Step 3: Use note's AI categorization embedding to find matching folders
    if (!note.ai_categorization_embedding) {
      console.log('Note has no AI categorization embedding, using title/content');
      
      // Fallback to title or content embedding
      let searchEmbedding: number[] | null = null;
      if (note.title_embedding) {
        searchEmbedding = parseEmbeddingFromDb(note.title_embedding);
      } else if (note.content_embedding) {
        searchEmbedding = parseEmbeddingFromDb(note.content_embedding);
      }
      
      if (!searchEmbedding) {
        return NextResponse.json({
          note: { id: note.id, title: note.title },
          suggested_folders: [],
          total_suggestions: 0,
          method: 'no_embeddings',
          message: 'Note embeddings are still being generated. Please wait a moment and try again.'
        });
      }
      
      const searchEmbeddingStr = formatEmbeddingForQuery(searchEmbedding);
      
      // Search against folder AI matching embeddings (best match for suggestions)
      const { data: suggestions, error: suggestionsError } = await supabase
        .from('folders')
        .select(`
          id,
          title,
          description,
          ai_matching_description,
          created_at,
          similarity:ai_matching_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('ai_matching_embedding', 'is', null)
        .not('id', 'in', `(${excludeFolderIds.map(id => `'${id}'`).join(',') || "''"})`)
        .gte('ai_matching_embedding.cosine_similarity', threshold)
        .order('ai_matching_embedding.cosine_similarity', { ascending: false })
        .limit(limit);
      
      if (suggestionsError) {
        console.error('Suggestions fetch error:', suggestionsError);
        throw suggestionsError;
      }
      
      const processedSuggestions = (suggestions || []).map(folder => ({
        folder: {
          id: folder.id,
          title: folder.title,
          description: folder.description,
          ai_matching_description: folder.ai_matching_description,
          created_at: folder.created_at
        },
        similarity_score: folder.similarity,
        match_reason: 'title_content_similarity'
      }));
      
      return NextResponse.json({
        note: { id: note.id, title: note.title },
        suggested_folders: processedSuggestions,
        total_suggestions: processedSuggestions.length,
        threshold,
        method: 'fallback_embedding'
      });
    }
    
    // Step 4: Primary method - use AI categorization embedding
    const searchEmbedding = parseEmbeddingFromDb(note.ai_categorization_embedding);
    const searchEmbeddingStr = formatEmbeddingForQuery(searchEmbedding);
    
    console.log('Using AI categorization embedding, length:', searchEmbedding.length);
    
    // Search against folder AI matching embeddings
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('folders')
      .select(`
        id,
        title,
        description,
        ai_matching_description,
        created_at,
        similarity:ai_matching_embedding.cosine_similarity(${searchEmbeddingStr})
      `)
      .not('ai_matching_embedding', 'is', null)
      .not('id', 'in', `(${excludeFolderIds.map(id => `'${id}'`).join(',') || "''"})`)
      .gte('ai_matching_embedding.cosine_similarity', threshold)
      .order('ai_matching_embedding.cosine_similarity', { ascending: false })
      .limit(limit);
    
    if (suggestionsError) {
      console.error('Suggestions fetch error:', suggestionsError);
      throw suggestionsError;
    }
    
    console.log('Found AI-suggested folders:', suggestions?.length || 0);
    
    const processedSuggestions = (suggestions || []).map(folder => ({
      folder: {
        id: folder.id,
        title: folder.title,
        description: folder.description,
        ai_matching_description: folder.ai_matching_description,
        created_at: folder.created_at
      },
      similarity_score: folder.similarity,
      match_reason: 'ai_categorization_match'
    }));
    
    return NextResponse.json({
      note: { id: note.id, title: note.title },
      suggested_folders: processedSuggestions,
      total_suggestions: processedSuggestions.length,
      threshold,
      method: 'ai_categorization'
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
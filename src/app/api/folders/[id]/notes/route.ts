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

// Helper function to format embedding as PostgreSQL array
function formatEmbeddingForQuery(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// Helper function to parse PostgreSQL array back to number array
function parseEmbeddingFromDb(dbArray: any): number[] {
  if (typeof dbArray === 'string') {
    // Remove brackets and split by comma
    return dbArray.replace(/^\[|\]$/g, '').split(',').map(Number);
  }
  if (Array.isArray(dbArray)) {
    return dbArray.map(Number);
  }
  return [];
}

// GET /api/folders/[id]/notes - Get notes that match this folder's semantic space
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== PGVECTOR: Folder Notes Search ===');
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
    let searchEmbedding: number[];
    let embeddingType: string;
    
    if (folder.enhanced_description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.enhanced_description_embedding);
      embeddingType = 'enhanced_description';
    } else if (folder.description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.description_embedding);
      embeddingType = 'description';
    } else {
      searchEmbedding = parseEmbeddingFromDb(folder.title_embedding);
      embeddingType = 'title';
    }
    
    console.log('Using embedding type:', embeddingType);
    console.log('Search embedding length:', searchEmbedding.length);

    const searchEmbeddingStr = formatEmbeddingForQuery(searchEmbedding);

    // Step 2: Use pgvector to find similar notes
    console.log('Step 2: Executing vector search...');
    
    // Convert threshold to distance (pgvector uses distance, not similarity)
    // For cosine: similarity = 1 - distance, so distance = 1 - similarity
    const maxDistance = 1 - threshold;
    
    // Build the query to search across multiple embedding fields
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_similar_notes', 
      {
        query_embedding: searchEmbeddingStr,
        similarity_threshold: threshold,
        max_results: limit
      }
    );
    
    if (searchError) {
      // If the function doesn't exist, fall back to individual queries
      console.log('Custom function not found, using individual queries...');
      
      const noteResults: Array<{ note: any; similarity_score: number; matched_fields: string[] }> = [];
      
      // Search title embeddings
      const { data: titleMatches, error: titleError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*),
          similarity:title_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('title_embedding', 'is', null)
        .gt('title_embedding.cosine_similarity', threshold)
        .order('title_embedding.cosine_similarity', { ascending: false })
        .limit(limit);
      
      if (!titleError && titleMatches) {
        titleMatches.forEach(note => {
          noteResults.push({
            note,
            similarity_score: note.similarity,
            matched_fields: ['title']
          });
        });
      }
      
      // Search content embeddings
      const { data: contentMatches, error: contentError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*),
          similarity:content_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('content_embedding', 'is', null)
        .gt('content_embedding.cosine_similarity', threshold)
        .order('content_embedding.cosine_similarity', { ascending: false })
        .limit(limit);
      
      if (!contentError && contentMatches) {
        contentMatches.forEach(note => {
          const existingNote = noteResults.find(r => r.note.id === note.id);
          if (existingNote) {
            if (note.similarity > existingNote.similarity_score) {
              existingNote.similarity_score = note.similarity;
              existingNote.matched_fields = ['content'];
            } else {
              existingNote.matched_fields.push('content');
            }
          } else {
            noteResults.push({
              note,
              similarity_score: note.similarity,
              matched_fields: ['content']
            });
          }
        });
      }
      
      // Search summary embeddings
      const { data: summaryMatches, error: summaryError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*),
          similarity:summary_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('summary_embedding', 'is', null)
        .gt('summary_embedding.cosine_similarity', threshold)
        .order('summary_embedding.cosine_similarity', { ascending: false })
        .limit(limit);
      
      if (!summaryError && summaryMatches) {
        summaryMatches.forEach(note => {
          const existingNote = noteResults.find(r => r.note.id === note.id);
          if (existingNote) {
            if (note.similarity > existingNote.similarity_score) {
              existingNote.similarity_score = note.similarity;
              existingNote.matched_fields = ['summary'];
            } else {
              existingNote.matched_fields.push('summary');
            }
          } else {
            noteResults.push({
              note,
              similarity_score: note.similarity,
              matched_fields: ['summary']
            });
          }
        });
      }
      
      // Remove duplicates and sort
      const uniqueResults = noteResults.reduce((acc, result) => {
        const existing = acc.find(r => r.note.id === result.note.id);
        if (!existing) {
          acc.push(result);
        } else if (result.similarity_score > existing.similarity_score) {
          existing.similarity_score = result.similarity_score;
          existing.matched_fields = result.matched_fields;
        }
        return acc;
      }, [] as typeof noteResults);
      
      uniqueResults.sort((a, b) => b.similarity_score - a.similarity_score);
      const limitedResults = uniqueResults.slice(0, limit);
      
      // Add URLs to media attachments
      const finalResults = limitedResults.map(result => ({
        ...result,
        note: {
          ...result.note,
          media_attachments: result.note.media_attachments?.map((attachment: any) => ({
            ...attachment,
            url: getMediaUrl(attachment.storage_path),
            thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
          }))
        }
      }));
      
      console.log('Fallback search completed:', finalResults.length, 'results');
      
      return NextResponse.json({
        folder,
        notes: finalResults,
        total_matches: finalResults.length,
        search_threshold: threshold,
        debug: {
          embedding_type: embeddingType,
          method: 'fallback_individual_queries',
          title_matches: titleMatches?.length || 0,
          content_matches: contentMatches?.length || 0,
          summary_matches: summaryMatches?.length || 0
        }
      });
    }
    
    console.log('Custom function search completed:', searchResults?.length || 0, 'results');
    
    // Add URLs to media attachments
    const finalResults = (searchResults || []).map((result: any) => ({
      ...result,
      note: {
        ...result.note,
        media_attachments: result.note.media_attachments?.map((attachment: any) => ({
          ...attachment,
          url: getMediaUrl(attachment.storage_path),
          thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
        }))
      }
    }));
    
    return NextResponse.json({
      folder,
      notes: finalResults,
      total_matches: finalResults.length,
      search_threshold: threshold,
      debug: {
        embedding_type: embeddingType,
        method: 'custom_function',
        search_embedding_length: searchEmbedding.length
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
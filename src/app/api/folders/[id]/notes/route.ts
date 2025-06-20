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

// GET /api/folders/[id]/notes - Get notes using AI-bridged semantic matching
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== AI-BRIDGED FOLDER SEARCH ===');
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
      has_ai_matching_embedding: !!folder.ai_matching_embedding,
      has_title_embedding: !!folder.title_embedding,
      has_description_embedding: !!folder.description_embedding
    });

    // Step 2: Use AI-bridged matching as primary method
    if (folder.ai_matching_embedding) {
      console.log('Using AI-bridged matching (primary method)');
      
      try {
        const { data: aiSearchResults, error: aiSearchError } = await supabase.rpc(
          'search_folder_notes_ai_bridged',
          {
            query_folder_id: params.id,
            similarity_threshold: threshold,
            max_results: limit
          }
        );
        
        if (!aiSearchError && aiSearchResults) {
          console.log('AI-bridged search successful:', aiSearchResults.length, 'results');
          
          // Process results and add media URLs
          const processedResults = aiSearchResults.map((result: any) => {
            const note = result.note_data;
            return {
              note: {
                ...note,
                media_attachments: note.media_attachments?.map((attachment: any) => ({
                  ...attachment,
                  url: getMediaUrl(attachment.storage_path),
                  thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
                }))
              },
              similarity_score: result.similarity_score,
              matched_fields: [result.matched_via === 'ai_bridged' ? 'ai_categorization' : 'content_fallback']
            };
          });
          
          return NextResponse.json({
            folder,
            notes: processedResults,
            total_matches: processedResults.length,
            search_threshold: threshold,
            method: 'ai_bridged',
            debug: {
              ai_matching_available: true,
              primary_method: 'ai_bridged_matching'
            }
          });
        } else {
          console.log('AI-bridged search failed, falling back:', aiSearchError);
        }
      } catch (aiBridgedError) {
        console.error('AI-bridged search error:', aiBridgedError);
      }
    }

    // Step 3: Fallback to enhanced matching with available embeddings
    console.log('Using fallback matching methods');
    
    // Check if folder has any embeddings at all
    if (!folder.ai_matching_embedding && !folder.title_embedding && !folder.description_embedding && !folder.enhanced_description_embedding) {
      console.log('No embeddings found for folder');
      return NextResponse.json({
        folder,
        notes: [],
        total_matches: 0,
        search_threshold: threshold,
        method: 'no_embeddings',
        message: 'Folder embeddings are still being generated. Please wait a moment and try again.'
      });
    }

    // Use the best available folder embedding
    let searchEmbedding: number[];
    let embeddingType: string;
    
    if (folder.ai_matching_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.ai_matching_embedding);
      embeddingType = 'ai_matching';
    } else if (folder.enhanced_description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.enhanced_description_embedding);
      embeddingType = 'enhanced_description';
    } else if (folder.description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.description_embedding);
      embeddingType = 'description';
    } else {
      searchEmbedding = parseEmbeddingFromDb(folder.title_embedding);
      embeddingType = 'title';
    }
    
    console.log('Using fallback embedding type:', embeddingType);
    console.log('Search embedding length:', searchEmbedding.length);

    const searchEmbeddingStr = formatEmbeddingForQuery(searchEmbedding);
    const noteResults: Array<{ note: any; similarity_score: number; matched_fields: string[] }> = [];
    
    // Search AI categorization embeddings first (best match)
    const { data: aiCatMatches, error: aiCatError } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*),
        similarity:ai_categorization_embedding.cosine_similarity(${searchEmbeddingStr})
      `)
      .not('ai_categorization_embedding', 'is', null)
      .gte('ai_categorization_embedding.cosine_similarity', threshold)
      .order('ai_categorization_embedding.cosine_similarity', { ascending: false })
      .limit(limit);
    
    if (!aiCatError && aiCatMatches) {
      console.log('Found AI categorization matches:', aiCatMatches.length);
      aiCatMatches.forEach(note => {
        noteResults.push({
          note,
          similarity_score: note.similarity,
          matched_fields: ['ai_categorization']
        });
      });
    }
    
    // Search title embeddings (if we haven't hit the limit)
    if (noteResults.length < limit) {
      const { data: titleMatches, error: titleError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*),
          similarity:title_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('title_embedding', 'is', null)
        .gte('title_embedding.cosine_similarity', threshold)
        .order('title_embedding.cosine_similarity', { ascending: false })
        .limit(limit - noteResults.length);
      
      if (!titleError && titleMatches) {
        console.log('Found title matches:', titleMatches.length);
        titleMatches.forEach(note => {
          const existingNote = noteResults.find(r => r.note.id === note.id);
          if (existingNote) {
            if (note.similarity > existingNote.similarity_score) {
              existingNote.similarity_score = note.similarity;
              existingNote.matched_fields = ['title'];
            } else {
              existingNote.matched_fields.push('title');
            }
          } else {
            noteResults.push({
              note,
              similarity_score: note.similarity,
              matched_fields: ['title']
            });
          }
        });
      }
    }
    
    // Search content embeddings (if we haven't hit the limit)
    if (noteResults.length < limit) {
      const { data: contentMatches, error: contentError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*),
          similarity:content_embedding.cosine_similarity(${searchEmbeddingStr})
        `)
        .not('content_embedding', 'is', null)
        .gte('content_embedding.cosine_similarity', threshold)
        .order('content_embedding.cosine_similarity', { ascending: false })
        .limit(limit - noteResults.length);
      
      if (!contentError && contentMatches) {
        console.log('Found content matches:', contentMatches.length);
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
      method: 'fallback_hybrid',
      debug: {
        folder_embedding_type: embeddingType,
        ai_categorization_matches: aiCatMatches?.length || 0,
        title_matches: noteResults.filter(r => r.matched_fields.includes('title')).length,
        content_matches: noteResults.filter(r => r.matched_fields.includes('content')).length
      }
    });
    
  } catch (error) {
    console.error('Error in AI-bridged folder search:', error);
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
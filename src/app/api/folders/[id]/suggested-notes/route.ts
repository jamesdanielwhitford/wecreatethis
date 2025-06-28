// src/app/api/folders/[id]/suggested-notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

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

// GET /api/folders/[id]/suggested-notes - Get AI-suggested notes for a folder
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== AI-SUGGESTED NOTES FOR FOLDER ===');
    console.log('Folder ID:', params.id);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const threshold = parseFloat(searchParams.get('threshold') || '0');
    
    console.log('Search params:', { limit, threshold });

    // Step 1: Get the folder and its embeddings
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
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    console.log('Folder found:', folder.title);

    // Step 2: Get notes already in this folder (to exclude from suggestions)
    const { data: currentNotes, error: currentNotesError } = await supabase
      .from('folder_notes')
      .select('note_id')
      .eq('folder_id', params.id);
    
    if (currentNotesError) {
      console.error('Current notes fetch error:', currentNotesError);
      throw currentNotesError;
    }
    
    const excludeNoteIds = (currentNotes || []).map(fn => fn.note_id);
    console.log('Excluding current notes:', excludeNoteIds.length);
    console.log('Excluded note IDs:', excludeNoteIds);

    // Step 3: Determine which folder embedding to use for matching
    let searchEmbedding: number[] | null = null;
    let embeddingType: string = 'none';
    
    if (folder.ai_matching_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.ai_matching_embedding);
      embeddingType = 'ai_matching';
    } else if (folder.enhanced_description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.enhanced_description_embedding);
      embeddingType = 'enhanced_description';
    } else if (folder.description_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.description_embedding);
      embeddingType = 'description';
    } else if (folder.title_embedding) {
      searchEmbedding = parseEmbeddingFromDb(folder.title_embedding);
      embeddingType = 'title';
    }
    
    console.log('Using folder embedding type:', embeddingType);
    if (searchEmbedding) {
      console.log('Search embedding length:', searchEmbedding.length);
    } else {
      console.log('No folder embeddings available - will show notes in creation order');
    }

    const noteResults: Array<{ note: any; similarity_score: number; match_reason: string }> = [];
    
    // Step 4: Only do embedding-based searches if we have a folder embedding
    if (searchEmbedding) {
      // Simplified approach: Get notes with embeddings and calculate similarity in-memory
      
      // Primary search: AI categorization embeddings
      try {
        const { data: aiNotes, error: aiError } = await supabase
          .from('notes')
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at,
            ai_categorization_description,
            ai_categorization_embedding,
            media_attachments (*)
          `)
          .not('ai_categorization_embedding', 'is', null)
          .limit(Math.min(limit * 2, 30)); // Get more than needed for filtering
        
        if (!aiError && aiNotes) {
          console.log('Found notes with AI categorization embeddings:', aiNotes.length);
          
          // Calculate similarity and filter
          aiNotes.forEach(note => {
            // Skip if already in folder
            if (excludeNoteIds.includes(note.id)) return;
            
            try {
              const noteEmbedding = parseEmbeddingFromDb(note.ai_categorization_embedding);
              const similarity = calculateCosineSimilarity(searchEmbedding, noteEmbedding);
              
              if (similarity >= threshold) {
                noteResults.push({
                  note,
                  similarity_score: similarity,
                  match_reason: 'ai_categorization'
                });
              }
            } catch (embErr) {
              console.warn('Error calculating AI categorization similarity for note:', note.id, embErr);
            }
          });
        } else if (aiError) {
          console.warn('AI categorization search failed:', aiError.message);
        }
      } catch (err) {
        console.warn('AI categorization search error:', err);
      }
      
      // Secondary search: Title embeddings (if we have room)
      if (noteResults.length < limit) {
        try {
          const { data: titleNotes, error: titleError } = await supabase
            .from('notes')
            .select(`
              id,
              title,
              content,
              created_at,
              updated_at,
              title_embedding,
              media_attachments (*)
            `)
            .not('title_embedding', 'is', null)
            .limit(Math.min(limit * 2, 30));
          
          if (!titleError && titleNotes) {
            console.log('Found notes with title embeddings:', titleNotes.length);
            
            titleNotes.forEach(note => {
              // Skip if already in folder or already added to results
              if (excludeNoteIds.includes(note.id) || noteResults.some(r => r.note.id === note.id)) return;
              
              try {
                const noteEmbedding = parseEmbeddingFromDb(note.title_embedding);
                const similarity = calculateCosineSimilarity(searchEmbedding, noteEmbedding);
                
                if (similarity >= threshold) {
                  noteResults.push({
                    note,
                    similarity_score: similarity,
                    match_reason: 'title_similarity'
                  });
                }
              } catch (embErr) {
                console.warn('Error calculating title similarity for note:', note.id, embErr);
              }
            });
          } else if (titleError) {
            console.warn('Title similarity search failed:', titleError.message);
          }
        } catch (err) {
          console.warn('Title similarity search error:', err);
        }
      }
      
      // Tertiary search: Content embeddings (if we still have room)
      if (noteResults.length < limit) {
        try {
          const { data: contentNotes, error: contentError } = await supabase
            .from('notes')
            .select(`
              id,
              title,
              content,
              created_at,
              updated_at,
              content_embedding,
              media_attachments (*)
            `)
            .not('content_embedding', 'is', null)
            .limit(Math.min(limit * 2, 30));
          
          if (!contentError && contentNotes) {
            console.log('Found notes with content embeddings:', contentNotes.length);
            
            contentNotes.forEach(note => {
              // Skip if already in folder or already added to results
              if (excludeNoteIds.includes(note.id) || noteResults.some(r => r.note.id === note.id)) return;
              
              try {
                const noteEmbedding = parseEmbeddingFromDb(note.content_embedding);
                const similarity = calculateCosineSimilarity(searchEmbedding, noteEmbedding);
                
                if (similarity >= threshold) {
                  noteResults.push({
                    note,
                    similarity_score: similarity,
                    match_reason: 'content_similarity'
                  });
                }
              } catch (embErr) {
                console.warn('Error calculating content similarity for note:', note.id, embErr);
              }
            });
          } else if (contentError) {
            console.warn('Content similarity search failed:', contentError.message);
          }
        } catch (err) {
          console.warn('Content similarity search error:', err);
        }
      }
    }
    
    // Step 5: FALLBACK - Get remaining notes without embeddings by creation order
    if (noteResults.length < limit) {
      const remainingLimit = limit - noteResults.length;
      const excludeNoteIdsWithResults = [...excludeNoteIds, ...noteResults.map(r => r.note.id)];
      
      console.log('Fetching remaining notes by creation order, limit:', remainingLimit);
      console.log('Excluding note IDs with results:', excludeNoteIdsWithResults);
      
      try {
        let query = supabase
          .from('notes')
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at,
            media_attachments (*)
          `)
          .order('created_at', { ascending: false })
          .limit(remainingLimit);
        
        // Use individual .neq() calls for each ID to exclude (more reliable)
        excludeNoteIdsWithResults.forEach(excludeId => {
          query = query.neq('id', excludeId);
        });
        
        const { data: remainingNotes, error: remainingError } = await query;
        
        if (!remainingError && remainingNotes) {
          console.log('Found remaining notes by creation order:', remainingNotes.length);
          remainingNotes.forEach(note => {
            noteResults.push({
              note,
              similarity_score: 0, // No similarity score for creation order
              match_reason: searchEmbedding ? 'no_note_embedding' : 'creation_order'
            });
          });
        } else if (remainingError) {
          console.error('Error fetching remaining notes:', remainingError);
        }
      } catch (err) {
        console.error('Fallback notes search error:', err);
      }
    }
    
    // Step 6: Sort all results by similarity score (highest first) and limit
    noteResults.sort((a, b) => b.similarity_score - a.similarity_score);
    const limitedResults = noteResults.slice(0, limit);
    
    // Step 7: Add media URLs and process results
    const processedSuggestions = limitedResults.map(result => ({
      note: {
        ...result.note,
        media_attachments: result.note.media_attachments?.map((attachment: any) => ({
          ...attachment,
          url: getMediaUrl(attachment.storage_path),
          thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
        }))
      },
      similarity_score: result.similarity_score,
      match_reason: result.match_reason
    }));
    
    console.log('Returning all available notes ordered by relevance:', processedSuggestions.length);
    
    return NextResponse.json({
      folder: { id: folder.id, title: folder.title, description: folder.description },
      suggested_notes: processedSuggestions,
      total_suggestions: processedSuggestions.length,
      threshold,
      method: 'all_available_notes_by_relevance',
      debug: {
        folder_embedding_type: embeddingType,
        ai_categorization_matches: noteResults.filter(r => r.match_reason === 'ai_categorization').length,
        title_matches: noteResults.filter(r => r.match_reason === 'title_similarity').length,
        content_matches: noteResults.filter(r => r.match_reason === 'content_similarity').length,
        creation_order_matches: noteResults.filter(r => r.match_reason === 'creation_order').length,
        no_embedding_matches: noteResults.filter(r => r.match_reason === 'no_note_embedding').length,
        total_excluded_notes: excludeNoteIds.length,
        search_embedding_available: !!searchEmbedding
      }
    });
    
  } catch (error) {
    console.error('Error fetching suggested notes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch suggested notes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
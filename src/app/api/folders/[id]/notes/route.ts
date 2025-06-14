// src/app/api/folders/[id]/notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FolderNoteResult } from '@/apps/beautifulmind/types/notes.types';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// GET /api/folders/[id]/notes - Get notes that match this folder's semantic space
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7'); // Similarity threshold
    
    // First, get the folder and its embeddings
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (folderError) throw folderError;
    
    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    // Check if folder has embeddings
    if (!folder.title_embedding && !folder.description_embedding && !folder.enhanced_description_embedding) {
      return NextResponse.json({
        folder,
        notes: [],
        message: 'Folder embeddings not yet generated'
      });
    }
    
    const results: FolderNoteResult[] = [];
    
    // Build the search query - we'll use the enhanced_description_embedding if available,
    // otherwise fall back to description_embedding, then title_embedding
    let searchEmbedding = folder.enhanced_description_embedding || 
                         folder.description_embedding || 
                         folder.title_embedding;
    
    if (!searchEmbedding) {
      return NextResponse.json({
        folder,
        notes: [],
        message: 'No folder embeddings available for search'
      });
    }
    
    // Convert embedding array to the format needed for vector search
    const embeddingString = `[${searchEmbedding.join(',')}]`;
    
    // Search in notes table - title, content, and summary embeddings
    const noteSearches = [
      // Search by note titles
      supabase.rpc('match_notes_by_title', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit
      }),
      // Search by note content  
      supabase.rpc('match_notes_by_content', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit
      }),
      // Search by note summaries (if they exist)
      supabase.rpc('match_notes_by_summary', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit
      })
    ];
    
    // Search in media_attachments table - transcriptions and descriptions
    const mediaSearches = [
      // Search by transcriptions
      supabase.rpc('match_media_by_transcription', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit
      }),
      // Search by descriptions
      supabase.rpc('match_media_by_description', {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: limit
      })
    ];
    
    // Execute all searches in parallel
    const searchResults = await Promise.allSettled([...noteSearches, ...mediaSearches]);
    
    // Collect all note IDs and their best similarity scores
    const noteScores = new Map<string, { score: number; fields: string[] }>();
    
    // Process note search results
    const noteSearchLabels = ['title', 'content', 'summary'];
    searchResults.slice(0, 3).forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        result.value.data.forEach((item: any) => {
          const noteId = item.id;
          const score = item.similarity;
          const field = noteSearchLabels[index];
          
          if (!noteScores.has(noteId) || noteScores.get(noteId)!.score < score) {
            noteScores.set(noteId, {
              score,
              fields: noteScores.get(noteId)?.fields ? 
                [...noteScores.get(noteId)!.fields, field] : [field]
            });
          }
        });
      }
    });
    
    // Process media search results - need to get the note_id from media_attachments
    const mediaSearchLabels = ['transcription', 'description'];
    searchResults.slice(3, 5).forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        result.value.data.forEach((item: any) => {
          const noteId = item.note_id; // Media attachments have note_id
          const score = item.similarity;
          const field = `media_${mediaSearchLabels[index]}`;
          
          if (!noteScores.has(noteId) || noteScores.get(noteId)!.score < score) {
            noteScores.set(noteId, {
              score,
              fields: noteScores.get(noteId)?.fields ? 
                [...noteScores.get(noteId)!.fields, field] : [field]
            });
          }
        });
      }
    });
    
    // Get the actual notes with their media attachments
    if (noteScores.size > 0) {
      const noteIds = Array.from(noteScores.keys());
      
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*)
        `)
        .in('id', noteIds)
        .order('created_at', { ascending: false });
      
      if (notesError) throw notesError;
      
      if (notes) {
        // Format results with similarity scores and matched fields
        const folderNoteResults: FolderNoteResult[] = notes.map(note => {
          const scoreData = noteScores.get(note.id)!;
          
          // Add URLs to media attachments
          const noteWithUrls = {
            ...note,
            media_attachments: note.media_attachments?.map((attachment: any) => ({
              ...attachment,
              url: getMediaUrl(attachment.storage_path),
              thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
            }))
          };
          
          return {
            note: noteWithUrls,
            similarity_score: scoreData.score,
            matched_fields: scoreData.fields
          };
        });
        
        // Sort by similarity score (highest first)
        folderNoteResults.sort((a, b) => b.similarity_score - a.similarity_score);
        
        return NextResponse.json({
          folder,
          notes: folderNoteResults,
          total_matches: folderNoteResults.length,
          search_threshold: threshold
        });
      }
    }
    
    return NextResponse.json({
      folder,
      notes: [],
      total_matches: 0,
      search_threshold: threshold
    });
    
  } catch (error) {
    console.error('Error searching folder notes:', error);
    return NextResponse.json(
      { error: 'Failed to search folder notes' },
      { status: 500 }
    );
  }
}
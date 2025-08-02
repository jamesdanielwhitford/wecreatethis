// src/app/api/notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiMatchingService } from '@/apps/beautifulmind/utils/ai-matching';
import { autoProcessEmbeddings } from '@/apps/beautifulmind/utils/auto-embeddings';

// Initialize Supabase client with anon key for regular operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for bypass operations (if needed)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// GET /api/notes - Get all notes
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Add URLs to media attachments
    const notesWithUrls = (data || []).map(note => ({
      ...note,
      media_attachments: note.media_attachments?.map((attachment: { storage_path: string; thumbnail_path?: string }) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    }));
    
    return NextResponse.json(notesWithUrls);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note with AI categorization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;
    
    console.log('Creating note with AI categorization:', { title: title?.substring(0, 50), contentLength: content?.length });
    
    // Check if we have service role key for bypass
    if (!supabaseServiceKey) {
      console.warn('No service role key configured, using anon key (may fail with RLS)');
    }
    
    // Use service role client to avoid RLS issues during testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Step 1: Get existing folders for AI context
    const existingFolders = await aiMatchingService.getExistingFolders();
    console.log('Found existing folders for context:', existingFolders.length);
    
    // Step 2: Generate AI categorization description
    let aiCategorizationDescription = '';
    try {
      if (content && content.trim()) {
        const aiResult = await aiMatchingService.generateNoteCategorization(
          { title: title?.trim(), content: content.trim() },
          [], // transcriptions - will be added later when media is processed
          [], // descriptions - will be added later when media is processed  
          existingFolders
        );
        aiCategorizationDescription = aiResult.description;
        console.log('Generated AI categorization:', aiCategorizationDescription);
      }
    } catch (aiError) {
      console.error('AI categorization generation failed:', aiError);
      // Continue without AI description - it's not critical for note creation
    }
    
    // Step 3: Create note with AI categorization
    const noteData = {
      title: title || 'Untitled Note', 
      content: content || '',
      ai_categorization_description: aiCategorizationDescription || null,
      // For testing without auth - set to null to avoid foreign key issues
      user_id: null
    };
    
    console.log('Inserting note data with AI categorization');
    
    const { data, error } = await client
      .from('notes')
      .insert([noteData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        error: 'Failed to create note',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }
    
    console.log('Note created successfully with AI categorization:', data.id);
    
    // Step 4: Queue embedding generation for AI categorization (background process)
    if (aiCategorizationDescription) {
      try {
        await aiMatchingService.queueEmbeddingGeneration('note', data.id, 'ai_categorization');
        console.log('Queued AI categorization embedding generation');
      } catch (embeddingError) {
        console.error('Failed to queue embedding generation:', embeddingError);
        // Don't fail the request for embedding issues
      }
    }
    
    // Step 5: Auto-process embeddings in background
    setTimeout(async () => {
      await autoProcessEmbeddings();
    }, 2000);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create note',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
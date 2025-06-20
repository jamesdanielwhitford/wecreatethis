// src/app/api/folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Folder, FolderFormData } from '@/apps/beautifulmind/types/notes.types';
import { aiMatchingService } from '@/apps/beautifulmind/utils/ai-matching';

// Initialize Supabase client with anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for bypass operations  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to auto-process embeddings
async function autoProcessEmbeddings(): Promise<void> {
  try {
    console.log('Auto-processing folder embeddings...');
    
    const response = await fetch('/api/embeddings/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 10 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Auto-embedding processing failed:', errorText);
    } else {
      const result = await response.json();
      console.log('Auto-embedding processing completed:', result);
    }
  } catch (error) {
    console.warn('Auto-embedding processing error:', error);
    // Don't throw - this is a background process
  }
}

// GET /api/folders - Get all folders for user
export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS for testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    const { data, error } = await client
      .from('folders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error fetching folders:', error);
      throw error;
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch folders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/folders - Create a new folder with AI matching description
export async function POST(request: NextRequest) {
  try {
    const body: FolderFormData = await request.json();
    const { title, description } = body;
    
    console.log('Creating folder with AI matching:', { title, description });
    
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Check if we have service role key for bypass
    if (!supabaseServiceKey) {
      console.warn('No service role key configured, using anon key (may fail with RLS)');
    }
    
    // Use service role client to avoid RLS issues during testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Step 1: Get existing folders for AI context
    const existingFolders = await aiMatchingService.getExistingFolders();
    console.log('Found existing folders for context:', existingFolders.length);
    
    // Step 2: Generate AI matching description
    let aiMatchingDescription = '';
    try {
      const aiResult = await aiMatchingService.generateFolderMatchingDescription(
        { title: title.trim(), description: description?.trim() },
        existingFolders
      );
      aiMatchingDescription = aiResult.description;
      console.log('Generated AI matching description:', aiMatchingDescription);
    } catch (aiError) {
      console.error('AI matching generation failed:', aiError);
      // Continue without AI description - it's not critical for folder creation
    }
    
    // Step 3: Create folder with AI description
    const folderData = {
      title: title.trim(), 
      description: description?.trim() || null,
      ai_matching_description: aiMatchingDescription || null,
      // For testing without auth - set to null to avoid foreign key issues
      user_id: null
    };
    
    console.log('Inserting folder data:', folderData);
    
    const { data, error } = await client
      .from('folders')
      .insert([folderData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating folder:', error);
      return NextResponse.json({
        error: 'Failed to create folder',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }
    
    console.log('Folder created successfully:', data);
    
    // Step 4: Queue embedding generation for AI description (background process)
    if (aiMatchingDescription) {
      try {
        await aiMatchingService.queueEmbeddingGeneration('folder', data.id, 'ai_matching');
        console.log('Queued AI matching embedding generation');
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
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
// src/app/api/folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FolderFormData } from '@/apps/beautifulmind/types/notes.types';
import { aiMatchingService } from '@/apps/beautifulmind/utils/ai-matching';
// import { autoProcessEmbeddings } from '@/apps/beautifulmind/utils/auto-embeddings';
import { buildFolderTree } from '@/apps/beautifulmind/utils/folder-hierarchy';

// Initialize Supabase client with anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for bypass operations  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);


// GET /api/folders - Get all folders for user with optional hierarchy
export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS for testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hierarchy = searchParams.get('hierarchy') === 'true';
    const parentId = searchParams.get('parent_id');
    
    let query = client
      .from('folders')
      .select('*');
    
    // If parent_id is specified, get only children of that folder
    if (parentId !== null) {
      if (parentId === 'null' || parentId === '') {
        // Get root level folders
        query = query.is('parent_folder_id', null);
      } else {
        // Get children of specific folder
        query = query.eq('parent_folder_id', parentId);
      }
    }
    
    query = query.order('title', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error fetching folders:', error);
      throw error;
    }
    
    const folders = data || [];
    
    // If hierarchy is requested and no specific parent filter, build tree structure
    if (hierarchy && parentId === null) {
      const folderTree = buildFolderTree(folders);
      return NextResponse.json(folderTree);
    }
    
    return NextResponse.json(folders);
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
    const { title, description, parent_folder_id } = body;
    
    console.log('Creating folder with AI matching:', { title, description, parent_folder_id });
    
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Validate parent folder exists if specified
    if (parent_folder_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', parent_folder_id)
        .single();
      
      if (parentError || !parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 400 }
        );
      }
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
      parent_folder_id: parent_folder_id || null,
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
    // TODO: Fix auto-processing for Vercel deployment
    // setTimeout(async () => {
    //   await autoProcessEmbeddings();
    // }, 2000);
    
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
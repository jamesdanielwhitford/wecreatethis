// src/app/api/folders/[id]/move-note/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for bypass operations  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// POST /api/folders/[id]/move-note - Move a note from another folder to this folder (exclusive)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { note_id, source_folder_id } = body;
    
    if (!note_id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }
    
    // Use service role to bypass RLS for testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Verify note exists
    const { data: note, error: noteError } = await client
      .from('notes')
      .select('id, title')
      .eq('id', note_id)
      .single();
    
    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Verify target folder exists
    const { data: targetFolder, error: folderError } = await client
      .from('folders')
      .select('id, title')
      .eq('id', params.id)
      .single();
    
    if (folderError || !targetFolder) {
      return NextResponse.json(
        { error: 'Target folder not found' },
        { status: 404 }
      );
    }
    
    // Start transaction-like operations
    // 1. Remove from source folder if specified
    if (source_folder_id) {
      const { error: removeError } = await client
        .from('folder_notes')
        .delete()
        .eq('note_id', note_id)
        .eq('folder_id', source_folder_id);
      
      if (removeError) {
        console.error('Error removing note from source folder:', removeError);
        // Continue anyway - note might not have been in source folder
      }
    } else {
      // Remove from ALL folders (complete move)
      const { error: removeAllError } = await client
        .from('folder_notes')
        .delete()
        .eq('note_id', note_id);
      
      if (removeAllError) {
        console.error('Error removing note from all folders:', removeAllError);
      }
    }
    
    // 2. Add to target folder
    const { data: existingRelation } = await client
      .from('folder_notes')
      .select('id')
      .eq('folder_id', params.id)
      .eq('note_id', note_id)
      .single();
    
    if (!existingRelation) {
      const { error: addError } = await client
        .from('folder_notes')
        .insert({
          folder_id: params.id,
          note_id: note_id,
          added_at: new Date().toISOString()
        });
      
      if (addError) {
        throw addError;
      }
    }
    
    return NextResponse.json({
      message: 'Note moved successfully',
      note: { id: note.id, title: note.title },
      target_folder: { id: targetFolder.id, title: targetFolder.title },
      source_folder_id: source_folder_id || null
    });
    
  } catch (error) {
    console.error('Error moving note:', error);
    return NextResponse.json(
      { 
        error: 'Failed to move note',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
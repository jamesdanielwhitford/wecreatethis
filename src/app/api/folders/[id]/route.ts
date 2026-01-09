// src/app/api/folders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FolderFormData } from '@/apps/beautifulmind/types/notes.types';
import { canMoveFolder } from '@/apps/beautifulmind/utils/folder-hierarchy';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// GET /api/folders/[id] - Get a specific folder
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

// PUT /api/folders/[id] - Update a folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: FolderFormData = await request.json();
    const { title, description, parent_folder_id } = body;
    
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // If parent_folder_id is being changed, validate the move
    if (parent_folder_id !== undefined) {
      // Get all folders to check for circular references
      const { data: allFolders, error: fetchError } = await supabase
        .from('folders')
        .select('*');
      
      if (fetchError) throw fetchError;
      
      if (!canMoveFolder(params.id, parent_folder_id, allFolders || [])) {
        return NextResponse.json(
          { error: 'Cannot move folder: would create circular reference' },
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
    }
    
    const updateData: {
      title: string;
      description: string | null;
      updated_at: string;
      parent_folder_id?: string | null;
    } = {
      title: title.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString()
    };
    
    // Only update parent_folder_id if it was provided in the request
    if (parent_folder_id !== undefined) {
      updateData.parent_folder_id = parent_folder_id;
    }
    
    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - Delete a folder
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', params.id);
    
    if (error) throw error;
    
    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
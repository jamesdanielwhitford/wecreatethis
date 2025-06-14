// src/app/api/folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Folder, FolderFormData } from '@/apps/beautifulmind/types/notes.types';

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

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const body: FolderFormData = await request.json();
    const { title, description } = body;
    
    console.log('Creating folder with:', { title, description });
    
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
    
    const folderData = {
      title: title.trim(), 
      description: description?.trim() || null,
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
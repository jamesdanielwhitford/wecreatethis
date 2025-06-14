// src/app/api/test-notes/route.ts
// Simplified test endpoint to debug note creation issues

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Testing Note Creation ===');
    
    // Use service role to bypass any RLS issues
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Supabase client created');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Test 1: Simple insert without triggers
    console.log('Attempting simple note insert...');
    
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        title: body.title || 'Test Note',
        content: body.content || 'Test content',
        user_id: null, // Allow null for testing
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        step: 'note_insert'
      }, { status: 500 });
    }
    
    console.log('Note inserted successfully:', data);
    
    // Test 2: Check if pending embeddings were created
    console.log('Checking pending embeddings...');
    
    const { data: pendingEmbeddings, error: pendingError } = await supabase
      .from('pending_embeddings')
      .select('*')
      .eq('entity_id', data.id);
    
    if (pendingError) {
      console.error('Pending embeddings error:', pendingError);
    } else {
      console.log('Pending embeddings created:', pendingEmbeddings);
    }
    
    return NextResponse.json({
      success: true,
      note: data,
      pending_embeddings: pendingEmbeddings || [],
      message: 'Note created successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}

// GET endpoint to check database status
export async function GET() {
  try {
    if (!supabaseUrl) {
      return NextResponse.json({
        database_status: 'error',
        error: 'SUPABASE_URL not configured'
      }, { status: 500 });
    }
    
    if (!supabaseServiceKey) {
      return NextResponse.json({
        database_status: 'error',
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test basic connection by trying to query notes table
    const { data, error } = await supabase
      .from('notes')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        database_status: 'error',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    return NextResponse.json({
      database_status: 'connected',
      message: 'Database connection successful',
      service_role_configured: true,
      supabase_url_configured: true
    });
    
  } catch (error) {
    return NextResponse.json({
      database_status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}
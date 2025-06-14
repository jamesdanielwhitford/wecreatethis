// src/app/api/embeddings/embed/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/apps/beautifulmind/utils/embedding';

interface EmbedRequest {
  text?: string;
  entity_type?: 'note' | 'media_attachment' | 'folder';
  entity_id?: string;
  field_name?: string;
}

// POST /api/embeddings/embed - Manually embed text or trigger entity embedding
export async function POST(request: NextRequest) {
  try {
    const body: EmbedRequest = await request.json();
    
    // Handle direct text embedding (useful for testing)
    if (body.text) {
      const embedding = await embeddingService.embedText(body.text);
      
      return NextResponse.json({
        success: true,
        embedding,
        dimensions: embedding.length,
        text: body.text
      });
    }
    
    // Handle entity embedding
    if (body.entity_type && body.entity_id && body.field_name) {
      // Create a pending embedding entry (this will be processed by the triggers)
      const { createClient } = require('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error } = await supabase
        .from('pending_embeddings')
        .upsert({
          entity_type: body.entity_type,
          entity_id: body.entity_id,
          field_name: body.field_name,
          priority: 1, // High priority for manual requests
          created_at: new Date().toISOString(),
          processed_at: null,
          error_message: null
        });
      
      if (error) {
        throw new Error(`Failed to queue embedding: ${error.message}`);
      }
      
      // Process the embedding immediately
      const pendingEmbedding = {
        id: `manual-${Date.now()}`,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        field_name: body.field_name,
        priority: 1,
        created_at: new Date().toISOString()
      };
      
      await embeddingService.processPendingEmbedding(pendingEmbedding);
      
      return NextResponse.json({
        success: true,
        message: 'Entity embedding processed successfully',
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        field_name: body.field_name
      });
    }
    
    return NextResponse.json(
      { error: 'Either "text" or "entity_type", "entity_id", and "field_name" are required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error processing embedding request:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to process embedding request' 
      },
      { status: 500 }
    );
  }
}
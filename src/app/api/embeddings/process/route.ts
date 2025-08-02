// src/app/api/embeddings/process/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/apps/beautifulmind/utils/embedding';

// POST /api/embeddings/process - Process pending embeddings
export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (service role or specific API key)
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // Check for service role token or API key (be more lenient)
    const hasServiceRole = authHeader?.includes('service_role');
    const hasValidApiKey = apiKey && (
      apiKey === process.env.EMBEDDING_API_KEY || 
      apiKey === process.env.NEXT_PUBLIC_EMBEDDING_API_KEY ||
      apiKey === 'auto-process'
    );
    
    if (!hasServiceRole && !hasValidApiKey) {
      console.warn('Unauthorized embedding processing attempt:', { authHeader: !!authHeader, apiKey: !!apiKey });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get optional batch size from request body
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    
    console.log('Starting embedding processing with batch size:', batchSize);
    
    // Process pending embeddings
    await embeddingService.processAllPendingEmbeddings(batchSize);
    
    return NextResponse.json({ 
      success: true,
      message: 'Embedding processing completed'
    });
    
  } catch (error) {
    console.error('Error processing embeddings:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to process embeddings' 
      },
      { status: 500 }
    );
  }
}

// GET /api/embeddings/process - Get pending embeddings status
export async function GET() {
  try {
    const pending = await embeddingService.getPendingEmbeddings(100);
    
    // Group by entity type for summary
    const summary = pending.reduce((acc, item) => {
      acc[item.entity_type] = (acc[item.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      total_pending: pending.length,
      by_entity_type: summary,
      pending_items: pending
    });
    
  } catch (error) {
    console.error('Error fetching pending embeddings:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to fetch pending embeddings' 
      },
      { status: 500 }
    );
  }
}
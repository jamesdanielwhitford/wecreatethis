// src/apps/beautifulmind/utils/auto-embeddings.ts

/**
 * Helper function to automatically process embeddings after creating content
 * This makes the user experience smoother by processing embeddings in the background
 */
export async function autoProcessEmbeddings(): Promise<void> {
  try {
    // Call the embedding processing endpoint
    const response = await fetch('/api/embeddings/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 10 })
    });

    if (!response.ok) {
      console.warn('Auto-embedding processing failed:', await response.text());
    } else {
      console.log('Auto-embedding processing completed');
    }
  } catch (error) {
    console.warn('Auto-embedding processing error:', error);
    // Don't throw - this is a background process
  }
}

/**
 * Delay helper for better UX
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
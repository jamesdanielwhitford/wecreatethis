// src/apps/beautifulmind/utils/auto-embeddings.ts

/**
 * Helper function to automatically process embeddings after creating content
 * This makes the user experience smoother by processing embeddings in the background
 */

// Helper to get the base URL for internal API calls
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side: construct from environment or default to localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Development fallback
  return 'http://localhost:3000';
}

export async function autoProcessEmbeddings(): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    console.log('Auto-processing embeddings with base URL:', baseUrl);
    
    // Call the embedding processing endpoint
    const response = await fetch(`${baseUrl}/api/embeddings/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EMBEDDING_API_KEY || process.env.NEXT_PUBLIC_EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 10 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Auto-embedding processing failed:', response.status, errorText);
    } else {
      const result = await response.json();
      console.log('Auto-embedding processing completed:', result);
    }
  } catch (error) {
    console.warn('Auto-embedding processing error:', error);
    // Don't throw - this is a background process
  }
}

/**
 * Auto-process embeddings for media content (transcriptions, descriptions)
 */
export async function autoProcessMediaEmbeddings(): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    console.log('Auto-processing media embeddings with base URL:', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/embeddings/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EMBEDDING_API_KEY || process.env.NEXT_PUBLIC_EMBEDDING_API_KEY || 'auto-process'
      },
      body: JSON.stringify({ batchSize: 15 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Auto-media-embedding processing failed:', response.status, errorText);
    } else {
      const result = await response.json();
      console.log('Auto-media-embedding processing completed:', result);
    }
  } catch (error) {
    console.warn('Auto-media-embedding processing error:', error);
    // Don't throw - this is a background process
  }
}

/**
 * Delay helper for better UX
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
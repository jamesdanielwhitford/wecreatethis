// src/apps/beautifulmind/utils/embedding.ts

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export interface PendingEmbedding {
  id: string;
  entity_type: 'note' | 'media_attachment' | 'folder';
  entity_id: string;
  field_name: string;
  priority: number;
  created_at: string;
}

class EmbeddingService {
  private readonly model = 'text-embedding-3-small'; // 1536 dimensions, cheaper than large
  private readonly maxTokens = 8000; // Safe limit for the model
  
  /**
   * Generate embedding for a single text string
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    
    // Truncate text if it's too long (rough token estimation: 1 token ≈ 4 chars)
    const truncatedText = text.length > this.maxTokens * 4 
      ? text.substring(0, this.maxTokens * 4) + '...'
      : text;
    
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: truncatedText,
        encoding_format: 'float',
      });
      
      return {
        embedding: response.data[0].embedding,
        text: truncatedText,
        tokens: response.usage.total_tokens,
      };
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }
    
    // Filter out empty texts and truncate long ones
    const processedTexts = texts
      .filter(text => text && text.trim().length > 0)
      .map(text => text.length > this.maxTokens * 4 
        ? text.substring(0, this.maxTokens * 4) + '...'
        : text
      );
    
    if (processedTexts.length === 0) {
      return [];
    }
    
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: processedTexts,
        encoding_format: 'float',
      });
      
      return response.data.map((item, index) => ({
        embedding: item.embedding,
        text: processedTexts[index],
        tokens: Math.round(response.usage.total_tokens / processedTexts.length), // Rough approximation
      }));
    } catch (error) {
      console.error('OpenAI batch embedding error:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Format embedding array for PostgreSQL vector type
   */
  private formatEmbeddingForDb(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
  
  /**
   * Get pending embeddings from the database
   */
  async getPendingEmbeddings(limit: number = 50): Promise<PendingEmbedding[]> {
    const { data, error } = await supabase
      .from('pending_embeddings')
      .select('*')
      .is('processed_at', null)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch pending embeddings: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Process a single pending embedding
   */
  async processPendingEmbedding(pending: PendingEmbedding): Promise<void> {
    try {
      console.log(`Processing embedding for ${pending.entity_type} ${pending.entity_id} field ${pending.field_name}`);
      
      // Get the entity and extract the text to embed
      const text = await this.getTextForEmbedding(pending.entity_type, pending.entity_id, pending.field_name);
      
      if (!text || text.trim().length === 0) {
        console.log(`No text found for ${pending.entity_type} ${pending.entity_id} ${pending.field_name}, marking as processed`);
        // Mark as processed with no embedding needed
        await this.markEmbeddingProcessed(pending.id, null);
        return;
      }
      
      console.log(`Generating embedding for text length: ${text.length}`);
      
      // Generate the embedding
      const result = await this.generateEmbedding(text);
      
      console.log(`Generated embedding with ${result.embedding.length} dimensions`);
      
      // Store the embedding back to the appropriate table
      await this.storeEmbedding(pending.entity_type, pending.entity_id, pending.field_name, result.embedding);
      
      // Mark as processed
      await this.markEmbeddingProcessed(pending.id, null);
      
      console.log(`Successfully processed embedding for ${pending.entity_type} ${pending.entity_id}`);
      
    } catch (error) {
      console.error('Error processing pending embedding:', error);
      
      // Mark as processed with error
      await this.markEmbeddingProcessed(
        pending.id, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
  
  /**
   * Get text content for embedding based on entity type and field
   */
  private async getTextForEmbedding(
    entityType: string, 
    entityId: string, 
    fieldName: string
  ): Promise<string | null> {
    switch (entityType) {
      case 'note':
        return this.getNoteText(entityId, fieldName);
      case 'media_attachment':
        return this.getMediaAttachmentText(entityId, fieldName);
      case 'folder':
        return this.getFolderText(entityId, fieldName);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
  
  private async getNoteText(noteId: string, fieldName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('title, content, summary, ai_categorization_description')
        .eq('id', noteId)
        .limit(1);
      
      if (error) {
        console.error(`Error fetching note ${noteId}:`, error);
        throw new Error(`Failed to fetch note: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn(`Note ${noteId} not found`);
        return null;
      }
      
      const note = data[0];
      
      switch (fieldName) {
        case 'title':
          return note.title || null;
        case 'content':
          return note.content || null;
        case 'summary':
          return note.summary || null;
        case 'ai_categorization_description':
          return note.ai_categorization_description || null;
        default:
          throw new Error(`Unknown note field: ${fieldName}`);
      }
    } catch (error) {
      console.error(`Error in getNoteText for ${noteId}:`, error);
      throw error;
    }
  }
  
  private async getMediaAttachmentText(attachmentId: string, fieldName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('media_attachments')
        .select('transcription_text, description, ai_categorization_description')
        .eq('id', attachmentId)
        .limit(1);
      
      if (error) {
        console.error(`Error fetching media attachment ${attachmentId}:`, error);
        throw new Error(`Failed to fetch media attachment: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn(`Media attachment ${attachmentId} not found`);
        return null;
      }
      
      const attachment = data[0];
      
      switch (fieldName) {
        case 'transcription':
          return attachment.transcription_text || null;
        case 'description':
          return attachment.description || null;
        case 'ai_categorization_description':
          return attachment.ai_categorization_description || null;
        default:
          throw new Error(`Unknown media attachment field: ${fieldName}`);
      }
    } catch (error) {
      console.error(`Error in getMediaAttachmentText for ${attachmentId}:`, error);
      throw error;
    }
  }
  
  private async getFolderText(folderId: string, fieldName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('title, description, enhanced_description, ai_matching_description')
        .eq('id', folderId)
        .limit(1);
      
      if (error) {
        console.error(`Error fetching folder ${folderId}:`, error);
        throw new Error(`Failed to fetch folder: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn(`Folder ${folderId} not found`);
        return null;
      }
      
      const folder = data[0];
      
      switch (fieldName) {
        case 'title':
          return folder.title || null;
        case 'description':
          return folder.description || null;
        case 'enhanced_description':
          return folder.enhanced_description || null;
        case 'ai_matching_description':
          return folder.ai_matching_description || null;
        default:
          throw new Error(`Unknown folder field: ${fieldName}`);
      }
    } catch (error) {
      console.error(`Error in getFolderText for ${folderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Store embedding in the appropriate table using pgvector format
   */
  private async storeEmbedding(
    entityType: string, 
    entityId: string, 
    fieldName: string, 
    embedding: number[]
  ): Promise<void> {
    // Map field names to correct embedding column names
    let embeddingColumn: string;
    if (fieldName === 'ai_matching_description') {
      embeddingColumn = 'ai_matching_embedding';
    } else if (fieldName === 'ai_categorization_description') {
      embeddingColumn = 'ai_categorization_embedding';
    } else {
      embeddingColumn = `${fieldName}_embedding`;
    }
    
    const now = new Date().toISOString();
    
    let tableName: string;
    switch (entityType) {
      case 'note':
        tableName = 'notes';
        break;
      case 'media_attachment':
        tableName = 'media_attachments';
        break;
      case 'folder':
        tableName = 'folders';
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    // Format embedding as PostgreSQL vector type
    const embeddingStr = this.formatEmbeddingForDb(embedding);
    
    console.log(`Storing embedding in ${tableName}.${embeddingColumn} for entity ${entityId}`);
    
    // Use raw SQL to insert the vector properly
    const { error } = await supabase.rpc('update_embedding', {
      table_name: tableName,
      entity_id: entityId,
      embedding_column: embeddingColumn,
      embedding_value: embeddingStr,
      updated_at: now
    });
    
    if (error) {
      // Fallback to direct update if the function doesn't exist
      console.log('Custom update function not found, using direct update...');
      
      const { error: directError } = await supabase
        .from(tableName)
        .update({ 
          [embeddingColumn]: embeddingStr,
          last_embedded_at: now
        })
        .eq('id', entityId);
      
      if (directError) {
        console.error(`Failed to store embedding directly:`, directError);
        throw new Error(`Failed to store embedding: ${directError.message}`);
      }
    }
    
    console.log(`Successfully stored embedding for ${entityType} ${entityId}`);
  }
  
  /**
   * Mark a pending embedding as processed
   */
  private async markEmbeddingProcessed(pendingId: string, errorMessage: string | null): Promise<void> {
    const { error } = await supabase
      .from('pending_embeddings')
      .update({
        processed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', pendingId);
    
    if (error) {
      console.error('Failed to mark embedding as processed:', error);
    }
  }
  
  /**
   * Process all pending embeddings (useful for batch processing)
   */
  async processAllPendingEmbeddings(batchSize: number = 10): Promise<void> {
    let processed = 0;
    let hasMore = true;
    
    while (hasMore) {
      const pending = await this.getPendingEmbeddings(batchSize);
      
      if (pending.length === 0) {
        hasMore = false;
        break;
      }
      
      console.log(`Processing batch of ${pending.length} embeddings...`);
      
      // Process embeddings in parallel (but respect rate limits)
      const promises = pending.map(item => this.processPendingEmbedding(item));
      await Promise.allSettled(promises);
      
      processed += pending.length;
      console.log(`Processed ${processed} embeddings...`);
      
      // Small delay to respect rate limits
      if (pending.length === batchSize) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Finished processing ${processed} total embeddings`);
  }
  
  /**
   * Manually embed text and return the result (useful for testing)
   */
  async embedText(text: string): Promise<number[]> {
    const result = await this.generateEmbedding(text);
    return result.embedding;
  }
  
  /**
   * Calculate cosine similarity between two embeddings (for testing/validation)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Test vector similarity using the database
   */
  async testVectorSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    const emb1Str = this.formatEmbeddingForDb(embedding1);
    const emb2Str = this.formatEmbeddingForDb(embedding2);
    
    const { data, error } = await supabase.rpc('vector_similarity', {
      vec1: emb1Str,
      vec2: emb2Str
    });
    
    if (error) {
      // Fallback to client-side calculation
      return this.cosineSimilarity(embedding1, embedding2);
    }
    
    return data;
  }
}

export const embeddingService = new EmbeddingService();
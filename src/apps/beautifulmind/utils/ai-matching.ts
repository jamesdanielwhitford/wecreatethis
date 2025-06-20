// src/apps/beautifulmind/utils/ai-matching.ts

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Folder, Note, MediaAttachment } from '../types/notes.types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AIMatchingResult {
  description: string;
  confidence: number;
  reasoning?: string;
}

class AIMatchingService {
  
  /**
   * Generate AI matching description for a folder
   * This description is optimized for semantic similarity with note content
   */
  async generateFolderMatchingDescription(
    folder: { title: string; description?: string },
    existingFolders: Folder[] = []
  ): Promise<AIMatchingResult> {
    try {
      // Get context of existing folders to maintain consistency
      const folderContext = existingFolders
        .slice(0, 10) // Limit context to avoid token limits
        .map(f => `- "${f.title}": ${f.description || 'No description'}`)
        .join('\n');

      const prompt = `You are creating a description optimized for finding related note content.

EXISTING FOLDERS CONTEXT:
${folderContext || 'No existing folders'}

NEW FOLDER TO ENHANCE:
Title: "${folder.title}"
Description: "${folder.description || 'No description provided'}"

Generate a matching description that:
1. Uses vocabulary that would appear in actual note content about this topic
2. Includes specific terms, tools, concepts, and keywords that notes would contain
3. Maintains consistency with the style of existing folders
4. Focuses on content-level terms rather than abstract categories
5. Includes synonyms and related concepts
6. Keeps it concise but comprehensive (2-4 sentences)

Examples:
- Human: "Research papers about machine learning"
  AI: "neural networks, deep learning, PyTorch, TensorFlow, model training, CNN, RNN, transformer, backpropagation, gradient descent, loss functions, accuracy metrics, hyperparameter tuning, dataset preprocessing"

- Human: "Cooking recipes and meal planning" 
  AI: "ingredients, cooking methods, meal prep, nutrition, kitchen techniques, recipe instructions, food preparation, dietary requirements, cooking time, serving portions"

- Human: "Work meeting notes"
  AI: "team discussions, project updates, action items, deadlines, task assignments, meeting agenda, decisions made, follow-up actions, stakeholder feedback"

Return only the optimized description without explanation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for consistency
      });

      const description = response.choices[0]?.message?.content?.trim() || '';
      
      return {
        description,
        confidence: 0.8, // Could implement confidence scoring based on response
        reasoning: `Generated matching description for folder "${folder.title}"`
      };

    } catch (error) {
      console.error('Error generating folder matching description:', error);
      
      // Fallback to enhanced version of original description
      const fallbackDescription = this.enhanceFolderDescription(folder.title, folder.description);
      
      return {
        description: fallbackDescription,
        confidence: 0.3,
        reasoning: 'Fallback to enhanced description due to AI error'
      };
    }
  }

  /**
   * Generate AI categorization description for a note
   * This description helps the note match with relevant folders
   */
  async generateNoteCategorization(
    note: { title?: string; content: string },
    transcriptions: string[] = [],
    descriptions: string[] = [],
    existingFolders: Folder[] = []
  ): Promise<AIMatchingResult> {
    try {
      // Combine all content sources
      const allContent = [
        note.title || '',
        note.content,
        ...transcriptions,
        ...descriptions
      ].filter(Boolean).join(' ');

      // Get context of existing folders
      const folderContext = existingFolders
        .slice(0, 15)
        .map(f => `- "${f.title}": ${f.ai_matching_description || f.description || 'No description'}`)
        .join('\n');

      const prompt = `You are categorizing note content to match it with relevant organizational folders.

EXISTING FOLDER CATEGORIES:
${folderContext || 'No existing folders'}

NOTE TO CATEGORIZE:
Title: "${note.title || 'Untitled'}"
Content: "${allContent.substring(0, 2000)}${allContent.length > 2000 ? '...' : ''}"

Generate a categorization description that:
1. Describes what this note is about using terms that would match folder descriptions
2. Extracts key concepts, tools, topics, and themes
3. Uses vocabulary consistent with the existing folder categories above
4. Focuses on what makes this note categorizable and findable
5. Includes the main subject matter and any technical terms
6. Keeps it concise but descriptive (1-3 sentences)

Examples:
- Note about "Implemented CNN model": "machine learning implementation, convolutional neural network, computer vision, model training, deep learning project"
- Note about "Team standup meeting": "team coordination, project updates, work planning, task management, team communication"
- Note about "Pasta recipe": "cooking instructions, meal preparation, Italian cuisine, recipe cooking, food preparation"

Return only the categorization description without explanation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      });

      const description = response.choices[0]?.message?.content?.trim() || '';
      
      return {
        description,
        confidence: 0.8,
        reasoning: `Generated categorization for note "${note.title || 'Untitled'}"`
      };

    } catch (error) {
      console.error('Error generating note categorization:', error);
      
      // Fallback to simple extraction
      const fallbackDescription = this.extractKeyTerms(note.content);
      
      return {
        description: fallbackDescription,
        confidence: 0.3,
        reasoning: 'Fallback to keyword extraction due to AI error'
      };
    }
  }

  /**
   * Generate AI categorization for media attachment
   */
  async generateMediaCategorization(
    mediaAttachment: MediaAttachment,
    noteContext?: { title?: string; content: string },
    existingFolders: Folder[] = []
  ): Promise<AIMatchingResult> {
    try {
      const mediaContent = [
        mediaAttachment.transcription_text || '',
        mediaAttachment.description || '',
        mediaAttachment.file_name
      ].filter(Boolean).join(' ');

      const folderContext = existingFolders
        .slice(0, 10)
        .map(f => `- "${f.title}": ${f.ai_matching_description || f.description}`)
        .join('\n');

      const prompt = `You are categorizing media content to match it with relevant folders.

EXISTING FOLDER CATEGORIES:
${folderContext || 'No existing folders'}

MEDIA TO CATEGORIZE:
Type: ${mediaAttachment.media_type}
Filename: ${mediaAttachment.file_name}
${mediaAttachment.transcription_text ? `Transcription: ${mediaAttachment.transcription_text.substring(0, 500)}` : ''}
${mediaAttachment.description ? `Description: ${mediaAttachment.description}` : ''}
${noteContext ? `Note Context: ${noteContext.title} - ${noteContext.content.substring(0, 300)}` : ''}

Generate a categorization description focusing on:
1. The main topics and themes in this media
2. Technical terms, concepts, or subjects discussed
3. Context that would help match it to appropriate folders
4. Media-specific content (what was recorded/photographed/documented)

Return only the categorization description (1-2 sentences).`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });

      const description = response.choices[0]?.message?.content?.trim() || '';
      
      return {
        description,
        confidence: 0.7,
        reasoning: `Generated categorization for ${mediaAttachment.media_type} media`
      };

    } catch (error) {
      console.error('Error generating media categorization:', error);
      
      const fallbackDescription = `${mediaAttachment.media_type} content: ${mediaAttachment.file_name}`;
      
      return {
        description: fallbackDescription,
        confidence: 0.2,
        reasoning: 'Fallback to basic description due to AI error'
      };
    }
  }

  /**
   * Simple fallback for folder enhancement
   */
  private enhanceFolderDescription(title: string, description?: string): string {
    const combined = `${title} ${description || ''}`.toLowerCase();
    
    // Simple keyword expansion based on common terms
    const expansions: Record<string, string> = {
      'machine learning': 'neural networks, AI, deep learning, models, training, algorithms',
      'cooking': 'recipes, ingredients, food, kitchen, meal prep, nutrition',
      'work': 'meetings, projects, tasks, deadlines, team, business',
      'research': 'papers, studies, analysis, data, investigation, findings',
      'travel': 'trips, destinations, planning, itinerary, booking, vacation'
    };

    for (const [key, expansion] of Object.entries(expansions)) {
      if (combined.includes(key)) {
        return `${description || title} ${expansion}`;
      }
    }

    return description || title;
  }

  /**
   * Simple keyword extraction fallback
   */
  private extractKeyTerms(content: string): string {
    // Extract capitalized words, technical terms, and important phrases
    const words = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|[a-zA-Z]{3,}/g) || [];
    const uniqueWords = [...new Set(words)].slice(0, 10);
    return uniqueWords.join(', ');
  }

  /**
   * Get existing folders for context
   */
  async getExistingFolders(): Promise<Folder[]> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, title, description, ai_matching_description')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching existing folders:', error);
      return [];
    }
  }

  /**
   * Queue embedding generation for AI descriptions
   */
  async queueEmbeddingGeneration(
    entityType: 'folder' | 'note' | 'media_attachment',
    entityId: string,
    embeddingType: 'ai_matching' | 'ai_categorization'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_embeddings')
        .upsert({
          entity_type: entityType,
          entity_id: entityId,
          field_name: embeddingType === 'ai_matching' ? 'ai_matching_description' : 'ai_categorization_description',
          embedding_type: embeddingType,
          priority: 2, // High priority for AI descriptions
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error queueing embedding generation:', error);
    }
  }
}

export const aiMatchingService = new AIMatchingService();
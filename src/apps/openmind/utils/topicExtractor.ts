// src/apps/openmind/utils/topicExtractor.ts

import OpenAI from 'openai';
import { TopicExtractionResult } from '../types/openmind.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class TopicExtractor {
  /**
   * Analyzes transcribed text and extracts top-level topics
   */
  async extractTopics(transcribedText: string): Promise<TopicExtractionResult> {
    try {
      const prompt = `You are analyzing a voice journal entry to extract distinct topics and create organized notes.

VOICE JOURNAL ENTRY:
"${transcribedText}"

Your task:
1. Identify the most distinct, top-level topics covered in this entry
2. Use smart topic detection:
   - If the user talks about many different family members, work tasks, and hobbies → topics are "Family", "Work", "Hobbies"
   - If the user only talks about family but mentions John, Jess, and Luke → topics are "John", "Jess", "Luke"
   - If the user talks only about one broad topic, break it into meaningful subtopics
3. For each topic, extract ALL relevant content from the original text (don't summarize, keep the exact words)
4. Create a meaningful title for the original voice note
5. Create titles for each topic note

Return your response in this exact JSON format:
{
  "originalTitle": "A descriptive title for the full voice note",
  "topics": [
    {
      "name": "Topic Name",
      "title": "Title for this topic note",
      "content": "All relevant content from the original text about this topic, keeping the user's exact words and style"
    }
  ]
}

Guidelines:
- Extract 2-5 topics maximum
- Keep the user's original words and speaking style in the content
- Make titles natural and descriptive
- If there's only one topic, still create at least 2 meaningful subtopics
- Focus on what the user would want to find later when searching their journal`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at organizing voice journal entries into structured, searchable notes. You preserve the user\'s voice and extract meaningful topics they can easily find later.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsedResult = JSON.parse(result) as TopicExtractionResult;
        
        // Validate the result structure
        if (!parsedResult.originalTitle || !Array.isArray(parsedResult.topics)) {
          throw new Error('Invalid response structure from OpenAI');
        }

        // Ensure each topic has required fields
        for (const topic of parsedResult.topics) {
          if (!topic.name || !topic.title || !topic.content) {
            throw new Error('Invalid topic structure in OpenAI response');
          }
        }

        return parsedResult;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', result);
        throw new Error('Failed to parse topic extraction response');
      }
    } catch (error) {
      console.error('Error extracting topics:', error);
      
      // Fallback: create a simple topic extraction
      return {
        originalTitle: this.generateFallbackTitle(transcribedText),
        topics: [
          {
            name: 'Journal Entry',
            title: 'Full Entry',
            content: transcribedText
          }
        ]
      };
    }
  }

  /**
   * Generates a simple title from the first few words of the transcription
   */
  private generateFallbackTitle(text: string): string {
    const words = text.trim().split(' ').slice(0, 8);
    let title = words.join(' ');
    
    if (text.split(' ').length > 8) {
      title += '...';
    }
    
    return title || 'Voice Journal Entry';
  }

  /**
   * Creates a title based on the current date and time
   */
  generateTimestampTitle(date: Date = new Date()): string {
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    return `${dayName} ${time} Voice Note`;
  }
}

export const topicExtractor = new TopicExtractor();
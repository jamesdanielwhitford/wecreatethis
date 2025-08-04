import { AIIdentificationResponse } from '../types/bird.types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function identifyBirdFromPhoto(imageBase64: string, location?: string): Promise<AIIdentificationResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your environment variables.'
      };
    }

    const locationContext = location ? ` in ${location}` : '';
    
    const prompt = `You are an expert ornithologist. Analyze this bird photo and provide identification information.

Please respond with a JSON object containing:
- confidence: number between 0-100 (how confident you are in the identification)
- species: the scientific name (genus species)
- commonName: the most common English name
- reasoning: brief explanation of key identifying features you observed
- suggestedSearchTerms: array of 2-3 alternative names/terms to search for this bird

Focus on:
1. Size, shape, and posture
2. Beak shape and size
3. Plumage colors and patterns
4. Habitat context visible in photo
5. Geographic location context${locationContext}

If you cannot confidently identify the bird, set confidence below 50 and provide your best guess with reasoning.

Respond ONLY with valid JSON, no additional text.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: `OpenAI API error: ${response.status} ${response.statusText}${errorData?.error?.message ? ` - ${errorData.error.message}` : ''}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No response from OpenAI API'
      };
    }

    try {
      const result = JSON.parse(content);
      
      // Validate the response structure
      if (typeof result.confidence !== 'number' || 
          typeof result.species !== 'string' || 
          typeof result.reasoning !== 'string' ||
          !Array.isArray(result.suggestedSearchTerms)) {
        throw new Error('Invalid response format from AI');
      }

      return {
        success: true,
        result: {
          confidence: Math.max(0, Math.min(100, result.confidence)),
          species: result.species,
          commonName: result.commonName || result.species,
          reasoning: result.reasoning,
          suggestedSearchTerms: result.suggestedSearchTerms.slice(0, 3) // Limit to 3 terms
        }
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
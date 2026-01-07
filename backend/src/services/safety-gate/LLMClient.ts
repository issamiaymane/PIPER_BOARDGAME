import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface LLMResponse {
  coach_line: string;
  choice_presentation: string;
  detected_signals: string[];
  tone_used: string;
}

export class LLMClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateResponse(
    systemPrompt: string,
    _context: any
  ): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Generate your response following the system prompt instructions. Respond with valid JSON only.'
          }
        ]
      });

      const text = response.choices[0]?.message?.content || '';

      if (!text) {
        throw new Error('LLM returned empty response');
      }

      const parsed = JSON.parse(text);

      // Validate required fields
      if (!parsed.coach_line || !parsed.tone_used) {
        throw new Error('LLM response missing required fields');
      }

      return {
        coach_line: parsed.coach_line || '',
        choice_presentation: parsed.choice_presentation || '',
        detected_signals: parsed.detected_signals || [],
        tone_used: parsed.tone_used || 'calm'
      };

    } catch (error) {
      logger.error('LLMClient error:', error);

      // Return a safe fallback response (simple encouragement)
      return {
        coach_line: "I heard you! Let's try again!",
        choice_presentation: "What would you like to do?",
        detected_signals: [],
        tone_used: 'warm'
      };
    }
  }
}

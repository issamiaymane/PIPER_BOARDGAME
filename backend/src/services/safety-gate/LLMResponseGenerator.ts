import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { LLMGeneration } from '../../types/safety-gate.js';

// Re-export for backward compatibility
export type { LLMGeneration };

export class LLMResponseGenerator {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateResponse(
    systemPrompt: string,
    _context: any
  ): Promise<LLMGeneration> {
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
      if (!parsed.coach_line) {
        throw new Error('LLM response missing required fields');
      }

      return {
        coach_line: parsed.coach_line || '',
        choice_presentation: parsed.choice_presentation || ''
      };

    } catch (error) {
      logger.error('LLMGenerationGenerator error:', error);

      // Return a safe fallback response (simple encouragement)
      return {
        coach_line: "I heard you! Let's try again!",
        choice_presentation: "What would you like to do?"
      };
    }
  }
}

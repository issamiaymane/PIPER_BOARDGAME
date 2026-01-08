/**
 * AdjectiveSimilarityService
 * AI-powered semantic similarity checking for adjective answers
 * Uses GPT-4o-mini to determine if child's answer is semantically equivalent to target
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface SimilarityContext {
  category: string;
  question: string;
}

export class AdjectiveSimilarityService {
  private client: OpenAI;
  private cache: Map<string, boolean> = new Map();
  private timeoutMs: number = 8000;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate cache key from normalized word pair
   */
  private getCacheKey(childWord: string, targetWord: string): string {
    return `${childWord.toLowerCase().trim()}:${targetWord.toLowerCase().trim()}`;
  }

  /**
   * Check if child's response is semantically similar to target answer
   * Returns true if similar (should be marked correct), false otherwise
   */
  async checkSimilarity(
    childResponse: string,
    targetAnswer: string,
    context: SimilarityContext
  ): Promise<boolean> {
    const normalizedChild = childResponse.toLowerCase().trim();
    const normalizedTarget = targetAnswer.toLowerCase().trim();

    // Skip if either is empty
    if (!normalizedChild || !normalizedTarget) {
      return false;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(normalizedChild, normalizedTarget);
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      console.log(`\n[AdjectiveSimilarity] ========================================`);
      console.log(`[AdjectiveSimilarity] CACHE HIT`);
      console.log(`[AdjectiveSimilarity]   Child said: "${normalizedChild}"`);
      console.log(`[AdjectiveSimilarity]   Target: "${normalizedTarget}"`);
      console.log(`[AdjectiveSimilarity]   Result: ${cached ? 'SIMILAR' : 'NOT SIMILAR'}`);
      console.log(`[AdjectiveSimilarity] ========================================\n`);
      return cached;
    }

    // Call OpenAI API with timeout
    console.log(`\n[AdjectiveSimilarity] ========================================`);
    console.log(`[AdjectiveSimilarity] CALLING AI for similarity check`);
    console.log(`[AdjectiveSimilarity]   Child said: "${normalizedChild}"`);
    console.log(`[AdjectiveSimilarity]   Target: "${normalizedTarget}"`);
    console.log(`[AdjectiveSimilarity]   Category: ${context.category}`);

    try {
      const result = await this.callOpenAI(normalizedChild, normalizedTarget, context);

      // Cache the result
      this.cache.set(cacheKey, result);
      console.log(`[AdjectiveSimilarity]   AI Result: ${result ? 'SIMILAR - ACCEPTED!' : 'NOT SIMILAR - REJECTED'}`);
      console.log(`[AdjectiveSimilarity] ========================================\n`);

      return result;
    } catch (error) {
      logger.error('[AdjectiveSimilarity] API error:', error);
      console.log(`[AdjectiveSimilarity]   API ERROR - falling back to false`);
      console.log(`[AdjectiveSimilarity] ========================================\n`);
      return false;
    }
  }

  /**
   * Call OpenAI API to check semantic similarity
   */
  private async callOpenAI(
    childWord: string,
    targetWord: string,
    context: SimilarityContext
  ): Promise<boolean> {
    const prompt = `This is a speech therapy exercise for children learning adjectives.

Expected answer: "${targetWord}"
Child said: "${childWord}"

IMPORTANT: Be LENIENT. Accept any word that describes the SAME QUALITY or DIRECTION.

ACCEPT (respond {"similar": true}):
- Same meaning: cold = freezing = chilly = frosty = icy = frigid
- Same meaning: hot = warm = boiling = burning = scorching
- Same meaning: big = large = huge = giant = enormous = massive
- Same meaning: small = little = tiny = teeny = mini
- Same meaning: fast = quick = speedy = rapid
- Same meaning: slow = sluggish = poky
- Degree variations of same quality (freezing is extreme cold = ACCEPT)
- Child-friendly versions (teeny tiny = small)

REJECT (respond {"similar": false}):
- OPPOSITES: hot vs cold, big vs small, fast vs slow
- DIFFERENT PROPERTIES: big vs hot, fast vs cold
- UNRELATED: big vs apple, cold vs happy

Is "${childWord}" describing the SAME quality as "${targetWord}"?
Respond JSON only: {"similar": true} or {"similar": false}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      console.log(`[AdjectiveSimilarity] Calling OpenAI: "${childWord}" vs "${targetWord}"`);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.log(`[AdjectiveSimilarity] Empty response from API`);
        return false;
      }

      const parsed = JSON.parse(content);
      const isSimilar = parsed.similar === true;

      console.log(`[AdjectiveSimilarity] API result: ${isSimilar} (raw: ${content})`);
      return isSimilar;

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`[AdjectiveSimilarity] API timeout after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Clear the cache (useful for testing or session reset)
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`[AdjectiveSimilarity] Cache cleared`);
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

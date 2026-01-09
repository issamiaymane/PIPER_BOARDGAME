import type { LLMGeneration, LLMValidation } from './types.js';

// Re-export for backward compatibility
export type { LLMValidation };

export class LLMResponseValidator {

  validate(
    response: LLMGeneration,
    constraints: any
  ): LLMValidation {
    const checks = {
      length_appropriate: this.checkLength(response),
      no_forbidden_words: this.checkForbiddenWords(response, constraints),
      choices_included: this.checkChoices(response),
      non_judgmental: this.checkJudgment(response),
      sentences_within_limit: this.checkSentenceCount(response, constraints)
    };

    const allPassed = Object.values(checks).every(v => v === true);

    return {
      valid: allPassed,
      checks,
      reason: allPassed ? null : this.getFailureReason(checks)
    };
  }

  private checkLength(response: LLMGeneration): boolean {
    const words = response.coach_line.split(/\s+/);
    return words.length <= 30; // Reasonable maximum
  }

  private checkForbiddenWords(response: LLMGeneration, constraints: any): boolean {
    const forbiddenWords = constraints.forbidden_words || [];
    const text = response.coach_line.toLowerCase();
    return !forbiddenWords.some((word: string) => text.includes(word.toLowerCase()));
  }

  private checkChoices(response: LLMGeneration): boolean {
    return !!response.choice_presentation && response.choice_presentation.length > 0;
  }

  private checkJudgment(response: LLMGeneration): boolean {
    const judgmentalPatterns = [
      /you\s+(should|must|need\s+to)/i,
      /that'?s\s+(wrong|incorrect|bad)/i,
      /(try\s+harder|focus\s+better)/i,
      /why\s+(did|didn't)\s+you/i
    ];
    return !judgmentalPatterns.some(pattern => pattern.test(response.coach_line));
  }

  private checkSentenceCount(response: LLMGeneration, constraints: any): boolean {
    const sentences = response.coach_line.split(/[.!?]+/).filter(s => s.trim());
    return sentences.length <= constraints.max_sentences;
  }

  private getFailureReason(checks: Record<string, boolean>): string {
    const failed = Object.entries(checks)
      .filter(([_check, passed]) => !passed)
      .map(([check]) => check);
    return `Failed checks: ${failed.join(', ')}`;
  }
}

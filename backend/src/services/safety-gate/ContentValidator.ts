import { SafetyGateLevel, ValidationResult } from './types.js';

export class ContentValidator {

  // ============================================
  // CONTENT VALIDATION
  // ============================================

  validate(content: string, level: SafetyGateLevel): ValidationResult {
    const forbiddenWords = ['wrong', 'incorrect', 'bad', 'no', 'failure'];

    const hasForbidden = forbiddenWords.some(word =>
      content.toLowerCase().includes(word)
    );

    if (hasForbidden) {
      return {
        approved: false,
        reason: 'CONTAINS_JUDGMENTAL_LANGUAGE',
        rejectedWords: forbiddenWords.filter(w =>
          content.toLowerCase().includes(w)
        )
      };
    }

    // Check for pressure/forcing language
    const pressurePatterns = [
      /try\s+harder/i,
      /you\s+must/i,
      /say\s+it\s+again/i
    ];

    const hasPressure = pressurePatterns.some(pattern =>
      pattern.test(content)
    );

    if (hasPressure) {
      return {
        approved: false,
        reason: 'CONTAINS_PRESSURE_LANGUAGE'
      };
    }

    return {
      approved: true,
      reason: 'PASSED_SAFETY_CHECKS'
    };
  }
}

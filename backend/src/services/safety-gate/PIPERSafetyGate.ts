import { ChildState, SafetyGateLevel, InterventionType, ValidationResult } from './types.js';

export class PIPERSafetyGate {

  // ============================================
  // MAIN ASSESSMENT FUNCTION
  // ============================================

  assessSafetyLevel(state: ChildState, signals: string[]): SafetyGateLevel {
    // Check from most severe to least severe
    // If any RED condition is met, return RED immediately
    // Don't check YELLOW if already ORANGE

    if (this.isRedLevel(state, signals)) {
      return SafetyGateLevel.RED;
    }

    if (this.isOrangeLevel(state, signals)) {
      return SafetyGateLevel.ORANGE;
    }

    if (this.isYellowLevel(state, signals)) {
      return SafetyGateLevel.YELLOW;
    }

    return SafetyGateLevel.GREEN;
  }

  // ============================================
  // RED LEVEL CHECK
  // ============================================

  private isRedLevel(state: ChildState, signals: string[]): boolean {
    return (
      signals.includes('TANTRUM') ||
      signals.includes('MELTDOWN') ||
      signals.includes('EXTREME_DISTRESS') ||
      state.dysregulationLevel >= 9
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // ============================================

  private isOrangeLevel(state: ChildState, signals: string[]): boolean {
    return (
      signals.includes('SCREAMING') ||
      signals.includes('REPETITIVE_WRONG_RESPONSE') ||
      signals.includes('LEAVING_ACTIVITY') ||
      state.dysregulationLevel >= 7 ||
      state.consecutiveErrors >= 5 ||
      state.fatigueLevel >= 8
    );
  }

  // ============================================
  // YELLOW LEVEL CHECK
  // ============================================

  private isYellowLevel(state: ChildState, signals: string[]): boolean {
    return (
      signals.includes('I_NEED_BREAK') ||
      signals.includes('IM_DONE') ||
      signals.includes('CONSECUTIVE_ERRORS') ||
      signals.includes('ENGAGEMENT_DROP') ||
      state.engagementLevel <= 3 ||
      state.dysregulationLevel >= 5 ||
      state.consecutiveErrors >= 3 ||
      state.fatigueLevel >= 6
    );
  }

  // ============================================
  // INTERVENTION DETERMINATION
  // ============================================

  determineInterventions(
    level: SafetyGateLevel,
    state: ChildState,
    signals: string[]
  ): InterventionType[] {
    switch (level) {
      case SafetyGateLevel.RED:
        return [InterventionType.CALL_GROWNUP];
        // Only intervention at RED: Get adult help

      case SafetyGateLevel.ORANGE:
        return this.orangeLevelInterventions(state, signals);

      case SafetyGateLevel.YELLOW:
        return this.yellowLevelInterventions(state, signals);

      default:
        return [];
        // GREEN = no interventions needed
    }
  }

  // ============================================
  // ORANGE INTERVENTIONS
  // ============================================

  private orangeLevelInterventions(
    state: ChildState,
    signals: string[]
  ): InterventionType[] {
    const interventions: InterventionType[] = [];

    // ALWAYS at ORANGE
    interventions.push(InterventionType.CALMER_TONE);
    // Why? All ORANGE situations need calming approach

    interventions.push(InterventionType.OFFER_CHOICE);
    // Why? Restore sense of control

    // CONDITIONAL: If dysregulated
    if (state.dysregulationLevel >= 6) {
      interventions.push(InterventionType.BUBBLE_BREATHING);
      // Why? Need active regulation strategy
    }

    // CONDITIONAL: If high error streak
    if (state.consecutiveErrors >= 4) {
      interventions.push(InterventionType.ALLOW_SKIP);
      // Why? Child is stuck, needs escape route
    }

    // CONDITIONAL: If fatigued
    if (state.fatigueLevel >= 7) {
      interventions.push(InterventionType.TRIGGER_BREAK);
      // Why? Child needs rest NOW
    }

    return interventions;
  }

  // ============================================
  // YELLOW INTERVENTIONS
  // ============================================

  private yellowLevelInterventions(
    state: ChildState,
    signals: string[]
  ): InterventionType[] {
    const interventions: InterventionType[] = [];

    interventions.push(InterventionType.SHORTEN_TASK);
    // Why? Reduce demands early, prevent escalation

    interventions.push(InterventionType.OFFER_CHOICE);
    // Why? Give some control

    if (state.consecutiveErrors >= 3) {
      interventions.push(InterventionType.ALLOW_SKIP);
      // Why? Early exit option at 3 errors
    }

    return interventions;
  }

  // ============================================
  // CONTENT VALIDATION
  // ============================================

  validateProposedContent(
    content: string,
    level: SafetyGateLevel
  ): ValidationResult {
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

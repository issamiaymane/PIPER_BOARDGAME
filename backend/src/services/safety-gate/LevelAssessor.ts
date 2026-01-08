import { ChildState, SafetyGateLevel, Signal } from './types.js';

export class LevelAssessor {

  // ============================================
  // MAIN ASSESSMENT FUNCTION
  // ============================================

  assessLevel(state: ChildState, signals: Signal[]): SafetyGateLevel {
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

  private isRedLevel(state: ChildState, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.TANTRUM) ||
      signals.includes(Signal.MELTDOWN) ||
      signals.includes(Signal.EXTREME_DISTRESS) ||
      state.dysregulationLevel >= 9
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // ============================================

  private isOrangeLevel(state: ChildState, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.SCREAMING) ||
      signals.includes(Signal.REPETITIVE_WRONG_RESPONSE) ||
      signals.includes(Signal.LEAVING_ACTIVITY) ||
      state.dysregulationLevel >= 7 ||
      state.consecutiveErrors >= 5 ||
      state.fatigueLevel >= 8
    );
  }

  // ============================================
  // YELLOW LEVEL CHECK
  // ============================================

  private isYellowLevel(state: ChildState, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.I_NEED_BREAK) ||
      signals.includes(Signal.IM_DONE) ||
      signals.includes(Signal.CONSECUTIVE_ERRORS) ||
      signals.includes(Signal.ENGAGEMENT_DROP) ||
      state.engagementLevel <= 3 ||
      state.dysregulationLevel >= 5 ||
      state.consecutiveErrors >= 3 ||
      state.fatigueLevel >= 6
    );
  }
}

import { State, Level, Signal } from './types.js';

export class LevelAssessor {

  // ============================================
  // MAIN ASSESSMENT FUNCTION
  // ============================================

  assessLevel(state: State, signals: Signal[]): Level {
    // Check from most severe to least severe
    if (this.isRedLevel(state, signals)) {
      return Level.RED;
    }

    if (this.isOrangeLevel(state, signals)) {
      return Level.ORANGE;
    }

    if (this.isYellowLevel(state, signals)) {
      return Level.YELLOW;
    }

    return Level.GREEN;
  }

  // ============================================
  // RED LEVEL CHECK
  // Severe crisis - immediate adult intervention needed
  // ============================================

  private isRedLevel(state: State, signals: Signal[]): boolean {
    return (
      state.dysregulationLevel >= 9 ||
      // Multiple high-intensity signals together
      (signals.includes(Signal.AUDIO_SCREAMING) && signals.includes(Signal.NO_NO_NO))
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // Significant distress - needs active regulation support
  // ============================================

  private isOrangeLevel(state: State, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.TEXT_SCREAMING) ||
      signals.includes(Signal.AUDIO_SCREAMING) ||
      signals.includes(Signal.NO_NO_NO) ||
      signals.includes(Signal.REPETITIVE_WRONG_RESPONSE) ||
      state.dysregulationLevel >= 7 ||
      state.consecutiveErrors >= 5 ||
      state.fatigueLevel >= 8
    );
  }

  // ============================================
  // YELLOW LEVEL CHECK
  // Minor distress - needs adapted support
  // ============================================

  private isYellowLevel(state: State, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.BREAK_REQUEST) ||
      signals.includes(Signal.QUIT_REQUEST) ||
      signals.includes(Signal.FRUSTRATION) ||
      signals.includes(Signal.CONSECUTIVE_ERRORS) ||
      signals.includes(Signal.ENGAGEMENT_DROP) ||
      state.engagementLevel <= 3 ||
      state.dysregulationLevel >= 5 ||
      state.consecutiveErrors >= 3 ||
      state.fatigueLevel >= 6
    );
  }
}

import { Level, Signal } from './types.js';
import type { State } from './types.js';

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
      // Distress combined with elevated dysregulation = crisis
      (signals.includes(Signal.DISTRESS) && state.dysregulationLevel >= 7)
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // Significant distress - needs active regulation support
  // ============================================

  private isOrangeLevel(state: State, signals: Signal[]): boolean {
    return (
      signals.includes(Signal.DISTRESS) ||
      signals.includes(Signal.REPETITIVE_RESPONSE) ||
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
      signals.includes(Signal.WANTS_BREAK) ||
      signals.includes(Signal.WANTS_QUIT) ||
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

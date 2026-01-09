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
    // State thresholds
    const highDysregulation = state.dysregulationLevel >= 9;

    // Signal checks
    const hasDistressSignals =
      signals.includes(Signal.DISTRESS) ||
      signals.includes(Signal.SCREAMING) ||
      signals.includes(Signal.CRYING);

    return (
      highDysregulation ||
      // Distress combined with elevated dysregulation = crisis
      (hasDistressSignals && state.dysregulationLevel >= 7)
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // Significant distress - needs active regulation support
  // ============================================

  private isOrangeLevel(state: State, signals: Signal[]): boolean {
    // State thresholds (read directly, not via signals)
    const highDysregulation = state.dysregulationLevel >= 7;
    const manyErrors = state.consecutiveErrors >= 5;
    const highFatigue = state.fatigueLevel >= 8;

    // Signal checks
    const hasDistressSignals =
      signals.includes(Signal.DISTRESS) ||
      signals.includes(Signal.SCREAMING) ||
      signals.includes(Signal.CRYING);

    return (
      hasDistressSignals ||
      signals.includes(Signal.REPETITIVE_RESPONSE) ||
      highDysregulation ||
      manyErrors ||
      highFatigue
    );
  }

  // ============================================
  // YELLOW LEVEL CHECK
  // Minor distress - needs adapted support
  // ============================================

  private isYellowLevel(state: State, signals: Signal[]): boolean {
    // State thresholds (read directly, not via signals)
    const lowEngagement = state.engagementLevel <= 3;
    const moderateDysregulation = state.dysregulationLevel >= 5;
    const someErrors = state.consecutiveErrors >= 3;
    const moderateFatigue = state.fatigueLevel >= 6;

    // Signal checks
    const hasMildDistress =
      signals.includes(Signal.WANTS_BREAK) ||
      signals.includes(Signal.WANTS_QUIT) ||
      signals.includes(Signal.FRUSTRATION) ||
      signals.includes(Signal.PROLONGED_SILENCE);

    return (
      hasMildDistress ||
      lowEngagement ||
      moderateDysregulation ||
      someErrors ||
      moderateFatigue
    );
  }
}

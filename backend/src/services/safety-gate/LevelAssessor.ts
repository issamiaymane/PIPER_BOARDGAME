import { Level, Signal } from '../../types/safety-gate.js';
import type { State } from '../../types/safety-gate.js';
import { config } from '../../config/index.js';

// Extract threshold config for readability
const { levels } = config.safetyGate;

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
    // State thresholds (from config)
    const highDysregulation = state.dysregulationLevel >= levels.red.dysregulation;

    // Signal checks
    const hasDistressSignals =
      signals.includes(Signal.DISTRESS) ||
      signals.includes(Signal.SCREAMING) ||
      signals.includes(Signal.CRYING);

    return (
      highDysregulation ||
      // Distress combined with elevated dysregulation = crisis
      (hasDistressSignals && state.dysregulationLevel >= levels.red.dysregulationWithDistress)
    );
  }

  // ============================================
  // ORANGE LEVEL CHECK
  // Significant distress - needs active regulation support
  // ============================================

  private isOrangeLevel(state: State, signals: Signal[]): boolean {
    // State thresholds (from config)
    const highDysregulation = state.dysregulationLevel >= levels.orange.dysregulation;
    const manyErrors = state.consecutiveErrors >= levels.orange.consecutiveErrors;
    const highFatigue = state.fatigueLevel >= levels.orange.fatigue;

    // Signal checks
    const hasDistressSignals =
      signals.includes(Signal.DISTRESS) ||
      signals.includes(Signal.SCREAMING) ||
      signals.includes(Signal.CRYING);

    return (
      hasDistressSignals ||
      signals.includes(Signal.REPETITIVE_RESPONSE) ||
      signals.includes(Signal.REPETITIVE_WORDS) ||  // "dog dog dog" - treat like consecutive error
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
    // State thresholds (from config)
    const lowEngagement = state.engagementLevel <= levels.yellow.engagement;
    const moderateDysregulation = state.dysregulationLevel >= levels.yellow.dysregulation;
    const someErrors = state.consecutiveErrors >= levels.yellow.consecutiveErrors;
    const moderateFatigue = state.fatigueLevel >= levels.yellow.fatigue;

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

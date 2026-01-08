import { State, Level, Intervention, Signal } from './types.js';

export class InterventionSelector {

  // ============================================
  // MAIN SELECTION FUNCTION
  // ============================================

  selectInterventions(
    level: Level,
    state: State,
    signals: Signal[]
  ): Intervention[] {
    switch (level) {
      case Level.RED:
        return this.redLevelInterventions(state, signals);

      case Level.ORANGE:
        return this.orangeLevelInterventions(state, signals);

      case Level.YELLOW:
        return this.yellowLevelInterventions(state, signals);

      default:
        // GREEN = only retry available
        return [Intervention.RETRY_CARD];
    }
  }

  // ============================================
  // RED INTERVENTIONS
  // ============================================

  private redLevelInterventions(
    _state: State,
    _signals: Signal[]
  ): Intervention[] {
    return [
      Intervention.BUBBLE_BREATHING,  // Calming first
      Intervention.SKIP_CARD,         // Escape option
      Intervention.RETRY_CARD,        // Always available
      Intervention.START_BREAK,       // Rest option
      Intervention.CALL_GROWNUP       // Adult help
    ];
  }

  // ============================================
  // ORANGE INTERVENTIONS
  // ============================================

  private orangeLevelInterventions(
    state: State,
    _signals: Signal[]
  ): Intervention[] {
    const interventions: Intervention[] = [];

    // CONDITIONAL: If dysregulated (threshold 4 for earlier intervention)
    if (state.dysregulationLevel >= 4) {
      interventions.push(Intervention.BUBBLE_BREATHING);
    }

    // CONDITIONAL: If error streak
    if (state.consecutiveErrors >= 3) {
      interventions.push(Intervention.SKIP_CARD);
    }

    // ALWAYS at ORANGE+
    interventions.push(Intervention.RETRY_CARD);
    interventions.push(Intervention.START_BREAK);

    return interventions;
  }

  // ============================================
  // YELLOW INTERVENTIONS
  // ============================================

  private yellowLevelInterventions(
    _state: State,
    _signals: Signal[]
  ): Intervention[] {
    return [
      Intervention.SKIP_CARD,   // Escape option
      Intervention.RETRY_CARD   // Always available
    ];
  }
}

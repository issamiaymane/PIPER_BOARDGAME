import { ChildState, SafetyGateLevel, InterventionType, Signal } from './types.js';

export class InterventionSelector {

  // ============================================
  // MAIN SELECTION FUNCTION
  // ============================================

  selectInterventions(
    level: SafetyGateLevel,
    state: ChildState,
    signals: Signal[]
  ): InterventionType[] {
    switch (level) {
      case SafetyGateLevel.RED:
        return this.redLevelInterventions(state, signals);

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
  // RED INTERVENTIONS
  // ============================================

  private redLevelInterventions(
    _state: ChildState,
    _signals: Signal[]
  ): InterventionType[] {
    const interventions: InterventionType[] = [];

    // ALWAYS at RED: Adult help needed
    interventions.push(InterventionType.CALL_GROWNUP);

    // ALWAYS at RED: Calming options still available
    interventions.push(InterventionType.CALMER_TONE);
    interventions.push(InterventionType.BUBBLE_BREATHING);
    // Why? Child needs calming options while waiting for adult

    // ALWAYS at RED: Allow escape
    interventions.push(InterventionType.ALLOW_SKIP);
    // Why? Don't force child to continue current task

    return interventions;
  }

  // ============================================
  // ORANGE INTERVENTIONS
  // ============================================

  private orangeLevelInterventions(
    state: ChildState,
    signals: Signal[]
  ): InterventionType[] {
    const interventions: InterventionType[] = [];

    // ALWAYS at ORANGE
    interventions.push(InterventionType.CALMER_TONE);
    // Why? All ORANGE situations need calming approach

    interventions.push(InterventionType.OFFER_CHOICE);
    // Why? Restore sense of control

    // CONDITIONAL: If dysregulated (lowered threshold from 6 to 4 for earlier intervention)
    if (state.dysregulationLevel >= 4) {
      interventions.push(InterventionType.BUBBLE_BREATHING);
      // Why? Need active regulation strategy - catch it early
    }

    // CONDITIONAL: If error streak (lowered from 4 to 3 to match YELLOW)
    if (state.consecutiveErrors >= 3) {
      interventions.push(InterventionType.ALLOW_SKIP);
      // Why? Child is stuck, needs escape route earlier
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
    signals: Signal[]
  ): InterventionType[] {
    const interventions: InterventionType[] = [];

    interventions.push(InterventionType.SHORTEN_TASK);
    // Why? Reduce demands early, prevent escalation

    interventions.push(InterventionType.OFFER_CHOICE);
    // Why? Give some control

    interventions.push(InterventionType.ALLOW_SKIP);
    // Why? Always give escape option at YELLOW
    // Child has shown signs of struggle - let them move on

    return interventions;
  }
}

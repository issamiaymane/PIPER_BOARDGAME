import type { State, Event, Signal } from '../../types/safety-gate.js';
import { Signal as SignalEnum } from '../../types/safety-gate.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Extract config for readability
const { stateModifiers } = config.safetyGate;
const { bounds } = stateModifiers;

export class StateEngine {
  private state: State;
  private errorHistory: { timestamp: number }[] = [];

  constructor() {
    this.state = this.initializeState();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeState(): State {
    return {
      engagementLevel: 8, // Start optimistic
      dysregulationLevel: 1, // Start calm
      fatigueLevel: 1, // Start fresh
      errorFrequency: 0, // No errors yet
      consecutiveErrors: 0, // No streak
      timeInSession: 0, // Just started
      timeSinceBreak: 0, // Just started
      lastActivityTimestamp: new Date()
    };
  }

  // ============================================
  // MAIN PROCESS FUNCTION
  // Updates state from event AND detected signals
  // ============================================

  processEvent(event: Event, signals: Signal[]): State {
    // 1. Update state from event (correct/incorrect, time, etc.)
    this.updateStateFromEvent(event);

    // 2. Apply signal effects to state
    this.applySignalEffects(signals);

    // 3. Apply baseline decay when child is calm and engaging
    // This ensures dysregulation recovers when child responds without distress
    if (event.type === 'CHILD_RESPONSE') {
      this.applyBaselineDecay(signals);
    }

    return { ...this.state };
  }

  // ============================================
  // APPLY SIGNAL EFFECTS TO STATE
  // ============================================

  private applySignalEffects(signals: Signal[]): void {
    const { signals: signalMods } = stateModifiers;

    for (const signal of signals) {
      switch (signal) {
        case SignalEnum.SCREAMING:
          this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + signalMods.screaming.dysregulation);
          logger.debug(`StateEngine: SCREAMING → dysregulation +${signalMods.screaming.dysregulation} (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.CRYING:
          this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + signalMods.crying.dysregulation);
          logger.debug(`StateEngine: CRYING → dysregulation +${signalMods.crying.dysregulation} (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.DISTRESS:
          this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + signalMods.distress.dysregulation);
          logger.debug(`StateEngine: DISTRESS → dysregulation +${signalMods.distress.dysregulation} (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.FRUSTRATION:
          this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + signalMods.frustration.dysregulation);
          logger.debug(`StateEngine: FRUSTRATION → dysregulation +${signalMods.frustration.dysregulation} (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.WANTS_QUIT:
          this.state.engagementLevel = Math.max(bounds.min, this.state.engagementLevel + signalMods.wantsQuit.engagement);
          logger.debug(`StateEngine: WANTS_QUIT → engagement ${signalMods.wantsQuit.engagement} (now: ${this.state.engagementLevel.toFixed(1)})`);
          break;
        case SignalEnum.WANTS_BREAK:
          this.state.fatigueLevel = Math.min(bounds.max, this.state.fatigueLevel + signalMods.wantsBreak.fatigue);
          logger.debug(`StateEngine: WANTS_BREAK → fatigue +${signalMods.wantsBreak.fatigue} (now: ${this.state.fatigueLevel.toFixed(1)})`);
          break;
        case SignalEnum.REPETITIVE_WORDS:
          // Same word repeated (e.g., "dog dog dog") - indicates disengagement
          this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + signalMods.repetitiveWords.dysregulation);
          this.state.engagementLevel = Math.max(bounds.min, this.state.engagementLevel + signalMods.repetitiveWords.engagement);
          logger.debug(`StateEngine: REPETITIVE_WORDS → dysregulation +${signalMods.repetitiveWords.dysregulation}, engagement ${signalMods.repetitiveWords.engagement} (now: dysreg=${this.state.dysregulationLevel.toFixed(1)}, eng=${this.state.engagementLevel.toFixed(1)})`);
          break;
      }
    }
  }

  // ============================================
  // BASELINE DECAY (when child is calm)
  // ============================================

  private applyBaselineDecay(signals: Signal[]): void {
    // Check if any distress signals are present
    const hasDistressSignals = signals.some(s =>
      s === SignalEnum.SCREAMING ||
      s === SignalEnum.CRYING ||
      s === SignalEnum.DISTRESS ||
      s === SignalEnum.FRUSTRATION
    );

    // If child is engaging (responding) without distress, they're regulating
    // Apply natural decay to dysregulation
    if (!hasDistressSignals && this.state.dysregulationLevel > 1) {
      const decayRate = 0.5; // Moderate cooldown per calm response
      const oldLevel = this.state.dysregulationLevel;
      this.state.dysregulationLevel = Math.max(1, this.state.dysregulationLevel - decayRate);
      logger.debug(`StateEngine: Baseline decay -${decayRate} (${oldLevel.toFixed(1)} → ${this.state.dysregulationLevel.toFixed(1)})`);
    }
  }

  // ============================================
  // UPDATE STATE FROM EVENT
  // ============================================

  private updateStateFromEvent(event: Event): void {
    const now = new Date();
    const timeDelta = (now.getTime() - this.state.lastActivityTimestamp.getTime()) / 1000;

    // Update time trackers
    this.state.timeInSession += timeDelta;
    this.state.timeSinceBreak += timeDelta;
    this.state.lastActivityTimestamp = now;

    // Update based on event type
    switch (event.type) {
      case 'CHILD_RESPONSE':
        this.handleResponse(event);
        break;
      case 'CHILD_INACTIVE':
        this.handleInactivity();
        break;
    }

    // Update fatigue based on time
    this.updateFatigue();
  }

  // ============================================
  // RESPONSE HANDLER
  // ============================================

  private handleResponse(event: Event): void {
    const { responses } = stateModifiers;

    if (event.correct) {
      this.state.consecutiveErrors = 0;
      this.state.engagementLevel = Math.min(bounds.max, this.state.engagementLevel + responses.correct.engagement);
      this.state.dysregulationLevel = Math.max(bounds.min, this.state.dysregulationLevel + responses.correct.dysregulation);
    } else {
      this.state.consecutiveErrors++;
      this.errorHistory.push({ timestamp: Date.now() });
      this.state.engagementLevel = Math.max(bounds.min, this.state.engagementLevel + responses.incorrect.engagement);

      // CHECK FOR REPETITIVE WRONG RESPONSE
      if (event.response === event.previousResponse &&
          event.previousResponse === event.previousPreviousResponse) {
        this.state.dysregulationLevel = Math.min(bounds.max, this.state.dysregulationLevel + responses.tripleRepetition.dysregulation);
      }
    }

    // NOTE: Signal effects (SCREAMING, CRYING, etc.) are applied separately
    // via applySignalEffects() after signals are detected

    this.updateErrorFrequency();
  }

  // ============================================
  // INACTIVITY HANDLER
  // ============================================

  private handleInactivity(): void {
    const { responses } = stateModifiers;
    this.state.engagementLevel = Math.max(bounds.min, this.state.engagementLevel + responses.inactive.engagement);
  }

  // ============================================
  // FATIGUE UPDATE
  // ============================================

  private updateFatigue(): void {
    const minutes = this.state.timeInSession / 60;
    const baselineFatigue = Math.min(bounds.max, minutes / 2);
    const dysregulationModifier = this.state.dysregulationLevel * 0.1;
    this.state.fatigueLevel = Math.min(bounds.max, baselineFatigue + dysregulationModifier);
  }

  // ============================================
  // ERROR FREQUENCY UPDATE
  // ============================================

  private updateErrorFrequency(): void {
    const windowMs = stateModifiers.errorFrequencyWindowMs;
    const recentErrors = this.errorHistory.filter(e =>
      e.timestamp > (Date.now() - windowMs)
    );
    this.state.errorFrequency = recentErrors.length;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getState(): State {
    return { ...this.state };
  }

  resetForBreak(): void {
    const { breakTaken } = stateModifiers;
    this.state.timeSinceBreak = 0;
    this.state.dysregulationLevel = Math.max(bounds.min, this.state.dysregulationLevel + breakTaken.dysregulation);
    this.state.fatigueLevel = Math.max(bounds.min, this.state.fatigueLevel + breakTaken.fatigue);
  }
}

import type { State, Event, Signal } from '../../types/safety-gate.js';
import { Signal as SignalEnum } from '../../types/safety-gate.js';
import { logger } from '../../utils/logger.js';

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

    return { ...this.state };
  }

  // ============================================
  // APPLY SIGNAL EFFECTS TO STATE
  // ============================================

  private applySignalEffects(signals: Signal[]): void {
    for (const signal of signals) {
      switch (signal) {
        case SignalEnum.SCREAMING:
          this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 4);
          logger.debug(`StateEngine: SCREAMING → dysregulation +4 (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.CRYING:
          this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 3);
          logger.debug(`StateEngine: CRYING → dysregulation +3 (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.DISTRESS:
          this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 2);
          logger.debug(`StateEngine: DISTRESS → dysregulation +2 (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.FRUSTRATION:
          this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 1);
          logger.debug(`StateEngine: FRUSTRATION → dysregulation +1 (now: ${this.state.dysregulationLevel.toFixed(1)})`);
          break;
        case SignalEnum.WANTS_QUIT:
          this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 2);
          logger.debug(`StateEngine: WANTS_QUIT → engagement -2 (now: ${this.state.engagementLevel.toFixed(1)})`);
          break;
        case SignalEnum.WANTS_BREAK:
          this.state.fatigueLevel = Math.min(10, this.state.fatigueLevel + 1);
          logger.debug(`StateEngine: WANTS_BREAK → fatigue +1 (now: ${this.state.fatigueLevel.toFixed(1)})`);
          break;
        case SignalEnum.REPETITIVE_WORDS:
          // Same word repeated (e.g., "dog dog dog") - indicates disengagement
          this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 1.5);
          this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 1);
          logger.debug(`StateEngine: REPETITIVE_WORDS → dysregulation +1.5, engagement -1 (now: dysreg=${this.state.dysregulationLevel.toFixed(1)}, eng=${this.state.engagementLevel.toFixed(1)})`);
          break;
      }
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
    if (event.correct) {
      this.state.consecutiveErrors = 0;
      this.state.engagementLevel = Math.min(10, this.state.engagementLevel + 1);
      this.state.dysregulationLevel = Math.max(0, this.state.dysregulationLevel - 0.5);
    } else {
      this.state.consecutiveErrors++;
      this.errorHistory.push({ timestamp: Date.now() });
      this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 0.5);

      // CHECK FOR REPETITIVE WRONG RESPONSE
      if (event.response === event.previousResponse &&
          event.previousResponse === event.previousPreviousResponse) {
        this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 2);
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
    this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 2);
  }

  // ============================================
  // FATIGUE UPDATE
  // ============================================

  private updateFatigue(): void {
    const minutes = this.state.timeInSession / 60;
    const baselineFatigue = Math.min(10, minutes / 2);
    const dysregulationModifier = this.state.dysregulationLevel * 0.1;
    this.state.fatigueLevel = Math.min(10, baselineFatigue + dysregulationModifier);
  }

  // ============================================
  // ERROR FREQUENCY UPDATE
  // ============================================

  private updateErrorFrequency(): void {
    const recentErrors = this.errorHistory.filter(e =>
      e.timestamp > (Date.now() - 60000)
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
    this.state.timeSinceBreak = 0;
    this.state.dysregulationLevel = Math.max(0, this.state.dysregulationLevel - 2);
    this.state.fatigueLevel = Math.max(0, this.state.fatigueLevel - 2);
  }
}

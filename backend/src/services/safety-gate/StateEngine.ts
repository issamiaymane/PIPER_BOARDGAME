import { State, Event } from './types.js';

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
  // Updates state from event and returns updated state
  // ============================================

  processEvent(event: Event): State {
    this.updateStateFromEvent(event);
    return { ...this.state };
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

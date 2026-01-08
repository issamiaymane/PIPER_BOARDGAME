import { ChildState, ChildEvent } from './types.js';

export class StateEngine {
  private state: ChildState;
  private errorHistory: { timestamp: number }[] = [];

  constructor() {
    this.state = this.initializeState();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeState(): ChildState {
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
  // MAIN UPDATE FUNCTION
  // ============================================

  updateFromEvent(event: ChildEvent): ChildState {
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
        this.handleInactivity(event);
        break;
      case 'VERBAL_SIGNAL':
        this.handleVerbalSignal(event);
        break;
    }

    // Update fatigue based on time
    this.updateFatigue();

    return { ...this.state };
  }

  // ============================================
  // RESPONSE HANDLER
  // ============================================

  private handleResponse(event: ChildEvent): void {
    if (event.correct) {
      // CORRECT RESPONSE - Positive indicators

      this.state.consecutiveErrors = 0;
      // Why? Streak is broken

      this.state.engagementLevel = Math.min(10, this.state.engagementLevel + 1);
      // Why? Success suggests they're paying attention
      // Math.min ensures we don't go above 10

      this.state.dysregulationLevel = Math.max(0, this.state.dysregulationLevel - 0.5);
      // Why? Success reduces stress
      // Math.max ensures we don't go below 0

    } else {
      // INCORRECT RESPONSE - Negative indicators

      this.state.consecutiveErrors++;
      // Why? Error streak continues

      this.errorHistory.push({ timestamp: Date.now() });
      // Track error for frequency calculation

      this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 0.5);
      // Why? Errors suggest less focus

      // CHECK FOR REPETITIVE WRONG RESPONSE
      if (event.response === event.previousResponse &&
          event.previousResponse === event.previousPreviousResponse) {

        // Child said same wrong answer 3 times

        this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 2);
        // Why? Repetitive wrong answer is a RED FLAG
        // Suggests: not processing feedback, stuck in pattern, dysregulated
        // +2 is a big jump because this is serious
      }

      // CHECK FOR VERBAL DISTRESS SIGNALS IN RESPONSE
      // This catches "I'm done", "no no no", "I can't", etc.
      // Pass audio screaming flag so it can stack with other signals
      const hasAudioScreaming = event.signal?.includes('screaming_detected_audio') || false;
      this.checkVerbalDistressInResponse(event.response || '', hasAudioScreaming);
    }

    // Update error frequency (rolling average)
    this.updateErrorFrequency();
  }

  // ============================================
  // VERBAL DISTRESS IN RESPONSE CHECK
  // ============================================

  private checkVerbalDistressInResponse(response: string, hasAudioScreaming: boolean = false): void {
    const text = response.toLowerCase();
    const normalizedText = text.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    // Track individual distress signals for stacking
    let distressSignals: string[] = [];

    // Check for "no no no" pattern
    const hasNoNoNo = normalizedText.includes('no no no');
    if (hasNoNoNo) distressSignals.push('NO_NO_NO');

    // Check for screaming/yelling text patterns
    const hasTextScreaming =
      text.includes('scream') ||
      text.includes('yell') ||
      text.includes('shout') ||
      /a{2,}h{1,}/i.test(text) ||  // "aah", "aaah", "aahh", "aahhh" etc.
      /ah{2,}/i.test(text) ||       // "ahh", "ahhh", "ahhhh" etc.
      text.includes('argh') ||
      text.includes('[screaming]') ||
      text.includes('[yelling]') ||
      text.includes('[shouting]') ||
      text.includes('[crying]');
    if (hasTextScreaming) distressSignals.push('TEXT_SCREAMING');

    // Check for frustration words
    const hasFrustration = text.includes('ugh') || text.includes('argh');
    if (hasFrustration && !hasTextScreaming) distressSignals.push('FRUSTRATION');

    // Include audio screaming in the count
    if (hasAudioScreaming) distressSignals.push('AUDIO_SCREAMING');

    // Check for "I'm done" / quit signals
    const hasQuitSignal = text.includes('done') || text.includes('quit') || text.includes('no more');
    if (hasQuitSignal) distressSignals.push('QUIT_SIGNAL');

    // Calculate dysregulation based on number of signals (stacking)
    const signalCount = distressSignals.length;

    if (signalCount > 0) {
      // Base points per signal type
      let dysregulationIncrease = 0;
      let fatigueIncrease = 0;

      // Individual signal effects
      if (distressSignals.includes('NO_NO_NO')) dysregulationIncrease += 3;
      if (distressSignals.includes('TEXT_SCREAMING')) dysregulationIncrease += 3;
      if (distressSignals.includes('AUDIO_SCREAMING')) dysregulationIncrease += 4; // Strong indicator from audio amplitude
      if (distressSignals.includes('FRUSTRATION')) dysregulationIncrease += 1;
      if (distressSignals.includes('QUIT_SIGNAL')) {
        dysregulationIncrease += 2;
        fatigueIncrease += 2;
      }

      // STACKING BONUS: Multiple signals = child is really struggling
      if (signalCount >= 2) {
        dysregulationIncrease += 2; // Bonus for 2+ signals
        fatigueIncrease += 1;       // Also increases fatigue
        console.log(`[StateEngine] 🔥 STACKING: ${signalCount} distress signals detected: [${distressSignals.join(', ')}]`);
      }
      if (signalCount >= 3) {
        dysregulationIncrease += 2; // Extra bonus for 3+ signals
        fatigueIncrease += 1;
        console.log(`[StateEngine] 🔥🔥 SEVERE DISTRESS: ${signalCount} signals!`);
      }

      // Apply increases
      const oldDysreg = this.state.dysregulationLevel;
      const oldFatigue = this.state.fatigueLevel;

      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + dysregulationIncrease);
      this.state.fatigueLevel = Math.min(10, this.state.fatigueLevel + fatigueIncrease);

      console.log(`[StateEngine] Verbal distress: dysregulation ${oldDysreg} → ${this.state.dysregulationLevel} (+${dysregulationIncrease}), fatigue ${oldFatigue} → ${this.state.fatigueLevel} (+${fatigueIncrease})`);
    } else if (hasQuitSignal) {
      // Quit signal alone (shouldn't reach here but just in case)
      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 2);
      this.state.fatigueLevel = Math.min(10, this.state.fatigueLevel + 2);
      // Why? Child wants to stop - moderate distress + fatigue
    }

    // Check for "I can't" / frustration signals
    if (text.includes("can't") || text.includes('cannot') || text.includes("don't know")) {
      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 1);
      // Why? Frustration/helplessness - mild increase
    }

    // Check for break/tired signals
    if (text.includes('break') || text.includes('stop') || text.includes('tired')) {
      this.state.fatigueLevel = Math.min(10, this.state.fatigueLevel + 2);
      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 1);
      // Why? Child is tired - increase fatigue more than dysregulation
    }
  }

  // ============================================
  // INACTIVITY HANDLER
  // ============================================

  private handleInactivity(event: ChildEvent): void {
    this.state.engagementLevel = Math.max(0, this.state.engagementLevel - 2);
    // Why? Not responding = not engaged
    // -2 is bigger drop than wrong answer because
    // wrong answer at least shows they're trying
  }

  // ============================================
  // VERBAL SIGNAL HANDLER
  // ============================================

  private handleVerbalSignal(event: ChildEvent): void {
    const signal = event.signal!.toLowerCase();

    if (signal.includes('break') || signal.includes('done')) {
      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 1);
      // Why? Child asking for break suggests stress

      this.state.fatigueLevel = Math.min(10, this.state.fatigueLevel + 2);
      // Why? Asking to be done suggests tiredness
    }

    if (signal.includes('scream') || signal.includes('crying')) {
      this.state.dysregulationLevel = Math.min(10, this.state.dysregulationLevel + 4);
      // Why? These are STRONG indicators of distress
      // +4 is large because this is serious
    }
  }

  // ============================================
  // FATIGUE UPDATE
  // ============================================

  private updateFatigue(): void {
    // Fatigue increases with time in session
    const minutes = this.state.timeInSession / 60;
    const baselineFatigue = Math.min(10, minutes / 2);
    // After 20 minutes: 20/60 = 0.33 min... / 2 = 0.165... baseline
    // After 10 minutes: 10/60 = 0.166... / 2 = 0.083... baseline
    // This is a SLOW increase

    // Increase fatigue faster if child is dysregulated
    const dysregulationModifier = this.state.dysregulationLevel * 0.1;
    // If dysregulation = 5: 5 * 0.1 = 0.5 extra fatigue
    // If dysregulation = 8: 8 * 0.1 = 0.8 extra fatigue

    this.state.fatigueLevel = Math.min(10, baselineFatigue + dysregulationModifier);
  }

  // ============================================
  // ERROR FREQUENCY UPDATE
  // ============================================

  private updateErrorFrequency(): void {
    // This is a placeholder - actual implementation would
    // maintain a rolling window of errors

    // Pseudocode:
    // 1. Get all errors in last 60 seconds
    // 2. Count them
    // 3. errorFrequency = count / 1.0 (errors per minute)

    // Example implementation:
    const recentErrors = this.errorHistory.filter(e =>
      e.timestamp > (Date.now() - 60000)
    );
    this.state.errorFrequency = recentErrors.length;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getState(): ChildState {
    return { ...this.state };
    // Return copy to prevent external modification
  }

  resetForBreak(): void {
    this.state.timeSinceBreak = 0;
    // Reset break timer

    this.state.dysregulationLevel = Math.max(0, this.state.dysregulationLevel - 2);
    // Break reduces stress

    this.state.fatigueLevel = Math.max(0, this.state.fatigueLevel - 2);
    // Break reduces fatigue
  }
}

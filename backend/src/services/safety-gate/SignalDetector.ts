import { ChildState, ChildEvent, Signal } from './types.js';

export class SignalDetector {

  // ============================================
  // MAIN DETECTION FUNCTION
  // ============================================

  detectSignals(event: ChildEvent, state: ChildState): Signal[] {
    const signals: Signal[] = [];

    // Detect state-based signals
    this.detectStateBasedSignals(state, signals);

    // Detect event-based signals
    this.detectEventBasedSignals(event, state, signals);

    // Detect verbal signals from response text
    const responseText = (event.response || event.signal || '').toLowerCase();
    const hasAudioScreaming = event.signal?.includes('screaming_detected_audio') || false;
    this.detectVerbalSignals(responseText, hasAudioScreaming, signals);

    return signals;
  }

  // ============================================
  // STATE-BASED SIGNALS
  // ============================================

  private detectStateBasedSignals(state: ChildState, signals: Signal[]): void {
    // Check for consecutive errors
    if (state.consecutiveErrors >= 3) {
      signals.push(Signal.CONSECUTIVE_ERRORS);
    }

    // Check for engagement drop
    if (state.engagementLevel <= 3) {
      signals.push(Signal.ENGAGEMENT_DROP);
    }

    // Check fatigue
    if (state.fatigueLevel >= 7) {
      signals.push(Signal.FATIGUE_HIGH);
    }

    // Check dysregulation
    if (state.dysregulationLevel >= 6) {
      signals.push(Signal.DYSREGULATION_DETECTED);
    }
  }

  // ============================================
  // EVENT-BASED SIGNALS
  // ============================================

  private detectEventBasedSignals(event: ChildEvent, state: ChildState, signals: Signal[]): void {
    // Check for repetitive wrong response
    if (event.type === 'CHILD_RESPONSE' && event.response === event.previousResponse) {
      signals.push(Signal.REPETITIVE_WRONG_RESPONSE);
    }
  }

  // ============================================
  // VERBAL SIGNALS (from response text)
  // ============================================

  private detectVerbalSignals(
    responseText: string,
    hasAudioScreaming: boolean,
    signals: Signal[]
  ): void {
    // Normalize text: remove punctuation for pattern matching
    const normalizedText = responseText.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    // Check for break/stop signals
    if (responseText.includes('break') || responseText.includes('stop') || responseText.includes('tired')) {
      signals.push(Signal.I_NEED_BREAK);
    }

    // Check for done/quit signals
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.IM_DONE);
    }

    // Check for "no no no" pattern
    if (normalizedText.includes('no no no')) {
      signals.push(Signal.NO_NO_NO);
    }

    // Check for screaming signals from multiple sources
    const hasTextScreaming =
      responseText.includes('scream') ||
      responseText.includes('yell') ||
      responseText.includes('shout') ||
      /a{2,}h{1,}/i.test(responseText) ||  // "aah", "aaah", "aahh", "aahhh" etc.
      /ah{2,}/i.test(responseText) ||       // "ahh", "ahhh", "ahhhh" etc.
      responseText.includes('argh') ||
      responseText.includes('ugh') ||
      responseText.includes('[screaming]') ||
      responseText.includes('[yelling]') ||
      responseText.includes('[shouting]') ||
      responseText.includes('[crying]');

    if (hasTextScreaming) {
      signals.push(Signal.TEXT_SCREAMING);
    }

    if (hasAudioScreaming) {
      signals.push(Signal.AUDIO_SCREAMING);
    }

    // Add composite SCREAMING signal if either source detected it
    if (hasAudioScreaming || hasTextScreaming || normalizedText.includes('no no no')) {
      signals.push(Signal.SCREAMING);
      console.log(`[SignalDetector] SCREAMING signal - Audio: ${hasAudioScreaming}, Text: ${hasTextScreaming}`);
    }

    // Check for frustration (only if not already screaming)
    const hasFrustration = responseText.includes('ugh') || responseText.includes('argh');
    if (hasFrustration && !hasTextScreaming) {
      signals.push(Signal.FRUSTRATION);
    }

    // Check for quit signal
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.QUIT_SIGNAL);
    }
  }

  // ============================================
  // VERBAL DISTRESS DETECTION (for StateEngine)
  // Returns signals without modifying state
  // ============================================

  detectVerbalDistress(response: string, hasAudioScreaming: boolean = false): Signal[] {
    const signals: Signal[] = [];
    const text = response.toLowerCase();
    const normalizedText = text.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    // Check for "no no no" pattern
    if (normalizedText.includes('no no no')) {
      signals.push(Signal.NO_NO_NO);
    }

    // Check for screaming/yelling text patterns
    const hasTextScreaming =
      text.includes('scream') ||
      text.includes('yell') ||
      text.includes('shout') ||
      /a{2,}h{1,}/i.test(text) ||
      /ah{2,}/i.test(text) ||
      text.includes('argh') ||
      text.includes('[screaming]') ||
      text.includes('[yelling]') ||
      text.includes('[shouting]') ||
      text.includes('[crying]');

    if (hasTextScreaming) {
      signals.push(Signal.TEXT_SCREAMING);
    }

    // Check for frustration words
    const hasFrustration = text.includes('ugh') || text.includes('argh');
    if (hasFrustration && !hasTextScreaming) {
      signals.push(Signal.FRUSTRATION);
    }

    // Include audio screaming
    if (hasAudioScreaming) {
      signals.push(Signal.AUDIO_SCREAMING);
    }

    // Check for quit signals
    if (text.includes('done') || text.includes('quit') || text.includes('no more')) {
      signals.push(Signal.QUIT_SIGNAL);
    }

    return signals;
  }
}

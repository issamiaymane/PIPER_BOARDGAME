import { State, Event, Signal } from './types.js';

export class SignalDetector {

  // ============================================
  // MAIN DETECTION FUNCTION
  // ============================================

  detectSignals(state: State, event: Event): Signal[] {
    const signals: Signal[] = [];

    // 1. State-based signals
    this.detectStateBasedSignals(state, signals);

    // 2. Event-based signals
    this.detectEventBasedSignals(event, signals);

    // 3. Text-based signals
    this.detectTextSignals(event, signals);

    // 4. Audio-based signals
    this.detectAudioSignals(event, signals);

    return signals;
  }

  // ============================================
  // 1. STATE-BASED SIGNALS
  // ============================================

  private detectStateBasedSignals(state: State, signals: Signal[]): void {
    if (state.consecutiveErrors >= 3) {
      signals.push(Signal.CONSECUTIVE_ERRORS);
    }

    if (state.engagementLevel <= 3) {
      signals.push(Signal.ENGAGEMENT_DROP);
    }

    if (state.fatigueLevel >= 7) {
      signals.push(Signal.FATIGUE_HIGH);
    }

    if (state.dysregulationLevel >= 6) {
      signals.push(Signal.DYSREGULATION_DETECTED);
    }
  }

  // ============================================
  // 2. EVENT-BASED SIGNALS
  // ============================================

  private detectEventBasedSignals(event: Event, signals: Signal[]): void {
    // Check for repetitive wrong response
    if (event.type === 'CHILD_RESPONSE' && event.response === event.previousResponse) {
      signals.push(Signal.REPETITIVE_WRONG_RESPONSE);
    }
  }

  // ============================================
  // 3. TEXT-BASED SIGNALS
  // ============================================

  private detectTextSignals(event: Event, signals: Signal[]): void {
    const responseText = (event.response || '').toLowerCase();
    const normalizedText = responseText.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    // BREAK_REQUEST: "break", "stop", "tired"
    if (responseText.includes('break') || responseText.includes('stop') || responseText.includes('tired')) {
      signals.push(Signal.BREAK_REQUEST);
    }

    // QUIT_REQUEST: "done", "quit", "no more"
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.QUIT_REQUEST);
    }

    // NO_NO_NO: "no no no" pattern
    if (normalizedText.includes('no no no')) {
      signals.push(Signal.NO_NO_NO);
    }

    // TEXT_SCREAMING: screaming patterns in text
    const hasTextScreaming =
      responseText.includes('scream') ||
      responseText.includes('yell') ||
      responseText.includes('shout') ||
      /a{2,}h{1,}/i.test(responseText) ||
      /ah{2,}/i.test(responseText) ||
      responseText.includes('[screaming]') ||
      responseText.includes('[yelling]') ||
      responseText.includes('[shouting]') ||
      responseText.includes('[crying]');

    if (hasTextScreaming) {
      signals.push(Signal.TEXT_SCREAMING);
    }

    // FRUSTRATION: "ugh", "argh" (only if not already screaming)
    const hasFrustration = responseText.includes('ugh') || responseText.includes('argh');
    if (hasFrustration && !hasTextScreaming) {
      signals.push(Signal.FRUSTRATION);
    }
  }

  // ============================================
  // 4. AUDIO-BASED SIGNALS
  // ============================================

  private detectAudioSignals(event: Event, signals: Signal[]): void {
    // AUDIO_SCREAMING: from amplitude detection
    const hasAudioScreaming = event.signal?.includes('screaming_detected_audio') || false;
    if (hasAudioScreaming) {
      signals.push(Signal.AUDIO_SCREAMING);
    }
  }
}

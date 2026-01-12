/**
 * Calibration Service (Frontend)
 * Handles the pre-session voice calibration flow
 * Coordinates with backend CalibrationService via WebSocket
 */

import { voiceLogger } from './logger.js';
import type {
  CalibrationPhase,
  CalibrationState,
  CalibrationStatus,
  CalibrationResult,
} from './calibration-types.js';
import { getPhaseConfig, CALIBRATION_PHASES } from './calibration-types.js';

// VAD configuration for early phase completion
const VAD_CONFIG = {
  speechThreshold: 0.05,      // Amplitude above this = speaking
  silenceDuration: 1500,      // ms of silence after speech to complete phase
  minSpeechDuration: 500,     // ms of speech required before silence detection kicks in
};

export class CalibrationService {
  private ws: WebSocket | null = null;
  private state: CalibrationState = 'idle';
  private currentPhase: CalibrationPhase = 'idle';
  private phaseDuration = 0;
  private phasePrompt = '';
  private phaseStartTime = 0;
  private phaseTimerId: ReturnType<typeof setTimeout> | null = null;
  private result: CalibrationResult | null = null;
  private error: string | null = null;

  // VAD tracking for early phase completion
  private isChildTurnActive = false;
  private childHasSpoken = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;

  // Callbacks
  onStateChange?: (status: CalibrationStatus) => void;
  onPhaseStart?: (phase: CalibrationPhase, duration: number, prompt: string) => void;
  onPhaseProgress?: (phase: CalibrationPhase, progress: number) => void;
  onComplete?: (result: CalibrationResult) => void;
  onFailed?: (error: string) => void;

  /**
   * Set the WebSocket connection to use
   */
  setWebSocket(ws: WebSocket): void {
    this.ws = ws;
  }

  /**
   * Get current calibration status
   */
  getStatus(): CalibrationStatus {
    return {
      state: this.state,
      currentPhase: this.currentPhase,
      phaseDuration: this.phaseDuration,
      phasePrompt: this.phasePrompt,
      result: this.result || undefined,
      error: this.error || undefined,
    };
  }

  /**
   * Check if calibration is in progress
   */
  isCalibrating(): boolean {
    return this.state === 'calibrating';
  }

  /**
   * Start the calibration process
   */
  start(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      voiceLogger.error('CalibrationService: Cannot start - WebSocket not connected');
      this.error = 'Not connected to server';
      this.onFailed?.('Not connected to server');
      return;
    }

    voiceLogger.info('CalibrationService: Starting calibration');
    this.state = 'calibrating';
    this.currentPhase = 'idle';
    this.result = null;
    this.error = null;

    // Send start message to server
    this.ws.send(JSON.stringify({ type: 'start_calibration' }));

    this.notifyStateChange();
  }

  /**
   * Abort the calibration process
   */
  abort(): void {
    if (this.state !== 'calibrating') return;

    voiceLogger.info('CalibrationService: Aborting calibration');

    // Clear phase timer
    if (this.phaseTimerId) {
      clearTimeout(this.phaseTimerId);
      this.phaseTimerId = null;
    }

    // Send abort message to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'abort_calibration' }));
    }

    this.state = 'failed';
    this.error = 'Calibration aborted';
    this.notifyStateChange();
  }

  /**
   * Handle server message
   */
  handleServerMessage(message: {
    type: string;
    calibrationPhase?: CalibrationPhase;
    phaseDuration?: number;
    text?: string;
    calibrationResult?: CalibrationResult;
    retryReason?: string;
    message?: string;
  }): boolean {
    switch (message.type) {
      case 'calibration_started':
        voiceLogger.info('CalibrationService: Calibration started by server');
        this.state = 'calibrating';
        this.notifyStateChange();
        return true;

      case 'calibration_phase_start':
        this.handlePhaseStart(
          message.calibrationPhase || 'idle',
          message.phaseDuration || 0,
          message.text || ''
        );
        return true;

      case 'calibration_retry':
        voiceLogger.info(`CalibrationService: Retry requested - ${message.retryReason}`);
        // Phase will restart after server speaks retry prompt
        return true;

      case 'calibration_complete':
        this.handleComplete(message.calibrationResult!);
        return true;

      case 'calibration_failed':
        this.handleFailed(message.message || 'Calibration failed');
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle phase start
   */
  private handlePhaseStart(phase: CalibrationPhase, duration: number, prompt: string): void {
    voiceLogger.info(`CalibrationService: Phase ${phase} starting (${duration}ms)`);

    this.currentPhase = phase;
    this.phaseDuration = duration;
    this.phasePrompt = prompt;
    this.phaseStartTime = Date.now();

    // Reset VAD state for new phase
    this.isChildTurnActive = false;
    this.childHasSpoken = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;

    // Clear any existing timer
    if (this.phaseTimerId) {
      clearTimeout(this.phaseTimerId);
    }

    // Notify UI
    this.onPhaseStart?.(phase, duration, prompt);
    this.notifyStateChange();

    // Start progress updates
    this.startProgressUpdates();

    // Set timer to complete phase
    this.phaseTimerId = setTimeout(() => {
      this.completeCurrentPhase();
    }, duration);
  }

  /**
   * Start periodic progress updates for UI
   */
  private startProgressUpdates(): void {
    const updateInterval = 100; // Update every 100ms

    const update = () => {
      if (this.state !== 'calibrating' || this.currentPhase === 'idle') return;

      const elapsed = Date.now() - this.phaseStartTime;
      const progress = Math.min(1, elapsed / this.phaseDuration);

      this.onPhaseProgress?.(this.currentPhase, progress);

      if (progress < 1) {
        setTimeout(update, updateInterval);
      }
    };

    update();
  }

  /**
   * Complete the current phase
   */
  private completeCurrentPhase(): void {
    voiceLogger.info(`CalibrationService: Phase ${this.currentPhase} complete`);

    this.phaseTimerId = null;

    // Send phase complete to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'calibration_phase_complete',
        phase: this.currentPhase
      }));
    }
  }

  /**
   * Handle calibration complete
   */
  private handleComplete(result: CalibrationResult): void {
    voiceLogger.info(`CalibrationService: Complete - amp=${result.amplitudeThreshold.toFixed(3)}, peak=${result.peakThreshold.toFixed(3)}, confidence=${result.confidence}`);

    this.state = 'complete';
    this.currentPhase = 'complete';
    this.result = result;

    this.notifyStateChange();
    this.onComplete?.(result);
  }

  /**
   * Handle calibration failed
   */
  private handleFailed(error: string): void {
    voiceLogger.warn(`CalibrationService: Failed - ${error}`);

    this.state = 'failed';
    this.currentPhase = 'failed';
    this.error = error;

    // Clear phase timer
    if (this.phaseTimerId) {
      clearTimeout(this.phaseTimerId);
      this.phaseTimerId = null;
    }

    this.notifyStateChange();
    this.onFailed?.(error);
  }

  /**
   * Notify state change to listeners
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getStatus());
  }

  /**
   * Called when it's the child's turn to speak
   * Enables VAD detection for early phase completion
   */
  setChildTurnActive(): void {
    this.isChildTurnActive = true;
    this.childHasSpoken = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
    voiceLogger.info('CalibrationService: Child turn active, VAD enabled');
  }

  /**
   * Process audio amplitude for VAD-based early phase completion
   * Called for each audio chunk when it's child's turn
   */
  processAudioAmplitude(amplitude: number): void {
    if (!this.isChildTurnActive || this.state !== 'calibrating') return;

    const now = Date.now();

    if (amplitude > VAD_CONFIG.speechThreshold) {
      // Child is speaking
      if (!this.childHasSpoken) {
        this.childHasSpoken = true;
        this.speechStartTime = now;
        voiceLogger.debug('CalibrationService: Child started speaking');
      }
      this.lastSpeechTime = now;
    } else if (this.childHasSpoken) {
      // Silence detected after speech
      const speechDuration = this.lastSpeechTime - this.speechStartTime;
      const silenceDuration = now - this.lastSpeechTime;

      // Check if child spoke long enough and silence is long enough
      if (speechDuration >= VAD_CONFIG.minSpeechDuration &&
          silenceDuration >= VAD_CONFIG.silenceDuration) {
        voiceLogger.info(`CalibrationService: VAD detected end of speech (spoke ${speechDuration}ms, silent ${silenceDuration}ms)`);
        this.completeCurrentPhaseEarly();
      }
    }
  }

  /**
   * Complete current phase early (VAD detected end of speech)
   */
  private completeCurrentPhaseEarly(): void {
    if (this.phaseTimerId) {
      clearTimeout(this.phaseTimerId);
      this.phaseTimerId = null;
    }
    this.isChildTurnActive = false;
    voiceLogger.info(`CalibrationService: Phase ${this.currentPhase} completed early via VAD`);
    this.completeCurrentPhase();
  }

  /**
   * Get the phase index for progress display
   */
  getPhaseIndex(): number {
    const index = CALIBRATION_PHASES.findIndex(p => p.phase === this.currentPhase);
    return index >= 0 ? index : 0;
  }

  /**
   * Get the total number of phases
   */
  getTotalPhases(): number {
    return CALIBRATION_PHASES.length;
  }

  /**
   * Get current phase config
   */
  getCurrentPhaseConfig() {
    return getPhaseConfig(this.currentPhase);
  }

  /**
   * Reset calibration state
   */
  reset(): void {
    if (this.phaseTimerId) {
      clearTimeout(this.phaseTimerId);
      this.phaseTimerId = null;
    }

    this.state = 'idle';
    this.currentPhase = 'idle';
    this.phaseDuration = 0;
    this.phasePrompt = '';
    this.phaseStartTime = 0;
    this.result = null;
    this.error = null;

    // Reset VAD state
    this.isChildTurnActive = false;
    this.childHasSpoken = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
  }
}

// Singleton instance
export const calibrationService = new CalibrationService();

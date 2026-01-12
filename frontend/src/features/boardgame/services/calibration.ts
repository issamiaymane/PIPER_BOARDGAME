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
  }
}

// Singleton instance
export const calibrationService = new CalibrationService();

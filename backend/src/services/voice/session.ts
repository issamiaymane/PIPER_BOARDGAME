/**
 * Voice Session Manager
 * Manages per-client voice sessions and coordinates between client WebSocket and OpenAI Realtime API
 * Integrates with Session for PIPER safety-gate processing
 */

import WebSocket from 'ws';
import { RealtimeVoiceService } from './realtime.js';
import { Session } from '../safety-gate/Session.js';
import { CalibrationService } from '../calibration/CalibrationService.js';
import { CardContext, SafetyGateResult } from '../../types/safety-gate.js';
import type { CalibrationResult } from '../../types/calibration.js';
import {
  ClientMessageSchema,
  type ClientMessage,
  type ServerMessage,
  type RealtimeServerEvent
} from '../../types/voice.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Re-export types for external use
export type { ClientMessage, ServerMessage };

// ─────────────────────────────────────────────────────────────────────────────
// SCREAMING DETECTION CONFIG (from centralized config)
// ─────────────────────────────────────────────────────────────────────────────

const SCREAMING_AMPLITUDE_THRESHOLD = config.safetyGate.screaming.amplitudeThreshold;
const SCREAMING_PEAK_THRESHOLD = config.safetyGate.screaming.peakThreshold;
const SCREAMING_CONFIRMATION_CHUNKS = config.safetyGate.screaming.confirmationChunks;
const SCREAMING_POST_SPEECH_WAIT_MS = config.safetyGate.screaming.postSpeechWaitMs;
const SCREAMING_RESPONSE_COOLDOWN_MS = config.safetyGate.screaming.responseCooldownMs;

export interface VoiceSession {
  id: string;
  clientWs: WebSocket;
  realtimeService: RealtimeVoiceService;
  isActive: boolean;
  currentCardText?: string;
  createdAt: Date;
  // Safety-gate integration
  safetyGateSession: Session;
  currentCardContext?: CardContext;
  // Audio amplitude tracking for screaming detection
  recentAmplitudes: { amplitude: number; peak: number; timestamp: number }[];
  screamingDetected: boolean;
  // Timer for delayed screaming response (starts AFTER speech stops)
  screamingTimeoutId?: ReturnType<typeof setTimeout>;
  // Track consecutive low-amplitude chunks to detect when screaming stops
  lowAmplitudeCount: number;
  // Track if speech has stopped (to know when to start timeout)
  speechStopped: boolean;
  // Timestamp of last screaming response for cooldown
  lastScreamingResponseTime?: number;
  // Flag to prevent duplicate responses from race conditions
  responseInProgress: boolean;
  // Calibration
  calibrationService: CalibrationService;
  calibrationResult?: CalibrationResult;
  // Dynamic thresholds (use calibrated values if available, fallback to config)
  amplitudeThreshold: number;
  peakThreshold: number;
}



export class VoiceSessionManager {
  private sessions: Map<string, VoiceSession> = new Map();

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new voice session for a client
   */
  async createSession(clientWs: WebSocket): Promise<string | null> {
    const sessionId = this.generateSessionId();
    const realtimeService = new RealtimeVoiceService();

    // Connect to OpenAI Realtime API
    const connected = await realtimeService.connect();
    if (!connected) {
      logger.error(`Failed to create voice session ${sessionId}: could not connect to Realtime API`);
      return null;
    }

    // Set up event handler to forward events to client
    realtimeService.onEvent((event) => {
      this.handleRealtimeEvent(sessionId, event);
    });

    const session: VoiceSession = {
      id: sessionId,
      clientWs,
      realtimeService,
      isActive: true,
      createdAt: new Date(),
      safetyGateSession: new Session(),
      recentAmplitudes: [],
      screamingDetected: false,
      lowAmplitudeCount: 0,
      speechStopped: false,
      lastScreamingResponseTime: undefined,
      responseInProgress: false,
      // Calibration - start with default thresholds, calibration will update them
      calibrationService: new CalibrationService(),
      amplitudeThreshold: SCREAMING_AMPLITUDE_THRESHOLD,
      peakThreshold: SCREAMING_PEAK_THRESHOLD
    };

    // Set up inactivity callback
    session.safetyGateSession.setInactivityCallback((result) => {
      this.handleInactivityResult(session, result);
    });

    // Set up task timeout callback
    session.safetyGateSession.setTaskTimeoutCallback((result) => {
      this.handleTaskTimeoutResult(session, result);
    });

    this.sessions.set(sessionId, session);
    logger.info(`Voice session created: ${sessionId}`);

    return sessionId;
  }

  /**
   * Handle events from OpenAI Realtime API and forward to client
   */
  private handleRealtimeEvent(sessionId: string, event: RealtimeServerEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    try {
      switch (event.type) {
        case 'response.audio.delta':
          // Stream audio chunk to client
          if (event.delta) {
            this.sendToClient(session, {
              type: 'audio_chunk',
              audio: event.delta as string
            });
          }
          break;

        case 'response.audio_transcript.delta':
          // Stream transcript to client
          if (event.delta) {
            this.sendToClient(session, {
              type: 'transcript',
              text: event.delta as string,
              role: 'assistant'
            });
          }
          break;

        case 'response.audio.done':
          this.sendToClient(session, {
            type: 'speaking_done'
          });
          break;

        case 'response.created':
          this.sendToClient(session, {
            type: 'speaking_started'
          });
          break;

        case 'input_audio_buffer.speech_started':
          logger.debug(`Session ${sessionId}: User started speaking`);
          session.speechStopped = false;
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug(`Session ${sessionId}: User stopped speaking`);
          session.speechStopped = true;
          // If screaming was detected during speech, start timeout for transcription
          if (session.screamingDetected && !session.screamingTimeoutId) {
            logger.debug(`VoiceSession: Speech stopped with screaming - waiting ${SCREAMING_POST_SPEECH_WAIT_MS}ms for transcription`);
            session.screamingTimeoutId = setTimeout(() => {
              // Only trigger if screaming flag is still set (not already processed by transcription)
              if (session.screamingDetected) {
                logger.debug('VoiceSession: Timeout - no transcription, triggering screaming response');
                this.triggerScreamingResponse(session);
              }
            }, SCREAMING_POST_SPEECH_WAIT_MS);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User's speech was transcribed
          if (event.transcript) {
            const transcription = event.transcript as string;

            // Send transcription to client
            this.sendToClient(session, {
              type: 'transcript',
              text: transcription,
              role: 'user'
            });

            // Process through safety-gate if card context is set
            if (session.currentCardContext) {
              this.processWithSafetyGate(session, transcription);
            }
          }
          break;

        case 'error':
          // Ignore benign errors (expected during normal operation)
          const errorCode = (event.error as { code?: string })?.code;
          const benignErrors = [
            'input_audio_buffer_commit_empty',  // Happens when clearing audio buffer
            'response_cancel_not_active'         // Happens when canceling with no active response
          ];
          if (benignErrors.includes(errorCode || '')) {
            // These are expected - just ignore
            break;
          }
          logger.error(`Realtime API error for session ${sessionId}:`, event);
          this.sendToClient(session, {
            type: 'error',
            message: (event.error as { message?: string })?.message || 'Unknown error'
          });
          break;

        default:
          // Log other events for debugging
          logger.debug(`Session ${sessionId} received event: ${event.type}`);
      }
    } catch (err) {
      logger.error(`Error handling Realtime event for session ${sessionId}:`, err);
    }
  }

  /**
   * Send a message to the client
   */
  private sendToClient(session: VoiceSession, message: ServerMessage): void {
    if (session.clientWs.readyState === WebSocket.OPEN) {
      session.clientWs.send(JSON.stringify(message));
    }
  }

  /**
   * Cancel current response, speak feedback, and send result to client
   */
  private async speakAndSendResult(
    session: VoiceSession,
    result: SafetyGateResult,
    options?: { taskTimeExceeded?: boolean }
  ): Promise<void> {
    session.realtimeService.cancelResponse();
    await new Promise(resolve => setTimeout(resolve, 100));

    if (result.shouldSpeak && result.uiPackage.speech.text) {
      session.realtimeService.speakText(result.uiPackage.speech.text);
    }

    this.sendToClient(session, {
      type: 'safety_gate_response',
      uiPackage: result.uiPackage,
      isCorrect: result.isCorrect,
      ...(options?.taskTimeExceeded && { taskTimeExceeded: true })
    });
  }

  /**
   * Handle incoming message from client
   */
  handleClientMessage(sessionId: string, rawMessage: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      logger.warn(`Message received for inactive session: ${sessionId}`);
      return;
    }

    // Validate message structure
    const parseResult = ClientMessageSchema.safeParse(rawMessage);
    if (!parseResult.success) {
      logger.warn(`Invalid message from client: ${parseResult.error.message}`);
      this.sendToClient(session, {
        type: 'error',
        message: 'Invalid message format'
      });
      return;
    }

    const message = parseResult.data;

    switch (message.type) {
      case 'speak_card':
        if (message.text) {
          // Clear any pending audio and conversation from previous card to prevent context mismatch
          session.realtimeService.clearAudio();
          session.realtimeService.cancelResponse();
          session.realtimeService.clearConversation();

          // Reset amplitude tracking for new card
          this.resetAmplitudeTracking(session);

          session.currentCardText = message.text;

          // Set card context for safety-gate if provided
          if (message.cardContext) {
            session.currentCardContext = message.cardContext;
            session.safetyGateSession.setCurrentCard(message.cardContext);
            logger.info(`Card context set for session ${sessionId}: ${message.cardContext.category} - Target: [${message.cardContext.targetAnswers.join(', ')}]`);

            // Start inactivity timer - waiting for child's response
            session.safetyGateSession.startInactivityTimer();
          }

          session.realtimeService.speakText(message.text);
        }
        break;

      case 'set_card_context':
        if (message.cardContext) {
          session.currentCardContext = message.cardContext;
          session.safetyGateSession.setCurrentCard(message.cardContext);
          logger.info(`Card context updated for session ${sessionId}: ${message.cardContext.category}`);
        }
        break;

      case 'audio_chunk':
        if (message.audio) {
          // Track amplitude FIRST before sending to OpenAI
          if (typeof message.amplitude === 'number' && typeof message.peak === 'number') {
            this.trackAmplitude(session, message.amplitude, message.peak);
          }

          // Always send audio to OpenAI - even when screaming, the child may be
          // saying the correct answer loudly. The stacking logic in processWithSafetyGate
          // will combine transcription with screaming signal for proper evaluation.
          session.realtimeService.sendAudio(message.audio);
        }
        break;

      case 'commit_audio':
        session.realtimeService.commitAudio();
        break;

      case 'end_session':
        this.endSession(sessionId);
        break;

      case 'choice_selected':
        if (message.action) {
          // Handle choice selection - manages inactivity timer appropriately
          session.safetyGateSession.handleChoiceSelection(message.action);
          logger.info(`Session ${sessionId}: Choice selected - ${message.action}`);
        }
        break;

      case 'activity_ended':
        // Activity (break, bubble breathing, grownup help) has ended - resume session
        session.safetyGateSession.resumeSession();
        logger.info(`Session ${sessionId}: Activity ended - ${message.activity || 'unknown'}, session resumed`);
        break;

      // ─────────────────────────────────────────────────────────────────────────
      // CALIBRATION MESSAGES
      // ─────────────────────────────────────────────────────────────────────────

      case 'start_calibration':
        this.handleStartCalibration(session);
        break;

      case 'calibration_audio_chunk':
        if (message.audio && typeof message.amplitude === 'number' && typeof message.peak === 'number') {
          this.handleCalibrationAudioChunk(session, message.amplitude, message.peak);
        }
        break;

      case 'calibration_phase_complete':
        this.handleCalibrationPhaseComplete(session);
        break;

      case 'abort_calibration':
        this.handleAbortCalibration(session);
        break;

      default:
        logger.warn(`Unknown message type from client: ${(message as any).type}`);
    }
  }

  /**
   * Process child's transcribed response through the safety-gate pipeline
   */
  private async processWithSafetyGate(
    session: VoiceSession,
    transcription: string
  ): Promise<void> {
    // GUARD: Prevent race condition - only one response at a time
    if (session.responseInProgress) {
      logger.debug(`VoiceSession: BLOCKED - Response already in progress, ignoring transcription "${transcription}"`);
      return;
    }
    session.responseInProgress = true;

    try {
      // Cancel screaming timeout if it's pending - transcription arrived, we can stack!
      if (session.screamingTimeoutId) {
        clearTimeout(session.screamingTimeoutId);
        session.screamingTimeoutId = undefined;
        if (session.screamingDetected) {
          logger.debug(`VoiceSession: Transcription "${transcription}" arrived with screaming - STACKING`);
        }
      }

      // GUARD: Check if a screaming response was recently sent (cooldown)
      // This prevents duplicate responses when transcription arrives AFTER screaming timeout fired
      if (session.lastScreamingResponseTime) {
        const elapsed = Date.now() - session.lastScreamingResponseTime;
        if (elapsed < SCREAMING_RESPONSE_COOLDOWN_MS) {
          logger.debug(`VoiceSession: BLOCKED - Transcription within cooldown (${elapsed}ms)`);
          session.screamingDetected = false;
          session.responseInProgress = false;
          return;
        }
      }

      // Debug: Log screaming detection status when processing
      if (session.screamingDetected) {
        logger.debug(`VoiceSession: Processing transcription WITH SCREAMING flag`);
      }

      // Process through safety-gate session with audio-based screaming detection
      const result: SafetyGateResult = await session.safetyGateSession.processChildResponse(
        transcription,
        { screaming: session.screamingDetected }
      );

      // Reset screaming detection after processing
      session.screamingDetected = false;

      await this.speakAndSendResult(session, result);

    } catch (error) {
      logger.error(`Safety-gate processing error:`, error);

      // Send error to client
      this.sendToClient(session, {
        type: 'error',
        message: 'Safety gate processing failed'
      });
    } finally {
      session.responseInProgress = false;
    }
  }

  /**
   * Handle inactivity detection result from Session
   */
  private async handleInactivityResult(
    session: VoiceSession,
    result: SafetyGateResult
  ): Promise<void> {
    logger.debug(`VoiceSession: Inactivity callback triggered for session ${session.id}`);

    try {
      await this.speakAndSendResult(session, result);
    } catch (error) {
      logger.error(`Inactivity response error:`, error);
    }
  }

  /**
   * Handle task timeout - card should be skipped
   */
  private async handleTaskTimeoutResult(
    session: VoiceSession,
    result: SafetyGateResult
  ): Promise<void> {
    logger.debug(`VoiceSession: Task timeout callback triggered for session ${session.id}`);

    try {
      await this.speakAndSendResult(session, result, { taskTimeExceeded: result.taskTimeExceeded });
    } catch (error) {
      logger.error(`Task timeout response error:`, error);
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * End a voice session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      // Stop inactivity timer
      session.safetyGateSession.stopInactivityTimer();
      session.realtimeService.disconnect();
      this.sessions.delete(sessionId);
      logger.info(`Voice session ended: ${sessionId}`);
    }
  }

  /**
   * End all sessions (for cleanup on server shutdown)
   */
  endAllSessions(): void {
    for (const [sessionId] of this.sessions) {
      this.endSession(sessionId);
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Track audio amplitude and detect screaming
   * Uses session's calibrated thresholds (or defaults if not calibrated)
   */
  private trackAmplitude(session: VoiceSession, amplitude: number, peak: number): void {
    const now = Date.now();

    // Use session's calibrated thresholds
    const ampThreshold = session.amplitudeThreshold;
    const peakThreshold = session.peakThreshold;

    // Debug: Log high amplitude chunks
    if (amplitude > 0.3 || peak > 0.6) {
      logger.debug(`VoiceSession: HIGH AMPLITUDE - RMS: ${amplitude.toFixed(3)}, Peak: ${peak.toFixed(3)} (thresholds: amp=${ampThreshold.toFixed(3)}, peak=${peakThreshold.toFixed(3)})`);
    }

    // Add new amplitude reading
    session.recentAmplitudes.push({ amplitude, peak, timestamp: now });

    // Keep only recent readings (last 2 seconds)
    const cutoff = now - 2000;
    session.recentAmplitudes = session.recentAmplitudes.filter(a => a.timestamp > cutoff);

    // Check for screaming: consecutive high-amplitude chunks using calibrated thresholds
    const recentHighAmplitude = session.recentAmplitudes.filter(
      a => a.amplitude > ampThreshold || a.peak > peakThreshold
    );

    // Debug: Log screaming detection progress
    if (recentHighAmplitude.length > 0) {
      logger.debug(`VoiceSession: High amplitude chunks: ${recentHighAmplitude.length}/${SCREAMING_CONFIRMATION_CHUNKS}`);
    }

    // Check if CURRENT sample is high amplitude (screaming)
    const isCurrentSampleHigh = amplitude > ampThreshold || peak > peakThreshold;

    if (recentHighAmplitude.length >= SCREAMING_CONFIRMATION_CHUNKS) {
      if (!session.screamingDetected) {
        session.screamingDetected = true;
        session.lowAmplitudeCount = 0; // Reset low amplitude counter
        logger.info(`VoiceSession: SCREAMING DETECTED (amplitude: ${amplitude.toFixed(3)}, peak: ${peak.toFixed(3)})`);
        // Don't start timeout yet - wait for child to stop screaming first
        // This allows us to capture the full audio and get proper transcription
      }
    }

    // Track consecutive low-amplitude chunks after screaming was detected
    if (session.screamingDetected && !session.screamingTimeoutId) {
      if (!isCurrentSampleHigh) {
        session.lowAmplitudeCount = (session.lowAmplitudeCount || 0) + 1;
        // After 3 consecutive low-amplitude chunks (~500ms), consider screaming stopped
        if (session.lowAmplitudeCount >= 3) {
          logger.debug(`VoiceSession: Screaming stopped - waiting ${SCREAMING_POST_SPEECH_WAIT_MS}ms for transcription`);
          session.screamingTimeoutId = setTimeout(() => {
            // Only trigger if still waiting (transcription didn't arrive)
            if (session.screamingDetected) {
              logger.debug('VoiceSession: Transcription wait timeout - triggering screaming-only response');
              this.triggerScreamingResponse(session);
            }
          }, SCREAMING_POST_SPEECH_WAIT_MS);
        }
      } else {
        // Reset counter if still screaming
        session.lowAmplitudeCount = 0;
      }
    }
  }

  /**
   * Immediately trigger safety gate response for screaming (without waiting for transcription)
   */
  private async triggerScreamingResponse(session: VoiceSession): Promise<void> {
    // Clear the timeout ID since the timer has fired
    session.screamingTimeoutId = undefined;

    // GUARD: Prevent race condition - only one response at a time
    if (session.responseInProgress) {
      logger.debug('VoiceSession: BLOCKED - Screaming response skipped, another response in progress');
      session.screamingDetected = false;
      return;
    }
    session.responseInProgress = true;

    // Record timestamp for cooldown - prevents duplicate responses from late-arriving transcriptions
    session.lastScreamingResponseTime = Date.now();
    logger.info('VoiceSession: Immediate screaming response triggered (cooldown started)');

    try {
      // Process through safety-gate with screaming signal (no transcription needed)
      const result: SafetyGateResult = await session.safetyGateSession.processChildResponse(
        '', // Empty - audio signal handles dysregulation
        { screaming: true }
      );

      // Override childSaid for screaming detection
      result.uiPackage.childSaid = '[screaming detected]';

      await this.speakAndSendResult(session, result);

      // Reset screaming detection after handling
      session.screamingDetected = false;

    } catch (error) {
      logger.error(`Screaming response error:`, error);
    } finally {
      session.responseInProgress = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CALIBRATION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start the calibration process
   */
  private handleStartCalibration(session: VoiceSession): void {
    logger.info(`Starting calibration for session ${session.id}`);

    session.calibrationService.startCalibration();

    // Send calibration started message
    this.sendToClient(session, {
      type: 'calibration_started',
      sessionId: session.id
    });

    // Start first phase (silence)
    this.startCalibrationPhase(session);
  }

  /**
   * Start the current calibration phase
   */
  private startCalibrationPhase(session: VoiceSession): void {
    const phase = session.calibrationService.getCurrentPhase();
    const duration = session.calibrationService.getPhaseDuration();
    const prompt = session.calibrationService.getPhasePrompt();

    logger.info(`Calibration phase ${phase} starting for session ${session.id} (${duration}ms)`);

    // Send phase start to client
    this.sendToClient(session, {
      type: 'calibration_phase_start',
      calibrationPhase: phase,
      phaseDuration: duration,
      text: prompt
    });

    // Speak the prompt using TTS
    if (prompt) {
      session.realtimeService.speakText(prompt);
    }
  }

  /**
   * Handle audio chunk during calibration
   */
  private handleCalibrationAudioChunk(session: VoiceSession, amplitude: number, peak: number): void {
    if (!session.calibrationService.isCalibrating()) return;

    // Add sample to calibration service
    session.calibrationService.addSample(amplitude, peak);
  }

  /**
   * Handle calibration phase completion
   */
  private handleCalibrationPhaseComplete(session: VoiceSession): void {
    if (!session.calibrationService.isCalibrating()) return;

    const { nextPhase, needsRetry, retryReason } = session.calibrationService.completePhase();

    if (needsRetry) {
      // Need to retry current phase
      logger.info(`Calibration phase needs retry: ${retryReason}`);
      this.sendToClient(session, {
        type: 'calibration_retry',
        calibrationPhase: nextPhase,
        retryReason: retryReason
      });
      // Speak retry prompt
      session.realtimeService.speakText(config.calibrationPrompts.retry);
      // Restart the phase
      setTimeout(() => this.startCalibrationPhase(session), 2000);
      return;
    }

    if (nextPhase === 'complete') {
      // Calibration complete - calculate and apply thresholds
      this.finishCalibration(session);
    } else if (nextPhase === 'failed') {
      // Calibration failed - use fallback thresholds
      this.failCalibration(session, 'Calibration failed');
    } else {
      // Move to next phase
      this.startCalibrationPhase(session);
    }
  }

  /**
   * Finish calibration and apply thresholds
   */
  private finishCalibration(session: VoiceSession): void {
    const result = session.calibrationService.calculateResult();
    session.calibrationResult = result;

    // Apply calibrated thresholds to session
    session.amplitudeThreshold = result.amplitudeThreshold;
    session.peakThreshold = result.peakThreshold;

    logger.info(`Calibration complete for session ${session.id}: amplitude=${result.amplitudeThreshold.toFixed(3)}, peak=${result.peakThreshold.toFixed(3)}, confidence=${result.confidence}`);

    // Speak completion message
    session.realtimeService.speakText(config.calibrationPrompts.complete);

    // Send result to client
    this.sendToClient(session, {
      type: 'calibration_complete',
      calibrationResult: result
    });
  }

  /**
   * Handle calibration failure
   */
  private failCalibration(session: VoiceSession, reason: string): void {
    logger.warn(`Calibration failed for session ${session.id}: ${reason}`);

    // Use fallback thresholds
    session.amplitudeThreshold = config.calibration.fallback.amplitudeThreshold;
    session.peakThreshold = config.calibration.fallback.peakThreshold;

    // Speak failure message
    session.realtimeService.speakText(config.calibrationPrompts.failed);

    // Send failure to client
    this.sendToClient(session, {
      type: 'calibration_failed',
      message: reason
    });
  }

  /**
   * Abort calibration
   */
  private handleAbortCalibration(session: VoiceSession): void {
    if (!session.calibrationService.isCalibrating()) return;

    logger.info(`Calibration aborted for session ${session.id}`);
    session.calibrationService.abort();

    // Use fallback thresholds
    session.amplitudeThreshold = config.calibration.fallback.amplitudeThreshold;
    session.peakThreshold = config.calibration.fallback.peakThreshold;

    this.sendToClient(session, {
      type: 'calibration_failed',
      message: 'Calibration aborted'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AMPLITUDE TRACKING HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reset amplitude tracking for a new interaction
   */
  private resetAmplitudeTracking(session: VoiceSession): void {
    // Clear any pending screaming timeout
    if (session.screamingTimeoutId) {
      clearTimeout(session.screamingTimeoutId);
      session.screamingTimeoutId = undefined;
    }
    session.recentAmplitudes = [];
    session.screamingDetected = false;
    session.lowAmplitudeCount = 0;
    session.speechStopped = false;
    // Reset cooldown and flags when starting fresh interaction
    session.lastScreamingResponseTime = undefined;
    session.responseInProgress = false;
  }
}

// Singleton instance
export const voiceSessionManager = new VoiceSessionManager();

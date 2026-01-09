/**
 * Voice Session Manager
 * Manages per-client voice sessions and coordinates between client WebSocket and OpenAI Realtime API
 * Integrates with Session for PIPER safety-gate processing
 */

import WebSocket from 'ws';
import { z } from 'zod';
import { RealtimeVoiceService, RealtimeServerEvent } from './realtime.service.js';
import { Session } from '../safety-gate/Session.js';
import { CardContext, SafetyGateResult, UIPackage } from '../../types/safety-gate.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const CardContextSchema = z.object({
  category: z.string(),
  question: z.string(),
  targetAnswers: z.array(z.string()),
  images: z.array(z.object({
    image: z.string(),
    label: z.string()
  }))
});

const ClientMessageSchema = z.object({
  type: z.enum([
    'start_session',
    'speak_card',
    'audio_chunk',
    'commit_audio',
    'end_session',
    'set_card_context',
    'choice_selected',
    'activity_ended'
  ]),
  text: z.string().optional(),
  category: z.string().optional(),
  audio: z.string().optional(),
  amplitude: z.number().min(0).max(1).optional(),
  peak: z.number().min(0).max(1).optional(),
  cardContext: CardContextSchema.optional(),
  action: z.string().optional(),
  activity: z.string().optional()
});

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
  // Track if speech has stopped (to know when to start timeout)
  speechStopped: boolean;
  // Timestamp of last screaming response for cooldown
  lastScreamingResponseTime?: number;
}

export interface ClientMessage {
  type: 'start_session' | 'speak_card' | 'audio_chunk' | 'commit_audio' | 'end_session' | 'set_card_context' | 'choice_selected' | 'activity_ended';
  text?: string;
  category?: string;
  audio?: string; // base64 encoded PCM16 audio
  // Audio amplitude data for screaming detection
  amplitude?: number; // RMS amplitude (0-1 scale)
  peak?: number;      // Peak amplitude (0-1 scale)
  // Card context for safety-gate
  cardContext?: {
    category: string;
    question: string;
    targetAnswers: string[];
    images: Array<{ image: string; label: string }>;
  };
  // Choice selection action
  action?: string;
  // Activity that ended (for activity_ended message)
  activity?: string;
}

export interface ServerMessage {
  type: 'session_ready' | 'audio_chunk' | 'transcript' | 'speaking_started' | 'speaking_done' | 'error' | 'safety_gate_response';
  sessionId?: string;
  audio?: string; // base64 encoded PCM16 audio
  text?: string;
  role?: 'assistant' | 'user';
  message?: string;
  // Safety-gate UI package
  uiPackage?: UIPackage;
  isCorrect?: boolean;
  // Flag for card flow control
  taskTimeExceeded?: boolean;
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
      speechStopped: false,
      lastScreamingResponseTime: undefined
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

          const prompt = message.category
            ? `Here's a ${message.category} question: ${message.text}`
            : message.text;
          session.realtimeService.speakText(prompt);
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

          // Only send to OpenAI if NOT screaming (prevents scream transcription)
          if (!session.screamingDetected) {
            session.realtimeService.sendAudio(message.audio);
          } else {
            logger.debug('VoiceSession: Audio chunk skipped - screaming detected');
          }
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
          // Reset screaming detection flag but don't process
          session.screamingDetected = false;
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

      // Cancel any ongoing OpenAI response before speaking safety-gate feedback
      session.realtimeService.cancelResponse();

      // Small delay to ensure cancellation is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Speak the validated feedback through OpenAI Realtime
      if (result.shouldSpeak && result.feedbackText) {
        session.realtimeService.speakFeedback(result.feedbackText);
      }

      // Send safety-gate response to frontend (include extra data for console logging)
      this.sendToClient(session, {
        type: 'safety_gate_response',
        uiPackage: {
          ...result.uiPackage,
          // Add extra fields for frontend console logging
          childSaid: result.childSaid,
          targetAnswers: result.targetAnswers,
          attemptNumber: result.attemptNumber,
          responseHistory: result.responseHistory
        },
        isCorrect: result.isCorrect
      });

      // Note: Detailed logging is handled by Session using pipelineLogger

    } catch (error) {
      logger.error(`Safety-gate processing error:`, error);

      // Send error to client
      this.sendToClient(session, {
        type: 'error',
        message: 'Safety gate processing failed'
      });
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
      // Cancel any ongoing OpenAI response
      session.realtimeService.cancelResponse();

      // Small delay to ensure cancellation is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Speak the inactivity feedback through OpenAI Realtime
      if (result.shouldSpeak && result.feedbackText) {
        logger.debug(`VoiceSession: Speaking inactivity feedback`);
        session.realtimeService.speakFeedback(result.feedbackText);
      }

      // Send safety-gate response to frontend
      this.sendToClient(session, {
        type: 'safety_gate_response',
        uiPackage: {
          ...result.uiPackage,
          childSaid: '[INACTIVE - No response]',
          targetAnswers: result.targetAnswers,
          attemptNumber: result.attemptNumber,
          responseHistory: result.responseHistory
        },
        isCorrect: false
      });

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
      // Cancel any ongoing OpenAI response
      session.realtimeService.cancelResponse();

      // Small delay to ensure cancellation is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Speak the timeout feedback through OpenAI Realtime
      if (result.shouldSpeak && result.feedbackText) {
        logger.debug('VoiceSession: Speaking timeout feedback');
        session.realtimeService.speakFeedback(result.feedbackText);
      }

      // Send safety-gate response to frontend with taskTimeExceeded flag
      // This tells the frontend to skip/close the current card
      this.sendToClient(session, {
        type: 'safety_gate_response',
        uiPackage: {
          ...result.uiPackage,
          childSaid: '[TASK_TIMEOUT]',
          targetAnswers: result.targetAnswers,
          attemptNumber: result.attemptNumber,
          responseHistory: result.responseHistory
        },
        isCorrect: false,
        taskTimeExceeded: true
      });

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
   */
  private trackAmplitude(session: VoiceSession, amplitude: number, peak: number): void {
    const now = Date.now();

    // Debug: Log high amplitude chunks
    if (amplitude > 0.3 || peak > 0.6) {
      logger.debug(`VoiceSession: HIGH AMPLITUDE - RMS: ${amplitude.toFixed(3)}, Peak: ${peak.toFixed(3)}`);
    }

    // Add new amplitude reading
    session.recentAmplitudes.push({ amplitude, peak, timestamp: now });

    // Keep only recent readings (last 2 seconds)
    const cutoff = now - 2000;
    session.recentAmplitudes = session.recentAmplitudes.filter(a => a.timestamp > cutoff);

    // Check for screaming: consecutive high-amplitude chunks
    const recentHighAmplitude = session.recentAmplitudes.filter(
      a => a.amplitude > SCREAMING_AMPLITUDE_THRESHOLD || a.peak > SCREAMING_PEAK_THRESHOLD
    );

    // Debug: Log screaming detection progress
    if (recentHighAmplitude.length > 0) {
      logger.debug(`VoiceSession: High amplitude chunks: ${recentHighAmplitude.length}/${SCREAMING_CONFIRMATION_CHUNKS}`);
    }

    if (recentHighAmplitude.length >= SCREAMING_CONFIRMATION_CHUNKS) {
      if (!session.screamingDetected) {
        session.screamingDetected = true;
        logger.info(`VoiceSession: SCREAMING DETECTED (amplitude: ${amplitude.toFixed(3)}, peak: ${peak.toFixed(3)})`);

        // Start timeout to trigger screaming response immediately
        // We can't wait for speech_stopped since we're blocking audio from reaching OpenAI
        if (!session.screamingTimeoutId) {
          logger.debug(`VoiceSession: Starting screaming response timeout (${SCREAMING_POST_SPEECH_WAIT_MS}ms)`);
          session.screamingTimeoutId = setTimeout(() => {
            if (session.screamingDetected) {
              logger.debug('VoiceSession: Screaming timeout fired - triggering response');
              this.triggerScreamingResponse(session);
            }
          }, SCREAMING_POST_SPEECH_WAIT_MS);
        }
      }
    } else if (session.screamingDetected && recentHighAmplitude.length === 0) {
      // Reset screaming flag when amplitude drops back to normal
      session.screamingDetected = false;
      logger.debug('VoiceSession: Screaming ended - resuming normal audio capture');
    }
  }

  /**
   * Immediately trigger safety gate response for screaming (without waiting for transcription)
   */
  private async triggerScreamingResponse(session: VoiceSession): Promise<void> {
    // Clear the timeout ID since the timer has fired
    session.screamingTimeoutId = undefined;

    // Record timestamp for cooldown - prevents duplicate responses from late-arriving transcriptions
    session.lastScreamingResponseTime = Date.now();
    logger.info('VoiceSession: Immediate screaming response triggered (cooldown started)');

    try {
      // Process through safety-gate with screaming signal (no transcription needed)
      // Use empty placeholder - dysregulation is handled via the screaming signal
      const result: SafetyGateResult = await session.safetyGateSession.processChildResponse(
        '', // Empty - audio signal handles dysregulation
        { screaming: true }
      );

      // Cancel any ongoing OpenAI response
      session.realtimeService.cancelResponse();

      // Small delay to ensure cancellation is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Speak the calming feedback through OpenAI Realtime
      if (result.shouldSpeak && result.feedbackText) {
        session.realtimeService.speakFeedback(result.feedbackText);
      }

      // Send safety-gate response to frontend
      this.sendToClient(session, {
        type: 'safety_gate_response',
        uiPackage: {
          ...result.uiPackage,
          childSaid: '[screaming detected]',
          targetAnswers: result.targetAnswers,
          attemptNumber: result.attemptNumber,
          responseHistory: result.responseHistory
        },
        isCorrect: false
      });

      // Reset screaming detection after handling
      session.screamingDetected = false;

    } catch (error) {
      logger.error(`Screaming response error:`, error);
    }
  }

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
    session.speechStopped = false;
    // Reset cooldown when starting fresh interaction
    session.lastScreamingResponseTime = undefined;
  }
}

// Singleton instance
export const voiceSessionManager = new VoiceSessionManager();

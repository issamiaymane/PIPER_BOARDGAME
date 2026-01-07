/**
 * Voice Session Manager
 * Manages per-client voice sessions and coordinates between client WebSocket and OpenAI Realtime API
 * Integrates with SafetyGateSession for PIPER safety-gate processing
 */

import WebSocket from 'ws';
import { RealtimeVoiceService, RealtimeServerEvent } from './realtime.service.js';
import { SafetyGateSession, CardContext, SafetyGateResult } from '../safety-gate/SafetyGateSession.js';
import { UIPackage } from '../safety-gate/BackendOrchestrator.js';
import { logger } from '../../utils/logger.js';

export interface VoiceSession {
  id: string;
  clientWs: WebSocket;
  realtimeService: RealtimeVoiceService;
  isActive: boolean;
  currentCardText?: string;
  createdAt: Date;
  // Safety-gate integration
  safetyGateSession: SafetyGateSession;
  currentCardContext?: CardContext;
}

export interface ClientMessage {
  type: 'start_session' | 'speak_card' | 'audio_chunk' | 'commit_audio' | 'end_session' | 'set_card_context';
  text?: string;
  category?: string;
  audio?: string; // base64 encoded PCM16 audio
  // Card context for safety-gate
  cardContext?: {
    category: string;
    question: string;
    targetAnswers: string[];
    images: Array<{ image: string; label: string }>;
  };
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
      safetyGateSession: new SafetyGateSession()
    };

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
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug(`Session ${sessionId}: User stopped speaking`);
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
  handleClientMessage(sessionId: string, message: ClientMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      logger.warn(`Message received for inactive session: ${sessionId}`);
      return;
    }

    switch (message.type) {
      case 'speak_card':
        if (message.text) {
          // Clear any pending audio from previous card to prevent context mismatch
          session.realtimeService.clearAudio();
          session.realtimeService.cancelResponse();

          session.currentCardText = message.text;

          // Set card context for safety-gate if provided
          if (message.cardContext) {
            session.currentCardContext = message.cardContext;
            session.safetyGateSession.setCurrentCard(message.cardContext);
            logger.info(`Card context set for session ${sessionId}: ${message.cardContext.category} - Target: [${message.cardContext.targetAnswers.join(', ')}]`);
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
          session.realtimeService.sendAudio(message.audio);
        }
        break;

      case 'commit_audio':
        session.realtimeService.commitAudio();
        break;

      case 'end_session':
        this.endSession(sessionId);
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
      // Process through safety-gate session (logging handled by SafetyGateSession)
      const result: SafetyGateResult = await session.safetyGateSession.processChildResponse(transcription);

      // Cancel any ongoing OpenAI response before speaking safety-gate feedback
      session.realtimeService.cancelResponse();

      // Small delay to ensure cancellation is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Speak the validated feedback through OpenAI Realtime
      if (result.shouldSpeak && result.feedbackText) {
        session.realtimeService.speakFeedback(result.feedbackText);
      }

      // Send safety-gate response to frontend
      this.sendToClient(session, {
        type: 'safety_gate_response',
        uiPackage: result.uiPackage,
        isCorrect: result.isCorrect
      });

      // Note: Detailed logging is handled by SafetyGateSession using safetyGateLogger

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
}

// Singleton instance
export const voiceSessionManager = new VoiceSessionManager();

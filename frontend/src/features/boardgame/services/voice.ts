/**
 * Voice Service
 * Main service for GPT-4o Advanced Voice Mode integration
 * Manages WebSocket connection, audio capture, and playback
 */

import { z } from 'zod';
import { AudioCapture, AudioChunkData } from './audio-capture.js';
import { AudioPlayback } from './audio-playback.js';
import { voiceLogger } from './logger.js';
import { calibrationService } from './calibration.js';
import type { CalibrationResult, CalibrationStatus } from './calibration-types.js';
import {
  showCalibrationOverlay,
  hideCalibrationOverlay,
  updateCalibrationPhase,
  updateCalibrationProgress,
  showCalibrationComplete,
  showCalibrationFailed,
  setAiSpeaking,
  setChildTurn,
  updateVoiceActivity,
  isChildsTurn
} from '../../../common/components/CalibrationOverlay/index.js';

export type VoiceState = 'idle' | 'connecting' | 'ready' | 'speaking' | 'listening';

export interface CardData {
  question?: string;
  title?: string;
  choices?: string[];
  words?: string[];
  paragraph?: string;
  story?: string;
  questions?: Array<{ question: string }>;
  images?: Array<{ label?: string; image?: string }>;
  answers?: string[];
  answerIndex?: number;
  [key: string]: unknown;
}

export interface UIPackage {
  // Flow order: Signals → State → Level → Interventions → Config → LLM Output
  overlay: {
    signals: string[];
    state: {
      engagementLevel: number;
      dysregulationLevel: number;
      fatigueLevel: number;
      consecutiveErrors: number;
      timeInSession: number;
      errorFrequency: number;
      timeSinceBreak: number;
    };
    safetyLevel: number;
  };
  interventions: string[];
  sessionConfig: {
    promptIntensity: number;
    avatarTone: string;
    maxTaskTime: number;
    inactivityTimeout: number;
  };
  speech: {
    text: string;
  };
  choiceMessage: string;
  // Optional: logging data
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

// Runtime validation schema for server messages
const ServerMessageSchema = z.object({
  type: z.enum([
    'session_ready', 'audio_chunk', 'transcript', 'speaking_started', 'speaking_done', 'error', 'safety_gate_response',
    // Calibration messages
    'calibration_started', 'calibration_phase_start', 'calibration_complete', 'calibration_failed', 'calibration_retry'
  ]),
  sessionId: z.string().optional(),
  audio: z.string().optional(),
  text: z.string().optional(),
  role: z.enum(['assistant', 'user']).optional(),
  message: z.string().optional(),
  uiPackage: z.object({
    overlay: z.object({
      signals: z.array(z.string()),
      state: z.object({
        engagementLevel: z.number(),
        dysregulationLevel: z.number(),
        fatigueLevel: z.number(),
        consecutiveErrors: z.number(),
        timeInSession: z.number(),
        errorFrequency: z.number(),
        timeSinceBreak: z.number()
      }),
      safetyLevel: z.number()
    }),
    interventions: z.array(z.string()),
    sessionConfig: z.object({
      promptIntensity: z.number(),
      avatarTone: z.string(),
      maxTaskTime: z.number(),
      inactivityTimeout: z.number()
    }),
    speech: z.object({ text: z.string() }),
    choiceMessage: z.string(),
    childSaid: z.string().optional(),
    targetAnswers: z.array(z.string()).optional(),
    attemptNumber: z.number().optional(),
    responseHistory: z.array(z.string()).optional()
  }).optional(),
  isCorrect: z.boolean().optional(),
  taskTimeExceeded: z.boolean().optional(),
  // Calibration fields
  calibrationPhase: z.string().optional(),
  calibrationResult: z.object({
    amplitudeThreshold: z.number(),
    peakThreshold: z.number(),
    isValid: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    failureReason: z.string().optional(),
    deviceGain: z.number(),
    calibratedAt: z.string()
  }).optional(),
  phaseDuration: z.number().optional(),
  retryReason: z.string().optional()
});

type ServerMessage = z.infer<typeof ServerMessageSchema>;

interface CardContext {
  category: string;
  question: string;
  targetAnswers: string[];
  images: Array<{ image: string; label: string }>;
}

export class VoiceService {
  private ws: WebSocket | null = null;
  private audioCapture: AudioCapture;
  private audioPlayback: AudioPlayback;
  private sessionId: string | null = null;
  private state: VoiceState = 'idle';
  private isListeningEnabled = false;

  // Callback when state changes
  onStateChange?: (state: VoiceState) => void;

  // Callback when transcript is received
  onTranscript?: (text: string, role: 'assistant' | 'user') => void;

  // Callback for errors
  onError?: (message: string) => void;

  // Callback for safety-gate response
  // shouldSkipCard is true when taskTimeExceeded
  onSafetyGateResponse?: (uiPackage: UIPackage, isCorrect: boolean, shouldSkipCard: boolean) => void;

  // Callback for calibration complete
  onCalibrationComplete?: (result: CalibrationResult) => void;

  // Callback for calibration failed/skipped
  onCalibrationFailed?: (error: string) => void;

  // Callback for calibration status change
  onCalibrationStatusChange?: (status: CalibrationStatus) => void;

  // Store original audio handler during calibration
  private originalAudioHandler?: (data: AudioChunkData) => void;

  // Track if we're waiting for calibration audio to finish
  private waitingForCalibrationPlayback = false;

  constructor() {
    this.audioCapture = new AudioCapture();
    this.audioPlayback = new AudioPlayback();

    // Set up audio capture callback
    this.audioCapture.onAudioChunk = (data) => {
      this.sendAudioChunk(data);
    };

    // Set up playback state callback
    this.audioPlayback.onStateChange = (isPlaying) => {
      if (!isPlaying) {
        // Check if this is calibration playback finishing
        if (this.waitingForCalibrationPlayback && calibrationService.isCalibrating()) {
          this.waitingForCalibrationPlayback = false;
          setChildTurn();
          calibrationService.setChildTurnActive(); // Enable VAD for early phase completion
          voiceLogger.info('Calibration: Audio playback finished, child\'s turn now');
          return;
        }

        // Normal flow - AI finished speaking
        if (this.state === 'speaking') {
          if (this.isListeningEnabled) {
            this.setState('listening');
            this.audioCapture.start();
          } else {
            this.setState('ready');
          }
        }
      }
    };

    // Handle browser tab visibility changes
    // When user navigates away and back, AudioContext gets suspended
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.state !== 'idle') {
        this.handleVisibilityRestore();
      }
    });

    // Set up calibration service callbacks
    this.setupCalibrationCallbacks();
  }

  /**
   * Set up calibration service callbacks
   */
  private setupCalibrationCallbacks(): void {
    calibrationService.onStateChange = (status) => {
      this.onCalibrationStatusChange?.(status);
    };

    calibrationService.onPhaseStart = (phase, duration, prompt) => {
      updateCalibrationPhase(phase);
      setAiSpeaking(); // AI will speak the prompt first
      voiceLogger.info(`Calibration phase started: ${phase} (${duration}ms)`);
    };

    calibrationService.onPhaseProgress = (phase, progress) => {
      updateCalibrationProgress(progress);
    };

    calibrationService.onComplete = (result) => {
      this.restoreAudioHandler();
      this.audioCapture.stop();
      showCalibrationComplete(result);
      this.onCalibrationComplete?.(result);
    };

    calibrationService.onFailed = (error) => {
      this.restoreAudioHandler();
      this.audioCapture.stop();
      showCalibrationFailed(error);
      this.onCalibrationFailed?.(error);
    };
  }

  /**
   * Restore original audio handler after calibration
   */
  private restoreAudioHandler(): void {
    if (this.originalAudioHandler) {
      this.audioCapture.onAudioChunk = this.originalAudioHandler;
      this.originalAudioHandler = undefined;
    }
  }

  /**
   * Handle when page becomes visible again after being hidden
   * Resume AudioContexts and restore listening if needed
   */
  private async handleVisibilityRestore(): Promise<void> {
    voiceLogger.info('VoiceService: Tab became visible, restoring audio...');

    // Resume both audio contexts
    await Promise.all([
      this.audioPlayback.resumeAudioContext(),
      this.audioCapture.resumeAudioContext()
    ]);

    // If we were in listening state, make sure capture is running
    if (this.state === 'listening' && this.isListeningEnabled) {
      this.audioCapture.start();
      voiceLogger.info('VoiceService: Listening restored');
    }
  }

  /**
   * Enable voice mode - connect to backend and initialize audio
   */
  async enable(): Promise<boolean> {
    if (this.state !== 'idle') {
      return this.state === 'ready';
    }

    this.setState('connecting');

    // Initialize audio capture (request microphone permission)
    const audioInitialized = await this.audioCapture.initialize();
    if (!audioInitialized) {
      this.onError?.('Failed to access microphone. Please grant permission and try again.');
      this.setState('idle');
      return false;
    }

    // Connect to backend WebSocket
    const connected = await this.connectWebSocket();
    if (!connected) {
      this.audioCapture.dispose();
      this.setState('idle');
      return false;
    }

    return true;
  }

  /**
   * Disable voice mode
   */
  disable(): void {
    this.audioCapture.stop();
    this.audioCapture.dispose();
    this.audioPlayback.stop();
    this.audioPlayback.dispose();

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'end_session' }));
      this.ws.close();
      this.ws = null;
    }

    this.sessionId = null;
    this.isListeningEnabled = false;
    this.setState('idle');
  }

  /**
   * Start the calibration process
   * Should be called after enable() when voice is ready
   */
  startCalibration(): void {
    if (this.state !== 'ready') {
      voiceLogger.warn('Cannot start calibration - not in ready state');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      voiceLogger.error('Cannot start calibration - WebSocket not connected');
      return;
    }

    voiceLogger.info('Starting voice calibration');

    // Pass WebSocket to calibration service
    calibrationService.setWebSocket(this.ws);

    // Show calibration overlay
    showCalibrationOverlay({
      onSkip: () => {
        this.skipCalibration();
      }
    });

    // Store original audio handler before replacing
    this.originalAudioHandler = this.audioCapture.onAudioChunk;

    // Set up audio chunk handler for calibration
    this.audioCapture.onAudioChunk = (data) => {
      if (calibrationService.isCalibrating()) {
        // Send amplitude data to calibration service
        this.sendMessage({
          type: 'calibration_audio_chunk',
          audio: data.audio,
          amplitude: Math.min(data.amplitude, 1),
          peak: Math.min(data.peak, 1)
        });

        // Update voice activity visualization when it's child's turn
        if (isChildsTurn()) {
          updateVoiceActivity(data.amplitude);
          // Process amplitude for VAD-based early phase completion
          calibrationService.processAudioAmplitude(data.amplitude);
        }
      } else {
        // Normal audio handling
        this.originalAudioHandler?.(data);
      }
    };

    // Start capturing audio for calibration (but don't send to transcription)
    this.audioCapture.start();

    // Start calibration
    calibrationService.start();
  }

  /**
   * Skip calibration and use default thresholds
   */
  skipCalibration(): void {
    voiceLogger.info('Skipping calibration');
    calibrationService.abort();
    this.audioCapture.stop();
    hideCalibrationOverlay();
  }

  /**
   * Check if calibration is in progress
   */
  isCalibrating(): boolean {
    return calibrationService.isCalibrating();
  }

  /**
   * Apply saved calibration from database (skip calibration process)
   * Call this when a child has existing calibration data
   */
  applyCalibration(calibration: {
    amplitudeThreshold: number;
    peakThreshold: number;
    confidence?: string;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      voiceLogger.warn('Cannot apply calibration - WebSocket not connected');
      return;
    }

    voiceLogger.info(`Applying saved calibration: amp=${calibration.amplitudeThreshold}, peak=${calibration.peakThreshold}`);

    this.sendMessage({
      type: 'apply_calibration',
      amplitudeThreshold: calibration.amplitudeThreshold,
      peakThreshold: calibration.peakThreshold
    });
  }

  /**
   * Speak a card's content via AI
   */
  speakCard(card: CardData, category: string): void {
    // Only block if completely disconnected
    if (this.state === 'idle' || this.state === 'connecting') {
      voiceLogger.warn('Not ready to speak - not connected');
      return;
    }

    // If still speaking previous response, interrupt it
    if (this.state === 'speaking') {
      voiceLogger.info('Interrupting previous speech to speak new card');
      this.audioPlayback.stop();
    }

    // Stop any ongoing capture and commit pending audio
    // This ensures old speech is processed before new card starts
    this.audioCapture.stop();
    this.sendMessage({ type: 'commit_audio' });

    // Enable listening after speaking
    this.isListeningEnabled = true;

    // Extract text from card
    const text = this.extractTextFromCard(card);

    // Extract card context for safety-gate
    const cardContext = this.extractCardContext(card, category);

    // Send to backend with card context
    this.sendMessage({
      type: 'speak_card',
      text,
      category,
      cardContext
    });

    this.setState('speaking');
  }

  /**
   * Extract card context for safety-gate processing
   */
  private extractCardContext(card: CardData, category: string): CardContext {
    return {
      category,
      question: card.question || card.title || '',
      targetAnswers: this.extractTargetAnswers(card),
      images: (card.images || []).map(img => ({
        image: img.image || '',
        label: img.label || ''
      }))
    };
  }

  /**
   * Extract target answers from various card types
   */
  private extractTargetAnswers(card: CardData): string[] {
    // For cards with explicit answers array (like Adjectives - Opposites)
    if (card.answers && Array.isArray(card.answers)) {
      return card.answers;
    }

    // For multiple choice cards with answerIndex
    if (card.choices && typeof card.answerIndex === 'number') {
      return [card.choices[card.answerIndex]];
    }

    // For cards with image labels as answers
    if (card.images && card.images.length > 0) {
      const labels = card.images
        .filter(img => img.label)
        .map(img => img.label as string);
      if (labels.length > 0) {
        return labels;
      }
    }

    // Default: no specific answer expected
    return [];
  }

  /**
   * Manually start listening (if not auto-listening after speech)
   */
  startListening(): void {
    if (this.state !== 'ready') return;

    this.isListeningEnabled = true;
    this.setState('listening');
    this.audioCapture.start();
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.isListeningEnabled = false;
    this.audioCapture.stop();

    // Commit the audio buffer
    this.sendMessage({ type: 'commit_audio' });

    if (this.state === 'listening') {
      this.setState('ready');
    }
  }

  /**
   * Pause listening without committing audio (for when choices are shown)
   * This allows the AI to continue speaking while we wait for user action
   */
  pauseListening(): void {
    this.isListeningEnabled = false;
    this.audioCapture.stop();
    // Don't commit audio - just pause
    if (this.state === 'listening') {
      this.setState('ready');
    }
  }

  /**
   * Interrupt any ongoing speech and transition to ready state
   * Call this when user selects an intervention during playback
   */
  interruptSpeech(): void {
    this.audioPlayback.stop();
    if (this.state === 'speaking') {
      this.setState('ready');
    }
  }

  /**
   * Notify backend about choice selection
   * This allows the backend to manage inactivity timer appropriately
   * @param action The choice action (retry, trigger_break, etc.)
   */
  notifyChoiceSelected(action: string): void {
    voiceLogger.info(`Notifying backend of choice: ${action}`);
    this.sendMessage({
      type: 'choice_selected',
      action
    });
  }

  /**
   * Notify backend that an activity has ended and session should resume
   * Call this when: break ends, bubble breathing ends, grownup help modal closes
   * @param activity The activity that ended (for logging)
   */
  notifyActivityEnded(activity: string): void {
    voiceLogger.info(`Activity ended: ${activity} - requesting session resume`);
    this.sendMessage({
      type: 'activity_ended',
      activity
    });
  }

  /**
   * Check if voice mode is enabled
   */
  isEnabled(): boolean {
    return this.state !== 'idle';
  }

  /**
   * Check if connected and ready
   */
  isReady(): boolean {
    return this.state === 'ready' || this.state === 'speaking' || this.state === 'listening';
  }

  /**
   * Get current state
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * Get current voice session ID (for linking to gameplay session)
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Connect to backend WebSocket
   */
  private connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Determine WebSocket URL:
        // - In production (deployed): use current page origin (same host)
        // - In development: connect directly to backend (bypass Vite proxy for WebSocket)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        let wsUrl: string;
        if (isLocalhost) {
          // Local development - connect directly to backend
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const url = new URL(apiUrl);
          const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = url.hostname;
          const portPart = url.port ? `:${url.port}` : '';
          wsUrl = `${protocol}//${host}${portPart}/api/voice`;
        } else {
          // Production - use same origin as the page
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/api/voice`;
        }
        voiceLogger.info('Connecting to:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          voiceLogger.info('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const result = ServerMessageSchema.safeParse(parsed);
            if (!result.success) {
              voiceLogger.error('Invalid server message:', result.error.issues);
              return;
            }
            this.handleServerMessage(result.data, resolve);
          } catch (err) {
            voiceLogger.error('Failed to parse server message:', err);
          }
        };

        this.ws.onerror = (err) => {
          voiceLogger.error('WebSocket error:', err);
          this.onError?.('Failed to connect to voice server');
          resolve(false);
        };

        this.ws.onclose = () => {
          voiceLogger.info('WebSocket closed');
          if (this.state !== 'idle') {
            this.setState('idle');
            this.onError?.('Voice connection closed');
          }
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.state === 'connecting') {
            this.ws?.close();
            this.onError?.('Connection timeout');
            resolve(false);
          }
        }, 10000);

      } catch (err) {
        voiceLogger.error('Failed to create WebSocket:', err);
        resolve(false);
      }
    });
  }

  /**
   * Handle messages from server
   */
  private handleServerMessage(message: ServerMessage, resolveConnect?: (value: boolean) => void): void {
    switch (message.type) {
      case 'session_ready':
        this.sessionId = message.sessionId || null;
        this.setState('ready');
        resolveConnect?.(true);
        break;

      case 'audio_chunk':
        if (message.audio) {
          this.audioPlayback.enqueue(message.audio);
        }
        break;

      case 'speaking_started':
        this.setState('speaking');
        break;

      case 'speaking_done':
        // If calibrating, mark that we're waiting for playback to finish
        // The actual switch to child's turn happens when audio playback completes
        if (calibrationService.isCalibrating()) {
          this.waitingForCalibrationPlayback = true;
          voiceLogger.info('Calibration: AI finished generating, waiting for playback to complete');
        }
        // Playback state change will handle transition for normal flow
        break;

      case 'transcript':
        if (message.text && message.role) {
          this.onTranscript?.(message.text, message.role);
        }
        break;

      case 'error':
        voiceLogger.error('Server error:', message.message);
        this.onError?.(message.message || 'Unknown error');
        break;

      case 'safety_gate_response':
        if (message.uiPackage) {
          // Detailed logging is done in handleSafetyGateResponse with styled output
          // shouldSkipCard = true when taskTimeExceeded
          const shouldSkipCard = message.taskTimeExceeded === true;
          this.onSafetyGateResponse?.(message.uiPackage, message.isCorrect ?? false, shouldSkipCard);
        }
        break;

      // Calibration messages - delegate to calibration service
      case 'calibration_started':
      case 'calibration_phase_start':
      case 'calibration_complete':
      case 'calibration_failed':
      case 'calibration_retry':
        calibrationService.handleServerMessage({
          type: message.type,
          calibrationPhase: message.calibrationPhase as any,
          phaseDuration: message.phaseDuration,
          text: message.text,
          calibrationResult: message.calibrationResult as any,
          retryReason: message.retryReason,
          message: message.message
        });
        // Stop audio capture when calibration completes or fails
        if (message.type === 'calibration_complete' || message.type === 'calibration_failed') {
          this.audioCapture.stop();
        }
        break;
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(message: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send audio chunk to server with amplitude data
   */
  private sendAudioChunk(data: AudioChunkData): void {
    this.sendMessage({
      type: 'audio_chunk',
      audio: data.audio,
      amplitude: Math.min(data.amplitude, 1),
      peak: Math.min(data.peak, 1)
    });
  }

  /**
   * Update state and notify listeners
   */
  private setState(newState: VoiceState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  /**
   * Extract readable text from various card types
   */
  private extractTextFromCard(card: CardData): string {
    const parts: string[] = [];

    // Add title if present
    if (card.title) {
      parts.push(card.title);
    }

    // Add paragraph/story context first
    if (card.paragraph) {
      parts.push(card.paragraph);
    }
    if (card.story) {
      parts.push(card.story);
    }

    // Add main question
    if (card.question) {
      // Replace blanks with "blank"
      const question = card.question.replace(/_+/g, 'blank');
      parts.push(question);
    }

    // For multiple questions
    if (card.questions && card.questions.length > 0) {
      card.questions.forEach((q, i) => {
        const questionText = q.question.replace(/_+/g, 'blank');
        parts.push(`Question ${i + 1}: ${questionText}`);
      });
    }

    // For multiple choice, read options
    if (card.choices && card.choices.length > 0) {
      parts.push('The choices are:');
      const labels = ['A', 'B', 'C', 'D'];
      card.choices.forEach((choice, i) => {
        parts.push(`${labels[i]}: ${choice}`);
      });
    }

    // For building cards, mention the words
    if (card.words && card.words.length > 0) {
      parts.push(`Use these words to build a sentence: ${card.words.join(', ')}`);
    }

    // Describe images if they have labels
    if (card.images && card.images.length > 0) {
      const imageLabels = card.images
        .filter(img => img.label)
        .map(img => img.label);
      if (imageLabels.length > 0) {
        parts.push(`The images show: ${imageLabels.join(', ')}`);
      }
    }

    return parts.join(' ');
  }
}

// Singleton instance
export const voiceService = new VoiceService();

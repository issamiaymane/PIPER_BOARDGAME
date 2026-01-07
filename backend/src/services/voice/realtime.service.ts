/**
 * OpenAI Realtime API Service
 * Handles connection to GPT-4o's native audio processing (Advanced Voice Mode)
 */

import WebSocket from 'ws';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

const VOICE_SYSTEM_PROMPT = `You are a friendly speech therapy assistant helping children practice language skills.

Your role:
- Read aloud the card questions clearly and enthusiastically
- Listen to the student's spoken answer
- Respond naturally and encouragingly (e.g., "Great try!", "I heard you say...")
- Do NOT evaluate or correct answers
- Keep responses brief and positive
- Speak in a warm, child-friendly tone

Remember: This is for practice, not testing. Be supportive and encouraging.`;

export type RealtimeEventHandler = (event: RealtimeServerEvent) => void;

export interface RealtimeServerEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

export interface RealtimeClientEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

export class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private eventHandler: RealtimeEventHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  /**
   * Set handler for incoming Realtime API events
   */
  onEvent(handler: RealtimeEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<boolean> {
    if (!config.openai.apiKey) {
      logger.error('OpenAI API key not configured');
      return false;
    }

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(OPENAI_REALTIME_URL, {
          headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        this.ws.on('open', () => {
          logger.info('Connected to OpenAI Realtime API');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.configureSession();
          resolve(true);
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const event = JSON.parse(data.toString()) as RealtimeServerEvent;
            this.handleEvent(event);
          } catch (err) {
            logger.error('Failed to parse Realtime API message:', err);
          }
        });

        this.ws.on('error', (err) => {
          logger.error('Realtime API WebSocket error:', err);
          resolve(false);
        });

        this.ws.on('close', (code, reason) => {
          logger.info(`Realtime API connection closed: ${code} - ${reason.toString()}`);
          this.isConnected = false;
          this.ws = null;
        });

      } catch (err) {
        logger.error('Failed to connect to Realtime API:', err);
        resolve(false);
      }
    });
  }

  /**
   * Configure the Realtime session for voice conversation
   */
  private configureSession(): void {
    this.sendEvent({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: VOICE_SYSTEM_PROMPT,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
          language: 'en'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: false
        }
      }
    });
  }

  /**
   * Handle incoming events from Realtime API
   */
  private handleEvent(event: RealtimeServerEvent): void {
    switch (event.type) {
      case 'session.created':
        logger.info('Realtime session created');
        break;
      case 'session.updated':
        logger.info('Realtime session configured');
        break;
      case 'error':
        // Suppress benign errors
        const errorCode = (event.error as { code?: string })?.code;
        const benignErrors = ['input_audio_buffer_commit_empty', 'response_cancel_not_active'];
        if (!benignErrors.includes(errorCode || '')) {
          logger.error('Realtime API error:', event);
        }
        break;
      default:
        // Forward all events to the handler
        break;
    }

    // Forward to event handler
    if (this.eventHandler) {
      this.eventHandler(event);
    }
  }

  /**
   * Send an event to the Realtime API
   */
  sendEvent(event: RealtimeClientEvent): void {
    if (!this.ws || !this.isConnected) {
      logger.warn('Cannot send event: not connected to Realtime API');
      return;
    }

    try {
      this.ws.send(JSON.stringify(event));
    } catch (err) {
      logger.error('Failed to send event to Realtime API:', err);
    }
  }

  /**
   * Send text to be spoken by the AI (for card questions)
   */
  speakText(text: string): void {
    // Create a conversation item with the text
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Please read this card question aloud to the student: "${text}"`
          }
        ]
      }
    });

    // Trigger response generation
    this.sendEvent({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    });
  }

  /**
   * Speak feedback text directly (for safety-gate responses)
   */
  speakFeedback(text: string): void {
    // Create a conversation item with exact feedback to speak
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Say exactly this to the student (nothing more, nothing less): "${text}"`
          }
        ]
      }
    });

    // Trigger response generation
    this.sendEvent({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    });
  }

  /**
   * Send audio data to the Realtime API
   */
  sendAudio(audioBase64: string): void {
    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioBase64
    });
  }

  /**
   * Commit the audio buffer (signal end of user speech)
   */
  commitAudio(): void {
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
  }

  /**
   * Clear the audio buffer
   */
  clearAudio(): void {
    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
  }

  /**
   * Cancel any ongoing response
   */
  cancelResponse(): void {
    this.sendEvent({
      type: 'response.cancel'
    });
  }

  /**
   * Check if connected to Realtime API
   */
  isActive(): boolean {
    return this.isConnected && this.ws !== null;
  }

  /**
   * Disconnect from Realtime API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.eventHandler = null;
  }
}

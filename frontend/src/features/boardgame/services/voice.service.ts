/**
 * Voice Service
 * Main service for GPT-4o Advanced Voice Mode integration
 * Manages WebSocket connection, audio capture, and playback
 */

import { AudioCapture } from './audio-capture.js';
import { AudioPlayback } from './audio-playback.js';

export type VoiceState = 'idle' | 'connecting' | 'ready' | 'speaking' | 'listening';

export interface CardData {
  question?: string;
  title?: string;
  choices?: string[];
  words?: string[];
  paragraph?: string;
  story?: string;
  questions?: Array<{ question: string }>;
  images?: Array<{ label?: string }>;
  [key: string]: unknown;
}

interface ServerMessage {
  type: 'session_ready' | 'audio_chunk' | 'transcript' | 'speaking_started' | 'speaking_done' | 'error';
  sessionId?: string;
  audio?: string;
  text?: string;
  role?: 'assistant' | 'user';
  message?: string;
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

  constructor() {
    this.audioCapture = new AudioCapture();
    this.audioPlayback = new AudioPlayback();

    // Set up audio capture callback
    this.audioCapture.onAudioChunk = (chunk) => {
      this.sendAudioChunk(chunk);
    };

    // Set up playback state callback
    this.audioPlayback.onStateChange = (isPlaying) => {
      if (!isPlaying && this.state === 'speaking') {
        // AI finished speaking, start listening
        if (this.isListeningEnabled) {
          this.setState('listening');
          this.audioCapture.start();
        } else {
          this.setState('ready');
        }
      }
    };
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
   * Speak a card's content via AI
   */
  speakCard(card: CardData, category: string): void {
    if (this.state !== 'ready' && this.state !== 'listening') {
      console.warn('Voice service not ready to speak');
      return;
    }

    // Stop any ongoing capture
    this.audioCapture.stop();
    this.audioPlayback.stop();

    // Enable listening after speaking
    this.isListeningEnabled = true;

    // Extract text from card
    const text = this.extractTextFromCard(card, category);

    // Send to backend
    this.sendMessage({
      type: 'speak_card',
      text,
      category
    });

    this.setState('speaking');
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
   * Connect to backend WebSocket
   */
  private connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Determine WebSocket URL based on API URL or default to backend port
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = new URL(apiUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = url.hostname;
        const port = url.port || (protocol === 'wss:' ? '443' : '80');

        const wsUrl = `${protocol}//${host}:${port}/api/voice`;
        console.log('[Voice] Connecting to:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Voice WebSocket connected');
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ServerMessage;
            this.handleServerMessage(message, resolve);
          } catch (err) {
            console.error('Failed to parse server message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('Voice WebSocket error:', err);
          this.onError?.('Failed to connect to voice server');
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('Voice WebSocket closed');
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
        console.error('Failed to create WebSocket:', err);
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
        // Playback state change will handle transition
        break;

      case 'transcript':
        if (message.text && message.role) {
          this.onTranscript?.(message.text, message.role);
        }
        break;

      case 'error':
        console.error('Voice server error:', message.message);
        this.onError?.(message.message || 'Unknown error');
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
   * Send audio chunk to server
   */
  private sendAudioChunk(chunk: string): void {
    this.sendMessage({
      type: 'audio_chunk',
      audio: chunk
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
  private extractTextFromCard(card: CardData, category: string): string {
    const parts: string[] = [];

    // Add category context
    parts.push(`Here's a ${category} question.`);

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

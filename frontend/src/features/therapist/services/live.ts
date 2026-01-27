/**
 * Therapist Live WebSocket Service
 * Handles real-time session monitoring for therapists
 */

import type { LiveSessionInfo } from './api';

// WebSocket message types (matching backend)
export interface LiveCardEvent {
  sessionId: number;
  cardCategory: string;
  cardQuestion: string;
  cardShownAt: string;
}

export interface LiveResponseEvent {
  sessionId: number;
  childResponse: string | null;
  isCorrect: boolean;
  safetyLevel: number;
  signalsDetected: string[];
  responseAt: string;
  timeSpentSeconds: number | null;
}

export interface LiveSafetyAlert {
  sessionId: number;
  safetyLevel: number;
  signals: string[];
  timestamp: string;
}

export interface SessionSummary {
  sessionId: number;
  duration: number;
  totalCards: number;
  correctResponses: number;
  accuracyPercent: number;
  finalScore: number;
  finalPosition: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export type TherapistLiveMessage =
  | { type: 'session_started'; session: LiveSessionInfo }
  | { type: 'card_shown'; data: LiveCardEvent }
  | { type: 'child_response'; data: LiveResponseEvent }
  | { type: 'safety_alert'; data: LiveSafetyAlert }
  | { type: 'session_ended'; data: SessionSummary }
  | { type: 'active_sessions'; sessions: LiveSessionInfo[] }
  | { type: 'error'; message: string };

export interface TherapistLiveCallbacks {
  onSessionStarted?: (session: LiveSessionInfo) => void;
  onCardShown?: (data: LiveCardEvent) => void;
  onChildResponse?: (data: LiveResponseEvent) => void;
  onSafetyAlert?: (data: LiveSafetyAlert) => void;
  onSessionEnded?: (data: SessionSummary) => void;
  onActiveSessions?: (sessions: LiveSessionInfo[]) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

class TherapistLiveService {
  private ws: WebSocket | null = null;
  private callbacks: TherapistLiveCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private token: string | null = null;

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;

    // Determine WebSocket URL:
    // - In production: use current page origin (same host)
    // - In development: connect directly to backend (bypass Vite proxy for WebSocket)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    let wsUrl: string;
    if (isLocalhost) {
      // Local development - connect directly to backend
      wsUrl = `ws://localhost:3000/api/therapist/live?token=${encodeURIComponent(token)}`;
    } else {
      // Production - use same origin as the page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/therapist/live?token=${encodeURIComponent(token)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[TherapistLive] Connected');
        this.reconnectAttempts = 0;
        this.callbacks.onConnected?.();
        // Subscribe to updates
        this.send({ type: 'subscribe' });
        // Request active sessions
        this.send({ type: 'get_active_sessions' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as TherapistLiveMessage;
          this.handleMessage(message);
        } catch (err) {
          console.error('[TherapistLive] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[TherapistLive] Disconnected');
        this.ws = null;
        this.callbacks.onDisconnected?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[TherapistLive] WebSocket error:', error);
      };
    } catch (err) {
      console.error('[TherapistLive] Failed to connect:', err);
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`[TherapistLive] Reconnecting (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: TherapistLiveMessage): void {
    switch (message.type) {
      case 'session_started':
        console.log('[TherapistLive] Session started:', message.session);
        this.callbacks.onSessionStarted?.(message.session);
        break;

      case 'card_shown':
        console.log('[TherapistLive] Card shown:', message.data);
        this.callbacks.onCardShown?.(message.data);
        break;

      case 'child_response':
        console.log('[TherapistLive] Child response:', message.data);
        this.callbacks.onChildResponse?.(message.data);
        break;

      case 'safety_alert':
        console.log('[TherapistLive] Safety alert:', message.data);
        this.callbacks.onSafetyAlert?.(message.data);
        break;

      case 'session_ended':
        console.log('[TherapistLive] Session ended:', message.data);
        this.callbacks.onSessionEnded?.(message.data);
        break;

      case 'active_sessions':
        console.log('[TherapistLive] Active sessions:', message.sessions);
        this.callbacks.onActiveSessions?.(message.sessions);
        break;

      case 'error':
        console.error('[TherapistLive] Error:', message.message);
        this.callbacks.onError?.(message.message);
        break;
    }
  }

  setCallbacks(callbacks: TherapistLiveCallbacks): void {
    this.callbacks = callbacks;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  requestActiveSessions(): void {
    this.send({ type: 'get_active_sessions' });
  }
}

export const therapistLiveService = new TherapistLiveService();

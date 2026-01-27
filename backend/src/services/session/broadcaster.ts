/**
 * Live Session Broadcaster
 * Broadcasts session events to subscribed therapist WebSockets
 */

import WebSocket from 'ws';
import type {
  LiveSessionInfo,
  LiveCardEvent,
  LiveResponseEvent,
  LiveSafetyAlert,
  SessionSummary,
  TherapistLiveMessage,
  GameplaySession,
} from '../../types/index.js';
import type { Child } from '../../types/student.js';
import { logger } from '../../utils/logger.js';

class LiveSessionBroadcaster {
  // Map of therapistId -> Set of connected WebSockets
  private therapistConnections: Map<number, Set<WebSocket>> = new Map();

  /**
   * Subscribe a therapist to receive live updates
   */
  subscribeTherapist(therapistId: number, ws: WebSocket): void {
    if (!this.therapistConnections.has(therapistId)) {
      this.therapistConnections.set(therapistId, new Set());
    }
    this.therapistConnections.get(therapistId)!.add(ws);
    logger.info(`Therapist ${therapistId} subscribed to live updates`);

    // Clean up on close
    ws.on('close', () => {
      this.unsubscribeTherapist(therapistId, ws);
    });
  }

  /**
   * Unsubscribe a therapist from live updates
   */
  unsubscribeTherapist(therapistId: number, ws: WebSocket): void {
    const connections = this.therapistConnections.get(therapistId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.therapistConnections.delete(therapistId);
      }
      logger.info(`Therapist ${therapistId} unsubscribed from live updates`);
    }
  }

  /**
   * Check if a therapist has any active connections
   */
  hasConnections(therapistId: number): boolean {
    const connections = this.therapistConnections.get(therapistId);
    return connections ? connections.size > 0 : false;
  }

  /**
   * Send a message to all connected WebSockets for a therapist
   */
  private broadcast(therapistId: number, message: TherapistLiveMessage): void {
    const connections = this.therapistConnections.get(therapistId);
    if (!connections || connections.size === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    const deadConnections: WebSocket[] = [];

    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        deadConnections.push(ws);
      }
    }

    // Clean up dead connections
    for (const ws of deadConnections) {
      connections.delete(ws);
    }
  }

  /**
   * Broadcast session started event
   */
  broadcastSessionStart(
    therapistId: number,
    session: GameplaySession,
    child: Child
  ): void {
    const sessionInfo: LiveSessionInfo = {
      sessionId: session.id,
      childId: session.child_id,
      childName: `${child.first_name} ${child.last_name}`,
      startedAt: session.started_at,
      categoriesSelected: JSON.parse(session.categories_selected),
      theme: session.theme,
      currentScore: session.final_score,
      currentPosition: session.final_board_position,
      cardsPlayed: session.total_cards_played,
      correctResponses: session.correct_responses,
      status: session.status,
    };

    this.broadcast(therapistId, {
      type: 'session_started',
      session: sessionInfo,
    });

    logger.debug(`Broadcasted session_started for session ${session.id}`);
  }

  /**
   * Broadcast card shown event
   */
  broadcastCardShown(
    therapistId: number,
    sessionId: number,
    cardCategory: string,
    cardQuestion: string
  ): void {
    const data: LiveCardEvent = {
      sessionId,
      cardCategory,
      cardQuestion,
      cardShownAt: new Date().toISOString(),
    };

    this.broadcast(therapistId, {
      type: 'card_shown',
      data,
    });

    logger.debug(`Broadcasted card_shown for session ${sessionId}`);
  }

  /**
   * Broadcast child response event
   */
  broadcastResponse(
    therapistId: number,
    sessionId: number,
    childResponse: string | null,
    isCorrect: boolean,
    safetyLevel: number,
    signalsDetected: string[],
    timeSpentSeconds: number | null
  ): void {
    const data: LiveResponseEvent = {
      sessionId,
      childResponse,
      isCorrect,
      safetyLevel,
      signalsDetected,
      responseAt: new Date().toISOString(),
      timeSpentSeconds,
    };

    this.broadcast(therapistId, {
      type: 'child_response',
      data,
    });

    logger.debug(`Broadcasted child_response for session ${sessionId}`);
  }

  /**
   * Broadcast safety alert event
   */
  broadcastSafetyAlert(
    therapistId: number,
    sessionId: number,
    safetyLevel: number,
    signals: string[]
  ): void {
    const data: LiveSafetyAlert = {
      sessionId,
      safetyLevel,
      signals,
      timestamp: new Date().toISOString(),
    };

    this.broadcast(therapistId, {
      type: 'safety_alert',
      data,
    });

    logger.debug(`Broadcasted safety_alert for session ${sessionId}`);
  }

  /**
   * Broadcast session ended event
   */
  broadcastSessionEnd(
    therapistId: number,
    session: GameplaySession
  ): void {
    const accuracyPercent =
      session.total_cards_played > 0
        ? Math.round((session.correct_responses / session.total_cards_played) * 100)
        : 0;

    const data: SessionSummary = {
      sessionId: session.id,
      duration: session.duration_seconds || 0,
      totalCards: session.total_cards_played,
      correctResponses: session.correct_responses,
      accuracyPercent,
      finalScore: session.final_score,
      finalPosition: session.final_board_position,
      status: session.status,
    };

    this.broadcast(therapistId, {
      type: 'session_ended',
      data,
    });

    logger.debug(`Broadcasted session_ended for session ${session.id}`);
  }

  /**
   * Send active sessions list to a specific WebSocket
   */
  sendActiveSessions(ws: WebSocket, sessions: LiveSessionInfo[]): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'active_sessions',
        sessions,
      } as TherapistLiveMessage));
    }
  }

  /**
   * Send error message to a specific WebSocket
   */
  sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message,
      } as TherapistLiveMessage));
    }
  }
}

// Export singleton instance
export const liveSessionBroadcaster = new LiveSessionBroadcaster();
export default liveSessionBroadcaster;

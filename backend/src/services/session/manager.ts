/**
 * Gameplay Session Manager
 * Orchestrates gameplay sessions and integrates with voice sessions
 */

import * as repository from './repository.js';
import { liveSessionBroadcaster } from './broadcaster.js';
import type {
  GameplaySession,
  LiveSessionInfo,
  RecordResponseRequest,
} from '../../types/index.js';
import type { Child } from '../../types/student.js';
import { Intervention, type CardContext, type SafetyGateResult, type Signal } from '../../types/safety-gate.js';
import { getStudentById } from '../student/student.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

interface ActiveSessionLink {
  gameplaySessionId: number;
  childId: number;
  therapistId: number;
  currentCardCategory?: string;
  currentCardQuestion?: string;
  currentCardStartTime?: number;
}

class GameplaySessionManager {
  // Map voiceSessionId -> gameplay session link
  private activeLinks: Map<string, ActiveSessionLink> = new Map();

  /**
   * Start a new gameplay session when child logs in and starts game
   */
  async startGameplaySession(
    voiceSessionId: string,
    childId: number,
    categories: string[],
    theme?: string,
    character?: string
  ): Promise<GameplaySession> {
    // Get child info to find therapist
    const child = getStudentById(childId);
    if (!child) {
      throw new Error(`Child ${childId} not found`);
    }

    // Abandon any existing in-progress sessions for this child
    repository.abandonActiveSessions(childId);

    // Create new session
    const session = repository.createSession(
      childId,
      child.therapist_id,
      categories,
      theme,
      character
    );

    // Link voice session to gameplay session
    this.activeLinks.set(voiceSessionId, {
      gameplaySessionId: session.id,
      childId,
      therapistId: child.therapist_id,
    });

    // Broadcast to therapist
    liveSessionBroadcaster.broadcastSessionStart(child.therapist_id, session, child);

    logger.info(`Started gameplay session ${session.id} for child ${childId}, linked to voice session ${voiceSessionId}`);

    return session;
  }

  /**
   * Link an existing voice session to a gameplay session
   * (Used when voice session exists before gameplay starts)
   */
  linkVoiceSession(
    voiceSessionId: string,
    gameplaySessionId: number,
    childId: number,
    therapistId: number
  ): void {
    this.activeLinks.set(voiceSessionId, {
      gameplaySessionId,
      childId,
      therapistId,
    });
    logger.debug(`Linked voice session ${voiceSessionId} to gameplay session ${gameplaySessionId}`);
  }

  /**
   * Called when a new card is shown to the child
   */
  onCardShown(voiceSessionId: string, cardContext: CardContext): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) {
      logger.debug(`No gameplay session linked to voice session ${voiceSessionId}`);
      return;
    }

    // Update current card tracking
    link.currentCardCategory = cardContext.category;
    link.currentCardQuestion = cardContext.question;
    link.currentCardStartTime = Date.now();

    // Broadcast to therapist
    liveSessionBroadcaster.broadcastCardShown(
      link.therapistId,
      link.gameplaySessionId,
      cardContext.category,
      cardContext.question
    );
  }

  /**
   * Called when child's response is processed through safety-gate
   */
  onResponseProcessed(
    voiceSessionId: string,
    transcription: string,
    result: SafetyGateResult
  ): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) {
      logger.debug(`No gameplay session linked to voice session ${voiceSessionId}`);
      return;
    }

    // Calculate time spent on card
    let timeSpentSeconds: number | undefined;
    if (link.currentCardStartTime) {
      timeSpentSeconds = Math.round((Date.now() - link.currentCardStartTime) / 1000);
    }

    // Extract signals from result
    const signals: string[] = result.uiPackage.overlay.signals.map(s => s.toString());
    const safetyLevel = result.uiPackage.overlay.safetyLevel;

    // Record response in database
    const responseData: RecordResponseRequest = {
      cardCategory: link.currentCardCategory || 'unknown',
      cardQuestion: link.currentCardQuestion || 'unknown',
      childResponse: transcription,
      isCorrect: result.isCorrect,
      attemptNumber: result.uiPackage.attemptNumber || 1,
      timeSpentSeconds,
      safetyLevel,
      signalsDetected: signals,
    };

    repository.recordResponse(link.gameplaySessionId, responseData);

    // Broadcast response to therapist
    liveSessionBroadcaster.broadcastResponse(
      link.therapistId,
      link.gameplaySessionId,
      transcription,
      result.isCorrect,
      safetyLevel,
      signals,
      timeSpentSeconds || null
    );

    // If safety level is elevated, also send safety alert
    if (safetyLevel >= config.safetyGate.alertThreshold || signals.length > 0) {
      liveSessionBroadcaster.broadcastSafetyAlert(
        link.therapistId,
        link.gameplaySessionId,
        safetyLevel,
        signals
      );
    }

    // Only clear card tracking when moving to next card (correct answer or skip)
    // Keep card context on retries so subsequent attempts are recorded correctly
    const isSkipping = result.uiPackage.interventions.includes(Intervention.SKIP_CARD);
    if (result.isCorrect || isSkipping) {
      link.currentCardCategory = undefined;
      link.currentCardQuestion = undefined;
      link.currentCardStartTime = undefined;
    }
  }

  /**
   * Called when child selects an intervention (SKIP_CARD, RETRY_CARD, etc.)
   */
  onInterventionChosen(voiceSessionId: string, intervention: string): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) {
      logger.debug(`No gameplay session linked to voice session ${voiceSessionId}`);
      return;
    }

    // Update the most recent response with the chosen intervention
    repository.updateLastResponseIntervention(link.gameplaySessionId, intervention);
    logger.debug(`Recorded intervention ${intervention} for session ${link.gameplaySessionId}`);
  }

  /**
   * Update session progress (score, position)
   */
  updateProgress(
    voiceSessionId: string,
    score: number,
    position: number
  ): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) return;

    const session = repository.getSessionById(link.gameplaySessionId);
    if (session) {
      repository.updateSessionProgress(
        link.gameplaySessionId,
        score,
        position,
        session.total_cards_played,
        session.correct_responses
      );
    }
  }

  /**
   * End a gameplay session
   */
  endGameplaySession(
    voiceSessionId: string,
    finalScore: number,
    finalPosition: number,
    status: 'completed' | 'abandoned' = 'completed'
  ): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) {
      logger.debug(`No gameplay session linked to voice session ${voiceSessionId}`);
      return;
    }

    // End session in database
    repository.endSession(link.gameplaySessionId, status, finalScore, finalPosition);

    // Get updated session for broadcast
    const session = repository.getSessionById(link.gameplaySessionId);
    if (session) {
      liveSessionBroadcaster.broadcastSessionEnd(link.therapistId, session);
    }

    // Remove link
    this.activeLinks.delete(voiceSessionId);

    logger.info(`Ended gameplay session ${link.gameplaySessionId} with status ${status}`);
  }

  /**
   * Handle voice session disconnect (abandon session if still in progress)
   */
  onVoiceSessionDisconnect(voiceSessionId: string): void {
    const link = this.activeLinks.get(voiceSessionId);
    if (!link) return;

    // Check if session is still in progress
    const session = repository.getSessionById(link.gameplaySessionId);
    if (session && session.status === 'in_progress') {
      this.endGameplaySession(
        voiceSessionId,
        session.final_score,
        session.final_board_position,
        'abandoned'
      );
    } else {
      // Just clean up the link
      this.activeLinks.delete(voiceSessionId);
    }
  }

  /**
   * Get gameplay session ID for a voice session
   */
  getGameplaySessionId(voiceSessionId: string): number | null {
    const link = this.activeLinks.get(voiceSessionId);
    return link?.gameplaySessionId || null;
  }

  /**
   * Get active sessions info for a therapist
   */
  getActiveSessionsForTherapist(therapistId: number): LiveSessionInfo[] {
    const sessions = repository.getActiveSessionsForTherapist(therapistId);

    return sessions.map(session => {
      const child = getStudentById(session.child_id);
      return {
        sessionId: session.id,
        childId: session.child_id,
        childName: child ? `${child.first_name} ${child.last_name}` : 'Unknown',
        startedAt: session.started_at,
        categoriesSelected: JSON.parse(session.categories_selected),
        theme: session.theme,
        currentScore: session.final_score,
        currentPosition: session.final_board_position,
        cardsPlayed: session.total_cards_played,
        correctResponses: session.correct_responses,
        status: session.status,
      };
    });
  }

  /**
   * Check if a child has an active session
   */
  hasActiveSession(childId: number): boolean {
    const session = repository.getActiveSessionByChild(childId);
    return session !== null;
  }
}

// Export singleton instance
export const gameplaySessionManager = new GameplaySessionManager();
export default gameplaySessionManager;

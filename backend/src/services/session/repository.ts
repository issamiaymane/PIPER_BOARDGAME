/**
 * Session Repository
 * Database operations for gameplay sessions and responses
 */

import { getDatabase } from '../database.js';
import type {
  GameplaySession,
  SessionResponse,
  SessionStatus,
  RecordResponseRequest,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { SCORE_CORRECT_ANSWER } from '../../constants/game.js';

/**
 * Create a new gameplay session
 */
export function createSession(
  childId: number,
  therapistId: number,
  categories: string[],
  theme?: string,
  character?: string
): GameplaySession {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO gameplay_sessions (
      child_id, therapist_id, categories_selected, theme, character, started_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    childId,
    therapistId,
    JSON.stringify(categories),
    theme || null,
    character || null,
    now
  );

  const sessionId = result.lastInsertRowid as number;
  logger.info(`Created gameplay session ${sessionId} for child ${childId}`);

  return getSessionById(sessionId)!;
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: number): GameplaySession | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM gameplay_sessions WHERE id = ?').get(sessionId);
  return row as GameplaySession | null;
}

/**
 * Get active session for a child (there should only be one)
 */
export function getActiveSessionByChild(childId: number): GameplaySession | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM gameplay_sessions
    WHERE child_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
  `).get(childId);
  return row as GameplaySession | null;
}

/**
 * Get all active sessions for a therapist's children
 */
export function getActiveSessionsForTherapist(therapistId: number): GameplaySession[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM gameplay_sessions
    WHERE therapist_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC
  `).all(therapistId);
  return rows as GameplaySession[];
}

/**
 * Get session history for a child
 */
export function getSessionHistoryByChild(
  childId: number,
  limit: number = 20
): GameplaySession[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM gameplay_sessions
    WHERE child_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `).all(childId, limit);
  return rows as GameplaySession[];
}

/**
 * Get session history for a therapist (all their children)
 */
export function getSessionHistoryForTherapist(
  therapistId: number,
  limit: number = 50
): GameplaySession[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM gameplay_sessions
    WHERE therapist_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `).all(therapistId, limit);
  return rows as GameplaySession[];
}

/**
 * Update session score and position (during gameplay)
 */
export function updateSessionProgress(
  sessionId: number,
  score: number,
  position: number,
  cardsPlayed: number,
  correctResponses: number
): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE gameplay_sessions
    SET final_score = ?, final_board_position = ?,
        total_cards_played = ?, correct_responses = ?
    WHERE id = ?
  `).run(score, position, cardsPlayed, correctResponses, sessionId);
}

/**
 * End a session
 */
export function endSession(
  sessionId: number,
  status: 'completed' | 'abandoned',
  finalScore: number,
  finalPosition: number
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Get session start time to calculate duration
  const session = getSessionById(sessionId);
  let durationSeconds: number | null = null;

  if (session) {
    const startTime = new Date(session.started_at).getTime();
    const endTime = new Date(now).getTime();
    durationSeconds = Math.round((endTime - startTime) / 1000);
  }

  db.prepare(`
    UPDATE gameplay_sessions
    SET status = ?, ended_at = ?, duration_seconds = ?,
        final_score = ?, final_board_position = ?
    WHERE id = ?
  `).run(status, now, durationSeconds, finalScore, finalPosition, sessionId);

  logger.info(`Ended session ${sessionId} with status ${status}`);
}

/**
 * Abandon any in-progress sessions for a child
 */
export function abandonActiveSessions(childId: number): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE gameplay_sessions
    SET status = 'abandoned', ended_at = ?
    WHERE child_id = ? AND status = 'in_progress'
  `).run(now, childId);

  if (result.changes > 0) {
    logger.info(`Abandoned ${result.changes} active sessions for child ${childId}`);
  }

  return result.changes;
}

/**
 * Record a response to a card
 */
export function recordResponse(
  sessionId: number,
  data: RecordResponseRequest
): SessionResponse {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO session_responses (
      session_id, card_category, card_question, child_response,
      is_correct, attempt_number, card_shown_at, response_at,
      time_spent_seconds, safety_level, signals_detected
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    data.cardCategory,
    data.cardQuestion,
    data.childResponse,
    data.isCorrect ? 1 : 0,
    data.attemptNumber || 1,
    now, // card_shown_at - we record when response comes in
    now, // response_at
    data.timeSpentSeconds || null,
    data.safetyLevel || 0,
    data.signalsDetected ? JSON.stringify(data.signalsDetected) : null
  );

  const responseId = result.lastInsertRowid as number;

  // Update session totals
  const session = getSessionById(sessionId);
  if (session) {
    updateSessionProgress(
      sessionId,
      session.final_score + (data.isCorrect ? SCORE_CORRECT_ANSWER : 0),
      session.final_board_position,
      session.total_cards_played + 1,
      session.correct_responses + (data.isCorrect ? 1 : 0)
    );
  }

  return getResponseById(responseId)!;
}

/**
 * Get response by ID
 */
export function getResponseById(responseId: number): SessionResponse | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM session_responses WHERE id = ?').get(responseId);
  return row as SessionResponse | null;
}

/**
 * Get all responses for a session
 */
export function getResponsesBySession(sessionId: number): SessionResponse[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM session_responses
    WHERE session_id = ?
    ORDER BY card_shown_at ASC
  `).all(sessionId);
  return rows as SessionResponse[];
}

/**
 * Get session with all its responses
 */
export function getSessionWithResponses(sessionId: number): {
  session: GameplaySession;
  responses: SessionResponse[];
} | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const responses = getResponsesBySession(sessionId);
  return { session, responses };
}

/**
 * Get response count for a session
 */
export function getResponseCount(sessionId: number): number {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM session_responses WHERE session_id = ?
  `).get(sessionId) as { count: number };
  return result.count;
}

/**
 * Update the intervention chosen for the most recent response in a session
 */
export function updateLastResponseIntervention(
  sessionId: number,
  intervention: string
): void {
  const db = getDatabase();

  // Get the most recent response for this session
  const lastResponse = db.prepare(`
    SELECT id FROM session_responses
    WHERE session_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(sessionId) as { id: number } | undefined;

  if (lastResponse) {
    db.prepare(`
      UPDATE session_responses
      SET intervention_chosen = ?
      WHERE id = ?
    `).run(intervention, lastResponse.id);

    logger.debug(`Updated intervention for response ${lastResponse.id}: ${intervention}`);
  }
}

/**
 * Delete a session and all its responses (for cleanup)
 */
export function deleteSession(sessionId: number): boolean {
  const db = getDatabase();

  // Responses are deleted via CASCADE
  const result = db.prepare('DELETE FROM gameplay_sessions WHERE id = ?').run(sessionId);

  if (result.changes > 0) {
    logger.info(`Deleted session ${sessionId}`);
    return true;
  }
  return false;
}

export default {
  createSession,
  getSessionById,
  getActiveSessionByChild,
  getActiveSessionsForTherapist,
  getSessionHistoryByChild,
  getSessionHistoryForTherapist,
  updateSessionProgress,
  endSession,
  abandonActiveSessions,
  recordResponse,
  getResponseById,
  getResponsesBySession,
  getSessionWithResponses,
  getResponseCount,
  updateLastResponseIntervention,
  deleteSession,
};

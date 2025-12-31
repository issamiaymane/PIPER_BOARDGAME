/**
 * PIPER Session Service
 * Handles therapy session management
 */

import { execute, queryAll, queryOne } from '../database';
import {
  Session,
  Trial,
  StartSessionRequest,
  StartSessionResponse,
  RecordTrialRequest,
  EndSessionResponse,
  PromptLevel,
  SessionAccuracyHistory,
  SaveSessionSOAPRequest,
} from '../../../types/piper';
import { getStudentByIdForTherapist } from '../students/student.service';
import { getGoalForTherapist, parseMappedCategories } from '../goals/goal.service';
import { evaluateThresholds } from '../goals/threshold.service';
import { logger } from '../../../utils/logger';

/**
 * Start a new therapy session
 */
export function startSession(
  therapist_id: number,
  data: StartSessionRequest
): StartSessionResponse {
  // Verify student access
  const student = getStudentByIdForTherapist(data.student_id, therapist_id);
  if (!student) {
    throw new Error('Student not found or access denied');
  }

  let prompt_level: PromptLevel = 2; // Default MOD
  let categories: string[] = [];

  // If goal specified, get its prompt level and categories
  if (data.iep_goal_id) {
    const goal = getGoalForTherapist(data.iep_goal_id, therapist_id);
    if (!goal) {
      throw new Error('Goal not found or access denied');
    }
    prompt_level = goal.current_prompt_level as PromptLevel;
    categories = parseMappedCategories(goal);
  } else if (student.eval_data) {
    // Use student's initial prompt level from eval data if no goal
    try {
      const evalData = typeof student.eval_data === 'string'
        ? JSON.parse(student.eval_data)
        : student.eval_data;
      if (evalData.initial_prompt_level) {
        prompt_level = evalData.initial_prompt_level as PromptLevel;
      }
    } catch (e) {
      // Keep default if eval_data is invalid
    }
  }

  // Create session
  const result = execute(
    `INSERT INTO sessions (student_id, therapist_id, iep_goal_id, prompt_level_used)
     VALUES (?, ?, ?, ?)`,
    [data.student_id, therapist_id, data.iep_goal_id || null, prompt_level]
  );

  const session_id = result.lastInsertRowid as number;

  logger.info(`Session started: ID ${session_id} for student ${data.student_id}`);

  return {
    session_id,
    prompt_level,
    categories,
  };
}

/**
 * Get session by ID
 */
export function getSessionById(id: number): Session | null {
  const session = queryOne<Session>(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  return session || null;
}

/**
 * Get session with ownership verification
 */
export function getSessionForTherapist(
  id: number,
  therapist_id: number
): Session | null {
  const session = queryOne<Session>(
    'SELECT * FROM sessions WHERE id = ? AND therapist_id = ?',
    [id, therapist_id]
  );
  return session || null;
}

/**
 * Record a trial result
 */
export function recordTrial(
  session_id: number,
  therapist_id: number,
  data: RecordTrialRequest
): Trial {
  // Verify session access
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session) {
    throw new Error('Session not found or access denied');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Cannot add trials to completed session');
  }

  // Insert trial
  const result = execute(
    `INSERT INTO trials (session_id, card_category, card_data, user_answer, is_correct, prompt_level, response_time_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      session_id,
      data.card_category,
      data.card_data,
      data.user_answer || null,
      data.is_correct ? 1 : 0,
      session.prompt_level_used,
      data.response_time_ms || null,
    ]
  );

  // Update session counts
  const correctIncrement = data.is_correct ? 1 : 0;
  execute(
    `UPDATE sessions
     SET total_trials = total_trials + 1,
         correct_trials = correct_trials + ?
     WHERE id = ?`,
    [correctIncrement, session_id]
  );

  const trial = queryOne<Trial>(
    'SELECT * FROM trials WHERE id = ?',
    [result.lastInsertRowid]
  );

  if (!trial) {
    throw new Error('Failed to record trial');
  }

  return trial;
}

/**
 * Get all trials for a session
 */
export function getTrialsBySession(session_id: number): Trial[] {
  return queryAll<Trial>(
    'SELECT * FROM trials WHERE session_id = ? ORDER BY created_at',
    [session_id]
  );
}

/**
 * End a session and calculate final stats
 */
export async function endSession(
  session_id: number,
  therapist_id: number
): Promise<EndSessionResponse> {
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session) {
    throw new Error('Session not found or access denied');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Session already ended');
  }

  // Calculate accuracy
  const accuracy_percentage =
    session.total_trials > 0
      ? (session.correct_trials / session.total_trials) * 100
      : 0;

  // Update session
  execute(
    `UPDATE sessions
     SET status = 'completed',
         end_time = CURRENT_TIMESTAMP,
         accuracy_percentage = ?
     WHERE id = ?`,
    [accuracy_percentage, session_id]
  );

  // Get updated session
  const updatedSession = getSessionById(session_id);
  if (!updatedSession) {
    throw new Error('Failed to update session');
  }

  let threshold_result = undefined;

  // If session has a goal, record accuracy history and evaluate thresholds
  if (session.iep_goal_id) {
    // Get session number for this goal
    const sessionCount = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM session_accuracy_history
       WHERE iep_goal_id = ?`,
      [session.iep_goal_id]
    );
    const session_number = (sessionCount?.count || 0) + 1;

    // Record accuracy history
    execute(
      `INSERT INTO session_accuracy_history
       (student_id, iep_goal_id, session_id, accuracy_percentage, prompt_level, session_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.student_id,
        session.iep_goal_id,
        session_id,
        accuracy_percentage,
        session.prompt_level_used,
        session_number,
      ]
    );

    // Evaluate thresholds
    threshold_result = evaluateThresholds(session.iep_goal_id);
  }

  logger.info(
    `Session ended: ID ${session_id}, accuracy: ${accuracy_percentage.toFixed(1)}%`
  );

  return {
    session: updatedSession,
    accuracy_percentage,
    threshold_result,
  };
}

/**
 * Cancel a session
 */
export function cancelSession(
  session_id: number,
  therapist_id: number
): boolean {
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session || session.status !== 'in_progress') {
    return false;
  }

  execute(
    `UPDATE sessions SET status = 'cancelled', end_time = CURRENT_TIMESTAMP WHERE id = ?`,
    [session_id]
  );

  logger.info(`Session cancelled: ID ${session_id}`);
  return true;
}

/**
 * List sessions for a student
 */
export function listSessionsByStudent(
  student_id: number,
  therapist_id: number,
  limit: number = 20
): Session[] {
  return queryAll<Session>(
    `SELECT * FROM sessions
     WHERE student_id = ? AND therapist_id = ?
     ORDER BY start_time DESC
     LIMIT ?`,
    [student_id, therapist_id, limit]
  );
}

/**
 * List sessions for a goal
 */
export function listSessionsByGoal(
  goal_id: number,
  therapist_id: number
): Session[] {
  return queryAll<Session>(
    `SELECT s.* FROM sessions s
     JOIN students st ON s.student_id = st.id
     WHERE s.iep_goal_id = ? AND st.therapist_id = ?
     ORDER BY s.start_time DESC`,
    [goal_id, therapist_id]
  );
}

/**
 * Get session with trials
 */
export function getSessionWithTrials(
  session_id: number,
  therapist_id: number
): (Session & { trials: Trial[] }) | null {
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session) {
    return null;
  }

  const trials = getTrialsBySession(session_id);
  return { ...session, trials };
}

/**
 * Get running accuracy for current session
 */
export function getRunningAccuracy(session_id: number): {
  total: number;
  correct: number;
  accuracy: number;
} {
  const session = getSessionById(session_id);
  if (!session) {
    return { total: 0, correct: 0, accuracy: 0 };
  }

  const accuracy =
    session.total_trials > 0
      ? (session.correct_trials / session.total_trials) * 100
      : 0;

  return {
    total: session.total_trials,
    correct: session.correct_trials,
    accuracy,
  };
}

/**
 * Get accuracy history for a goal
 */
export function getAccuracyHistory(goal_id: number): SessionAccuracyHistory[] {
  return queryAll<SessionAccuracyHistory>(
    `SELECT * FROM session_accuracy_history
     WHERE iep_goal_id = ?
     ORDER BY session_number`,
    [goal_id]
  );
}

/**
 * Update session SOAP note fields
 */
export function updateSessionSOAP(
  session_id: number,
  therapist_id: number,
  soapData: SaveSessionSOAPRequest
): Session {
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session) {
    throw new Error('Session not found or access denied');
  }

  execute(
    `UPDATE sessions
     SET soap_subjective = ?,
         soap_objective = ?,
         soap_assessment = ?,
         soap_plan = ?
     WHERE id = ?`,
    [
      soapData.soap_subjective,
      soapData.soap_objective,
      soapData.soap_assessment,
      soapData.soap_plan,
      session_id,
    ]
  );

  const updatedSession = getSessionById(session_id);
  if (!updatedSession) {
    throw new Error('Failed to update session SOAP');
  }

  logger.info(`Session ${session_id} SOAP note updated`);
  return updatedSession;
}

/**
 * Mark session as reviewed by SLP
 */
export function updateSessionReview(
  session_id: number,
  therapist_id: number,
  reviewed: boolean
): Session {
  const session = getSessionForTherapist(session_id, therapist_id);
  if (!session) {
    throw new Error('Session not found or access denied');
  }

  execute(`UPDATE sessions SET slp_reviewed = ? WHERE id = ?`, [
    reviewed ? 1 : 0,
    session_id,
  ]);

  const updatedSession = getSessionById(session_id);
  if (!updatedSession) {
    throw new Error('Failed to update session review status');
  }

  logger.info(
    `Session ${session_id} review status updated to: ${reviewed ? 'reviewed' : 'not reviewed'}`
  );
  return updatedSession;
}

export default {
  startSession,
  getSessionById,
  getSessionForTherapist,
  recordTrial,
  getTrialsBySession,
  endSession,
  cancelSession,
  listSessionsByStudent,
  listSessionsByGoal,
  getSessionWithTrials,
  getRunningAccuracy,
  getAccuracyHistory,
  updateSessionSOAP,
  updateSessionReview,
};

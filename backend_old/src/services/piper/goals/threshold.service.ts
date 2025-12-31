/**
 * PIPER Threshold Service
 * Implements HAILEY automatic prompt level adjustment logic
 */

import { queryAll, queryOne } from '../database';
import {
  SessionAccuracyHistory,
  ThresholdResult,
  ThresholdStatus,
  PromptLevel,
  HAILEY_THRESHOLDS,
  PROMPT_LEVELS,
} from '../../../types/piper';
import { getGoalById, updatePromptLevel } from './goal.service';
import { logger } from '../../../utils/logger';

/**
 * Evaluate thresholds and potentially adjust prompt level
 * Called after each session ends
 */
export function evaluateThresholds(goal_id: number): ThresholdResult {
  const goal = getGoalById(goal_id);
  if (!goal) {
    return {
      adjusted: false,
      direction: 'maintain',
      old_level: 2,
      new_level: 2,
      reasoning: 'Goal not found',
    };
  }

  const currentLevel = goal.current_prompt_level as PromptLevel;

  // Get recent session history
  const history = queryAll<SessionAccuracyHistory>(
    `SELECT * FROM session_accuracy_history
     WHERE iep_goal_id = ?
     ORDER BY session_number DESC
     LIMIT ?`,
    [goal_id, HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM]
  );

  // Not enough sessions to evaluate
  if (history.length < HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM) {
    return {
      adjusted: false,
      direction: 'maintain',
      old_level: currentLevel,
      new_level: currentLevel,
      reasoning: `Need ${HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM} sessions to evaluate (have ${history.length})`,
    };
  }

  // Check if all recent sessions are at or above advance threshold (70%)
  const allAboveAdvance = history.every(
    (h) => h.accuracy_percentage >= HAILEY_THRESHOLDS.ADVANCE_ACCURACY
  );

  // Check if all recent sessions are below fallback threshold (50%)
  const allBelowFallback = history.every(
    (h) => h.accuracy_percentage < HAILEY_THRESHOLDS.FALLBACK_ACCURACY
  );

  // Can advance - reduce prompting (move toward MIN)
  if (allAboveAdvance && currentLevel < PROMPT_LEVELS.MIN) {
    const newLevel = (currentLevel + 1) as PromptLevel;
    updatePromptLevel(goal_id, newLevel);

    const result: ThresholdResult = {
      adjusted: true,
      direction: 'advance',
      old_level: currentLevel,
      new_level: newLevel,
      reasoning: `≥${HAILEY_THRESHOLDS.ADVANCE_ACCURACY}% accuracy for ${HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM} consecutive sessions - reducing prompt level`,
    };

    logger.info(`Goal ${goal_id}: Advancing prompt level ${currentLevel} → ${newLevel}`);
    return result;
  }

  // Need to fallback - increase prompting (move toward MAX)
  if (allBelowFallback && currentLevel > PROMPT_LEVELS.MAX) {
    const newLevel = (currentLevel - 1) as PromptLevel;
    updatePromptLevel(goal_id, newLevel);

    const result: ThresholdResult = {
      adjusted: true,
      direction: 'fallback',
      old_level: currentLevel,
      new_level: newLevel,
      reasoning: `<${HAILEY_THRESHOLDS.FALLBACK_ACCURACY}% accuracy for ${HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM} consecutive sessions - increasing prompt support`,
    };

    logger.info(`Goal ${goal_id}: Falling back prompt level ${currentLevel} → ${newLevel}`);
    return result;
  }

  // Already at MIN and performing well
  if (allAboveAdvance && currentLevel === PROMPT_LEVELS.MIN) {
    return {
      adjusted: false,
      direction: 'maintain',
      old_level: currentLevel,
      new_level: currentLevel,
      reasoning: `Already at minimum prompting with ≥${HAILEY_THRESHOLDS.ADVANCE_ACCURACY}% accuracy - consider goal mastery`,
    };
  }

  // Already at MAX and still struggling
  if (allBelowFallback && currentLevel === PROMPT_LEVELS.MAX) {
    return {
      adjusted: false,
      direction: 'maintain',
      old_level: currentLevel,
      new_level: currentLevel,
      reasoning: `Already at maximum prompting with <${HAILEY_THRESHOLDS.FALLBACK_ACCURACY}% accuracy - consider goal modification`,
    };
  }

  // No adjustment needed
  return {
    adjusted: false,
    direction: 'maintain',
    old_level: currentLevel,
    new_level: currentLevel,
    reasoning: 'Performance within expected range - maintaining current prompt level',
  };
}

/**
 * Get current threshold status for a goal
 * Useful for showing progress in UI
 */
export function getThresholdStatus(goal_id: number): ThresholdStatus {
  const history = queryAll<SessionAccuracyHistory>(
    `SELECT * FROM session_accuracy_history
     WHERE iep_goal_id = ?
     ORDER BY session_number DESC
     LIMIT ?`,
    [goal_id, HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM]
  );

  let sessions_above_advance = 0;
  let sessions_below_fallback = 0;

  for (const session of history) {
    if (session.accuracy_percentage >= HAILEY_THRESHOLDS.ADVANCE_ACCURACY) {
      sessions_above_advance++;
    }
    if (session.accuracy_percentage < HAILEY_THRESHOLDS.FALLBACK_ACCURACY) {
      sessions_below_fallback++;
    }
  }

  return {
    can_advance:
      sessions_above_advance >= HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM,
    at_risk_fallback:
      sessions_below_fallback >= HAILEY_THRESHOLDS.SESSIONS_TO_CONFIRM,
    sessions_above_advance,
    sessions_below_fallback,
  };
}

/**
 * Get recommended prompt level for next session
 */
export function getRecommendedPromptLevel(goal_id: number): {
  level: PromptLevel;
  reasoning: string;
} {
  const goal = getGoalById(goal_id);
  if (!goal) {
    return {
      level: PROMPT_LEVELS.MOD,
      reasoning: 'Goal not found - using default moderate prompting',
    };
  }

  const status = getThresholdStatus(goal_id);
  const currentLevel = goal.current_prompt_level as PromptLevel;

  // If about to advance, preview the new level
  if (status.can_advance && currentLevel < PROMPT_LEVELS.MIN) {
    return {
      level: currentLevel,
      reasoning: `Eligible for advancement after this session if ≥${HAILEY_THRESHOLDS.ADVANCE_ACCURACY}%`,
    };
  }

  // If at risk, warn
  if (status.at_risk_fallback && currentLevel > PROMPT_LEVELS.MAX) {
    return {
      level: currentLevel,
      reasoning: `At risk of fallback - focus on success with current prompting`,
    };
  }

  // Standard recommendation
  return {
    level: currentLevel,
    reasoning: `Continue with current prompt level`,
  };
}

/**
 * Calculate progress toward goal target
 */
export function calculateGoalProgress(goal_id: number): {
  current_accuracy: number;
  target_accuracy: number;
  progress_percentage: number;
  sessions_completed: number;
  sessions_required: number;
  has_active_session: boolean;
} {
  const goal = getGoalById(goal_id);
  if (!goal) {
    return {
      current_accuracy: 0,
      target_accuracy: 80,
      progress_percentage: 0,
      sessions_completed: 0,
      sessions_required: 3,
      has_active_session: false,
    };
  }

  // Get all completed sessions for this goal
  const history = queryAll<SessionAccuracyHistory>(
    `SELECT * FROM session_accuracy_history WHERE iep_goal_id = ?`,
    [goal_id]
  );

  const sessions_completed = history.length;

  // Check for any active (in_progress) sessions for this goal
  const activeSession = queryOne<{ id: number }>(
    `SELECT id FROM sessions WHERE iep_goal_id = ? AND status = 'in_progress' LIMIT 1`,
    [goal_id]
  );
  const has_active_session = !!activeSession;

  // Calculate average accuracy from recent sessions
  const recentSessions = history.slice(-goal.sessions_to_confirm);
  const current_accuracy =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) /
        recentSessions.length
      : 0;

  // Progress is how close current accuracy is to target
  const progress_percentage = Math.min(
    100,
    (current_accuracy / goal.target_percentage) * 100
  );

  return {
    current_accuracy,
    target_accuracy: goal.target_percentage,
    progress_percentage,
    sessions_completed,
    sessions_required: goal.sessions_to_confirm,
    has_active_session,
  };
}

export default {
  evaluateThresholds,
  getThresholdStatus,
  getRecommendedPromptLevel,
  calculateGoalProgress,
};

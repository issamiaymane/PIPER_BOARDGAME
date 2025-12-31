/**
 * PIPER Child Service
 * Handles child authentication and account management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { queryOne, queryAll, execute } from '../database';
import {
  Student,
  IEPGoal,
  ChildLoginRequest,
  ChildAuthResponse,
  ChildJWTPayload,
  PROMPT_LEVELS,
} from '../../../types/piper';
import { calculateGoalProgress } from '../goals/threshold.service';

const JWT_SECRET = process.env.JWT_SECRET || 'piper-child-secret-key';

/**
 * Check if a goal is mastered
 * Mastery = target accuracy met + at MIN prompt level + required sessions completed
 */
export function isGoalMastered(goal: IEPGoal): boolean {
  const progress = calculateGoalProgress(goal.id);

  const targetMet = progress.current_accuracy >= goal.target_percentage;
  const atMinPrompt = goal.current_prompt_level === PROMPT_LEVELS.MIN;
  const sessionsComplete = progress.sessions_completed >= goal.sessions_to_confirm;

  return targetMet && atMinPrompt && sessionsComplete;
}

/**
 * Add mastery status to goals
 */
function addMasteryStatusToGoals(goals: IEPGoal[]): (IEPGoal & { is_mastered: boolean })[] {
  return goals.map(goal => ({
    ...goal,
    is_mastered: isGoalMastered(goal),
  }));
}

/**
 * Child login
 */
export async function childLogin(
  credentials: ChildLoginRequest
): Promise<ChildAuthResponse> {
  const { username, password } = credentials;

  // Find child by username
  const child = queryOne<Student>(
    'SELECT * FROM students WHERE username = ?',
    [username]
  );

  if (!child || !child.password_hash) {
    throw new Error('Invalid username or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, child.password_hash);
  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  // Check if first login (show demo)
  const showDemo = child.has_seen_demo === 0;

  // Update last login
  execute('UPDATE students SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [
    child.id,
  ]);

  // Get child's active goals with mastery status
  const rawGoals = queryAll<IEPGoal>(
    'SELECT * FROM iep_goals WHERE student_id = ? AND is_active = 1',
    [child.id]
  );
  const goals = addMasteryStatusToGoals(rawGoals);

  // Generate JWT
  const payload: ChildJWTPayload = {
    child_id: child.id,
    username: child.username!,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  // Return without password_hash
  const { password_hash: _, ...childWithoutPassword } = child;

  return {
    token,
    child: childWithoutPassword as Omit<Student, 'password_hash'>,
    goals,
    show_demo: showDemo,
  };
}

/**
 * Mark demo as seen
 */
export function markDemoSeen(childId: number): void {
  execute('UPDATE students SET has_seen_demo = 1 WHERE id = ?', [childId]);
}

/**
 * Verify child JWT token
 */
export function verifyChildToken(token: string): ChildJWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as ChildJWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get child by ID (for authenticated requests)
 */
export function getChildById(childId: number): Omit<Student, 'password_hash'> | null {
  const child = queryOne<Student>('SELECT * FROM students WHERE id = ?', [
    childId,
  ]);

  if (!child) return null;

  const { password_hash: _, ...childWithoutPassword } = child;
  return childWithoutPassword as Omit<Student, 'password_hash'>;
}

/**
 * Get child's current session state (goals and progress)
 */
export function getChildSessionState(childId: number): {
  goals: (IEPGoal & { is_mastered: boolean })[];
  activeSession: { session_id: number; total_trials: number; correct_trials: number } | null;
  lastSessionAccuracy?: number;
} {
  // Get active goals with mastery status
  const rawGoals = queryAll<IEPGoal>(
    'SELECT * FROM iep_goals WHERE student_id = ? AND is_active = 1',
    [childId]
  );
  const goals = addMasteryStatusToGoals(rawGoals);

  // Check for in-progress session
  const activeSession = queryOne<{ id: number; total_trials: number; correct_trials: number }>(
    "SELECT id, total_trials, correct_trials FROM sessions WHERE student_id = ? AND status = 'in_progress' ORDER BY start_time DESC LIMIT 1",
    [childId]
  );

  // Get last completed session accuracy
  const lastSession = queryOne<{ accuracy_percentage: number }>(
    "SELECT accuracy_percentage FROM sessions WHERE student_id = ? AND status = 'completed' ORDER BY end_time DESC LIMIT 1",
    [childId]
  );

  return {
    goals,
    activeSession: activeSession ? {
      session_id: activeSession.id,
      total_trials: activeSession.total_trials,
      correct_trials: activeSession.correct_trials
    } : null,
    lastSessionAccuracy: lastSession?.accuracy_percentage,
  };
}

export default {
  childLogin,
  markDemoSeen,
  verifyChildToken,
  getChildById,
  getChildSessionState,
};

/**
 * Goal Service
 * Handles IEP goal CRUD operations
 */

import { getDatabase } from '../database.js';
import type { IEPGoal, CreateGoalRequest, UpdateGoalRequest } from '../../types/index.js';

function createGoal(studentId: number, data: CreateGoalRequest & {
  baseline?: string;
  sessions_to_confirm?: number;
  comments?: string;
  boardgame_categories?: string[];
  session_duration_minutes?: number;
  session_frequency?: string;
}): IEPGoal {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO iep_goals (
        student_id, goal_type, goal_description, target_percentage,
        current_percentage, target_date, baseline, sessions_to_confirm,
        comments, boardgame_categories, session_duration_minutes, session_frequency,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .run(
      studentId,
      data.goal_type,
      data.goal_description,
      data.target_percentage,
      data.current_percentage || 0,
      data.target_date || null,
      data.baseline || null,
      data.sessions_to_confirm || 3,
      data.comments || null,
      data.boardgame_categories ? JSON.stringify(data.boardgame_categories) : null,
      data.session_duration_minutes || null,
      data.session_frequency || null,
      now,
      now
    );

  const insertedId = result.lastInsertRowid as number;

  return getGoalById(insertedId)!;
}

// Articulation category names for inference
const ARTICULATION_CATEGORIES = [
  'Syllable Shapes', 'Phonology',
  'B Sound', 'CH Sound', 'D Sound', 'F Sound', 'G Sound', 'H Sound',
  'J Sound', 'K Sound', 'L Sound', 'L Blends Sound', 'M Sound', 'N Sound',
  'Ng Sound', 'P Sound', 'R Sound', 'R Blends Sound', 'S Sound',
  'S Blends Sound', 'Sh Sound', 'T Sound', 'Th Voiced Sound', 'Th Voiceless Sound',
  'V Sound', 'W Sound', 'Y Sound', 'Z Sound', 'Consonant Clusters', 'Vowels'
];

export function createGoalsFromExtraction(
  studentId: number,
  goals: Array<{
    goal_type: { value: string | null };
    goal_description: { value: string | null };
    target_percentage: { value: number | null };
    target_date: { value: string | null };
    baseline?: { value: string | null };
    deadline?: { value: string | null };
    sessions_to_confirm?: { value: number | null };
    comments?: { value: string | null };
    boardgame_categories?: { value: string[] | null };
    session_duration_minutes?: { value: number | null };
    session_frequency?: { value: string | null };
  }>
): IEPGoal[] {
  const createdGoals: IEPGoal[] = [];

  for (const goal of goals) {
    if (!goal.goal_description.value) {
      continue;
    }

    // Infer goal_type from boardgame_categories if not provided
    let goalType: 'language' | 'articulation' = 'language';

    if (goal.goal_type.value) {
      goalType = goal.goal_type.value as 'language' | 'articulation';
    } else if (goal.boardgame_categories?.value && goal.boardgame_categories.value.length > 0) {
      // Check if any category is an articulation category
      const hasArticulation = goal.boardgame_categories.value.some(cat =>
        ARTICULATION_CATEGORIES.includes(cat)
      );
      goalType = hasArticulation ? 'articulation' : 'language';
    }

    const goalData = {
      goal_type: goalType,
      goal_description: goal.goal_description.value,
      target_percentage: goal.target_percentage.value || 80,
      target_date: (goal.deadline?.value || goal.target_date.value) || undefined,
      baseline: goal.baseline?.value || undefined,
      sessions_to_confirm: goal.sessions_to_confirm?.value || undefined,
      comments: goal.comments?.value || undefined,
      boardgame_categories: goal.boardgame_categories?.value || undefined,
      session_duration_minutes: goal.session_duration_minutes?.value || undefined,
      session_frequency: goal.session_frequency?.value || undefined,
    };

    const created = createGoal(studentId, goalData);

    createdGoals.push(created);
  }

  return createdGoals;
}

export function getGoalById(id: number): IEPGoal | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM iep_goals WHERE id = ?')
    .get(id) as IEPGoal | undefined;
  return row || null;
}

export function getGoalForStudent(goalId: number, studentId: number): IEPGoal | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM iep_goals WHERE id = ? AND student_id = ?')
    .get(goalId, studentId) as IEPGoal | undefined;
  return row || null;
}

export function listGoalsByStudent(studentId: number): IEPGoal[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM iep_goals WHERE student_id = ? ORDER BY created_at DESC')
    .all(studentId) as IEPGoal[];
}

export function listActiveGoalsByStudent(studentId: number): IEPGoal[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM iep_goals WHERE student_id = ? AND status = 'active' ORDER BY created_at DESC")
    .all(studentId) as IEPGoal[];
}

export function updateGoal(id: number, studentId: number, data: UpdateGoalRequest): IEPGoal | null {
  const db = getDatabase();

  const existing = getGoalForStudent(id, studentId);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.goal_description !== undefined) {
    updates.push('goal_description = ?');
    values.push(data.goal_description);
  }
  if (data.target_percentage !== undefined) {
    updates.push('target_percentage = ?');
    values.push(data.target_percentage);
  }
  if (data.current_percentage !== undefined) {
    updates.push('current_percentage = ?');
    values.push(data.current_percentage);
  }
  if (data.target_date !== undefined) {
    updates.push('target_date = ?');
    values.push(data.target_date);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE iep_goals SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getGoalById(id);
}

export function deleteGoal(id: number, studentId: number): boolean {
  const db = getDatabase();
  const existing = getGoalForStudent(id, studentId);
  if (!existing) {
    return false;
  }
  db.prepare('DELETE FROM iep_goals WHERE id = ?').run(id);
  return true;
}

export function deleteAllGoalsForStudent(studentId: number): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM iep_goals WHERE student_id = ?').run(studentId);
  return result.changes;
}

export default {
  createGoalsFromExtraction,
  getGoalById,
  getGoalForStudent,
  listGoalsByStudent,
  listActiveGoalsByStudent,
  updateGoal,
  deleteGoal,
  deleteAllGoalsForStudent,
};

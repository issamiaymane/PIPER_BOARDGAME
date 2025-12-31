/**
 * PIPER Goal Service
 * Handles IEP goal CRUD operations and category mappings
 */

import { execute, queryAll, queryOne } from '../database';
import {
  IEPGoal,
  CreateIEPGoalRequest,
  UpdateIEPGoalRequest,
  IEPGoalType,
  IEP_GOAL_CATEGORY_MAPPINGS,
  PromptLevel,
  PROMPT_LEVELS,
} from '../../../types/piper';
import { getStudentByIdForTherapist } from '../students/student.service';
import { logger } from '../../../utils/logger';

/**
 * Create a new IEP goal
 */
export function createGoal(
  student_id: number,
  therapist_id: number,
  data: CreateIEPGoalRequest
): IEPGoal {
  // Verify student belongs to therapist
  const student = getStudentByIdForTherapist(student_id, therapist_id);
  if (!student) {
    throw new Error('Student not found or access denied');
  }

  // Get mapped categories - use goal_types array if provided, otherwise fall back to goal_type
  let mappedCategories: string[];
  if (data.goal_types && data.goal_types.length > 0) {
    // Multiple goal types provided - use them directly
    mappedCategories = data.goal_types;
  } else if (IEP_GOAL_CATEGORY_MAPPINGS[data.goal_type as IEPGoalType]) {
    // Legacy predefined goal type
    mappedCategories = IEP_GOAL_CATEGORY_MAPPINGS[data.goal_type as IEPGoalType];
  } else {
    // Direct category name - the goal_type IS the category
    mappedCategories = [data.goal_type];
  }

  const result = execute(
    `INSERT INTO iep_goals
     (student_id, goal_type, goal_description, target_percentage, sessions_to_confirm, current_prompt_level, mapped_categories, deadline, baseline, comments, slp_reviewed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      student_id,
      data.goal_type,
      data.goal_description,
      data.target_percentage,
      data.sessions_to_confirm,
      data.expected_prompt_level || PROMPT_LEVELS.MOD,
      JSON.stringify(mappedCategories),
      data.deadline || null,
      data.baseline || null,
      data.comments || null,
    ]
  );

  const goal = getGoalById(result.lastInsertRowid as number);
  if (!goal) {
    throw new Error('Failed to create goal');
  }

  logger.info(`IEP Goal created: ${data.goal_type} for student ${student_id} (ID: ${goal.id})`);
  return goal;
}

/**
 * Get goal by ID
 */
export function getGoalById(id: number): IEPGoal | null {
  const goal = queryOne<IEPGoal>(
    'SELECT * FROM iep_goals WHERE id = ?',
    [id]
  );
  return goal || null;
}

/**
 * Get goal by ID with ownership verification
 */
export function getGoalForTherapist(
  id: number,
  therapist_id: number
): IEPGoal | null {
  const goal = queryOne<IEPGoal>(
    `SELECT g.* FROM iep_goals g
     JOIN students s ON g.student_id = s.id
     WHERE g.id = ? AND s.therapist_id = ?`,
    [id, therapist_id]
  );
  return goal || null;
}

/**
 * List all goals for a student
 */
export function listGoalsByStudent(
  student_id: number,
  therapist_id: number,
  activeOnly: boolean = false
): IEPGoal[] {
  // Verify student belongs to therapist
  const student = getStudentByIdForTherapist(student_id, therapist_id);
  if (!student) {
    return [];
  }

  const whereClause = activeOnly
    ? 'WHERE student_id = ? AND is_active = 1'
    : 'WHERE student_id = ?';

  return queryAll<IEPGoal>(
    `SELECT * FROM iep_goals ${whereClause} ORDER BY created_at DESC`,
    [student_id]
  );
}

/**
 * Update a goal
 */
export function updateGoal(
  id: number,
  therapist_id: number,
  data: UpdateIEPGoalRequest
): IEPGoal | null {
  // Verify ownership
  const existing = getGoalForTherapist(id, therapist_id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  // Handle goal_types array (takes precedence) or single goal_type
  if (data.goal_types !== undefined && data.goal_types.length > 0) {
    // Multiple goal types provided
    updates.push('goal_type = ?');
    values.push(data.goal_types[0]); // Primary goal type is first in array
    updates.push('mapped_categories = ?');
    values.push(JSON.stringify(data.goal_types));
  } else if (data.goal_type !== undefined) {
    updates.push('goal_type = ?');
    values.push(data.goal_type);

    // Update mapped categories if goal type changed
    let mappedCategories: string[];
    if (IEP_GOAL_CATEGORY_MAPPINGS[data.goal_type as IEPGoalType]) {
      mappedCategories = IEP_GOAL_CATEGORY_MAPPINGS[data.goal_type as IEPGoalType];
    } else {
      mappedCategories = [data.goal_type];
    }
    updates.push('mapped_categories = ?');
    values.push(JSON.stringify(mappedCategories));
  }
  if (data.goal_description !== undefined) {
    updates.push('goal_description = ?');
    values.push(data.goal_description);
  }
  if (data.target_percentage !== undefined) {
    updates.push('target_percentage = ?');
    values.push(data.target_percentage);
  }
  if (data.sessions_to_confirm !== undefined) {
    updates.push('sessions_to_confirm = ?');
    values.push(data.sessions_to_confirm);
  }
  if (data.expected_prompt_level !== undefined) {
    updates.push('current_prompt_level = ?');
    values.push(data.expected_prompt_level);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }
  if (data.deadline !== undefined) {
    updates.push('deadline = ?');
    values.push(data.deadline);
  }
  if (data.baseline !== undefined) {
    updates.push('baseline = ?');
    values.push(data.baseline);
  }
  if (data.comments !== undefined) {
    updates.push('comments = ?');
    values.push(data.comments);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);
  execute(
    `UPDATE iep_goals SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  logger.info(`IEP Goal updated: ID ${id}`);
  return getGoalById(id);
}

/**
 * Delete a goal
 */
export function deleteGoal(id: number, therapist_id: number): boolean {
  const existing = getGoalForTherapist(id, therapist_id);
  if (!existing) {
    return false;
  }

  execute('DELETE FROM iep_goals WHERE id = ?', [id]);
  logger.info(`IEP Goal deleted: ID ${id}`);
  return true;
}

/**
 * Update prompt level for a goal
 */
export function updatePromptLevel(
  id: number,
  newLevel: PromptLevel
): IEPGoal | null {
  execute(
    'UPDATE iep_goals SET current_prompt_level = ? WHERE id = ?',
    [newLevel, id]
  );

  logger.info(`Goal ${id} prompt level updated to ${newLevel}`);
  return getGoalById(id);
}

/**
 * Get mapped categories for a goal type
 */
export function getCategoriesForGoalType(goalType: IEPGoalType): string[] {
  return IEP_GOAL_CATEGORY_MAPPINGS[goalType] || [];
}

/**
 * Parse mapped categories from JSON string
 */
export function parseMappedCategories(goal: IEPGoal): string[] {
  try {
    return JSON.parse(goal.mapped_categories);
  } catch {
    return [];
  }
}

/**
 * Get all active goals for a student with their categories
 */
export function getActiveGoalsWithCategories(
  student_id: number,
  therapist_id: number
): Array<IEPGoal & { categories: string[] }> {
  const goals = listGoalsByStudent(student_id, therapist_id, true);
  return goals.map((goal) => ({
    ...goal,
    categories: parseMappedCategories(goal),
  }));
}

/**
 * Mark a goal as SLP reviewed
 */
export function markGoalReviewed(
  id: number,
  therapist_id: number,
  reviewed: boolean = true
): IEPGoal | null {
  const existing = getGoalForTherapist(id, therapist_id);
  if (!existing) {
    return null;
  }

  execute(
    'UPDATE iep_goals SET slp_reviewed = ? WHERE id = ?',
    [reviewed ? 1 : 0, id]
  );

  logger.info(`Goal ${id} SLP review status updated to ${reviewed}`);
  return getGoalById(id);
}

export default {
  createGoal,
  getGoalById,
  getGoalForTherapist,
  listGoalsByStudent,
  updateGoal,
  deleteGoal,
  updatePromptLevel,
  getCategoriesForGoalType,
  parseMappedCategories,
  getActiveGoalsWithCategories,
  markGoalReviewed,
};

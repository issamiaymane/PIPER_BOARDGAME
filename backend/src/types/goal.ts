/**
 * Goal Types
 * Types for IEP goals management
 */

export type GoalType = 'language' | 'articulation';

export interface IEPGoal {
  id: number;
  student_id: number;
  goal_type: GoalType;
  goal_description: string;
  target_percentage: number;
  current_percentage?: number;
  target_date?: string;
  baseline?: string;
  sessions_to_confirm?: number;
  comments?: string;
  boardgame_categories?: string; // JSON string of array
  status: 'active' | 'achieved' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface CreateGoalRequest {
  goal_type: GoalType;
  goal_description: string;
  target_percentage: number;
  current_percentage?: number;
  target_date?: string;
}

export interface UpdateGoalRequest {
  goal_description?: string;
  target_percentage?: number;
  current_percentage?: number;
  target_date?: string;
  status?: 'active' | 'achieved' | 'discontinued';
}

export interface GoalExtractionResult {
  goals: Array<{
    goal_type: { value: GoalType | null; confidence: number };
    goal_description: { value: string | null; confidence: number };
    target_percentage: { value: number | null; confidence: number };
    target_date: { value: string | null; confidence: number };
    baseline?: { value: string | null; confidence: number };
    deadline?: { value: string | null; confidence: number };
    sessions_to_confirm?: { value: number | null; confidence: number };
    comments?: { value: string | null; confidence: number };
    boardgame_categories?: { value: string[] | null; confidence: number };
  }>;
  extraction_notes: string;
  // Session time from IEP document (document-level, applies to student)
  session_duration_minutes?: { value: number | null; confidence: number; source_hint?: string };
  session_frequency?: { value: string | null; confidence: number; source_hint?: string };
}

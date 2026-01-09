/**
 * Types Index
 * Re-exports all types for backward compatibility
 */

// Auth types
export type {
  RegisterRequest,
  LoginRequest,
  Therapist,
  TherapistAuthResult,
} from './auth.js';

// Student/Child types
export type {
  EvalData,
  Child,
  ChildLoginRequest,
  ChildAuthResult,
  CreateChildRequest,
  UpdateChildRequest,
} from './student.js';

// Evaluation types
export type {
  ExtractedField,
  ProblemType,
  ExtractionResult,
} from './evaluation.js';

// Goal types
export type {
  GoalType,
  IEPGoal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalExtractionResult,
} from './goal.js';

// Express extensions
declare global {
  namespace Express {
    interface Request {
      therapist?: { therapist_id: number };
      child?: { child_id: number };
    }
  }
}

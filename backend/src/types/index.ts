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
  Objective,
  IEPGoal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalExtractionResult,
} from './goal.js';

// Session types
export type {
  SessionStatus,
  GameplaySession,
  SessionResponse,
  CreateSessionRequest,
  EndSessionRequest,
  RecordResponseRequest,
  LiveSessionInfo,
  LiveCardEvent,
  LiveResponseEvent,
  LiveSafetyAlert,
  SessionSummary,
  TherapistLiveMessage,
  TherapistLiveClientMessage,
} from './session.js';

// Voice types
export type {
  ClientMessage,
  ServerMessage,
  RealtimeServerEvent,
  RealtimeClientEvent,
  RealtimeEventHandler,
} from './voice.js';

// Voice validation schemas
export { ClientMessageSchema, CardContextSchema } from './voice.js';

// Member and School types
export type {
  Member,
  MemberResponse,
  CreateMemberRequest,
  UpdateMemberRequest,
  School,
  CreateSchoolRequest,
  UpdateSchoolRequest,
} from './member.js';

// Express extensions
declare global {
  namespace Express {
    interface Request {
      therapist?: { therapist_id: number };
      child?: { child_id: number };
    }
  }
}

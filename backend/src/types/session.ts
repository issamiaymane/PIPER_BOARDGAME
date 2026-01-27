/**
 * Session Types
 * Types for gameplay session tracking
 */

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface GameplaySession {
  id: number;
  child_id: number;
  therapist_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  categories_selected: string; // JSON array string
  theme: string | null;
  character: string | null;
  status: SessionStatus;
  final_score: number;
  final_board_position: number;
  total_cards_played: number;
  correct_responses: number;
}

export interface SessionResponse {
  id: number;
  session_id: number;
  card_category: string;
  card_question: string;
  child_response: string | null;
  is_correct: number; // 0 or 1 (SQLite boolean)
  attempt_number: number;
  card_shown_at: string;
  response_at: string | null;
  time_spent_seconds: number | null;
  safety_level: number;
  signals_detected: string | null; // JSON array string
  intervention_chosen: string | null; // e.g., 'SKIP_CARD', 'RETRY_CARD'
}

export interface CreateSessionRequest {
  categories: string[];
  theme?: string;
  character?: string;
}

export interface EndSessionRequest {
  finalScore: number;
  boardPosition: number;
  status: 'completed' | 'abandoned';
}

export interface RecordResponseRequest {
  cardCategory: string;
  cardQuestion: string;
  childResponse: string | null;
  isCorrect: boolean;
  attemptNumber?: number;
  timeSpentSeconds?: number;
  safetyLevel?: number;
  signalsDetected?: string[];
}

// Types for live session broadcasting
export interface LiveSessionInfo {
  sessionId: number;
  childId: number;
  childName: string;
  startedAt: string;
  categoriesSelected: string[];
  theme: string | null;
  currentScore: number;
  currentPosition: number;
  cardsPlayed: number;
  correctResponses: number;
  status: SessionStatus;
}

export interface LiveCardEvent {
  sessionId: number;
  cardCategory: string;
  cardQuestion: string;
  cardShownAt: string;
}

export interface LiveResponseEvent {
  sessionId: number;
  childResponse: string | null;
  isCorrect: boolean;
  safetyLevel: number;
  signalsDetected: string[];
  responseAt: string;
  timeSpentSeconds: number | null;
}

export interface LiveSafetyAlert {
  sessionId: number;
  safetyLevel: number;
  signals: string[];
  timestamp: string;
}

export interface SessionSummary {
  sessionId: number;
  duration: number;
  totalCards: number;
  correctResponses: number;
  accuracyPercent: number;
  finalScore: number;
  finalPosition: number;
  status: SessionStatus;
}

// WebSocket message types for therapist live view
export type TherapistLiveMessage =
  | { type: 'session_started'; session: LiveSessionInfo }
  | { type: 'card_shown'; data: LiveCardEvent }
  | { type: 'child_response'; data: LiveResponseEvent }
  | { type: 'safety_alert'; data: LiveSafetyAlert }
  | { type: 'session_ended'; data: SessionSummary }
  | { type: 'active_sessions'; sessions: LiveSessionInfo[] }
  | { type: 'error'; message: string };

export type TherapistLiveClientMessage =
  | { type: 'subscribe' }
  | { type: 'get_active_sessions' };

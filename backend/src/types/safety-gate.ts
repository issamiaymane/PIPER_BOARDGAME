// ═══════════════════════════════════════════════════════════════════════════
// SAFETY-GATE TYPES
// ═══════════════════════════════════════════════════════════════════════════
//
// Architecture Flow:
// ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────────────┐
// │ 1.INPUT │ → │ 2.SIGNAL│ → │ 3.STATE │ → │ 4.LEVEL │ → │5.INTERVENTION│
// └─────────┘   └─────────┘   └─────────┘   └─────────┘   └──────────────┘
//      ↓
// ┌─────────┐   ┌──────────────────┐   ┌─────────┐   ┌─────────┐
// │ 6.CONFIG│ → │ 7.BACKEND_RESPONSE│ → │ 8.LLM   │ → │ 9.OUTPUT│
// └─────────┘   └──────────────────┘   └─────────┘   └─────────┘
//
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// 1. INPUT - Events and Context
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Event triggered by child action or inactivity
 */
export interface Event {
  type: 'CHILD_RESPONSE' | 'CHILD_INACTIVE';
  correct?: boolean;
  response?: string;
  previousResponse?: string;
  previousPreviousResponse?: string;
  signals?: {
    screaming?: boolean;
    crying?: boolean;
    prolongedSilence?: boolean;
  };
}

/**
 * Card data from deck (frontend format)
 */
export interface CardContext {
  category: string;
  question: string;
  targetAnswers: string[];
  images: Array<{ image: string; label: string }>;
}

/**
 * Task context for current card (backend format)
 */
export interface TaskContext {
  cardType: string;
  category: string;
  question: string;
  targetAnswer: string;
  imageLabels: string[];
}


// ═══════════════════════════════════════════════════════════════════════════
// 2. SIGNALS - Detected from Event
// ═══════════════════════════════════════════════════════════════════════════

export enum Signal {
  // Audio-based (from Event.signals)
  SCREAMING = 'SCREAMING',
  CRYING = 'CRYING',
  PROLONGED_SILENCE = 'PROLONGED_SILENCE',

  // Text-based (from LLM analysis)
  WANTS_BREAK = 'WANTS_BREAK',
  WANTS_QUIT = 'WANTS_QUIT',
  FRUSTRATION = 'FRUSTRATION',
  DISTRESS = 'DISTRESS',

  // Pattern-based (from Event fields)
  REPETITIVE_RESPONSE = 'REPETITIVE_RESPONSE',
  REPETITIVE_WORDS = 'REPETITIVE_WORDS'  // Same word repeated multiple times in one response (e.g., "dog dog dog")
}


// ═══════════════════════════════════════════════════════════════════════════
// 3. STATE - Session State (updated by Events + Signals)
// ═══════════════════════════════════════════════════════════════════════════

export interface State {
  engagementLevel: number;      // 0-10
  dysregulationLevel: number;   // 0-10
  fatigueLevel: number;         // 0-10
  consecutiveErrors: number;
  errorFrequency: number;       // errors per minute
  timeInSession: number;        // seconds
  timeSinceBreak: number;       // seconds
  lastActivityTimestamp: Date;
}


// ═══════════════════════════════════════════════════════════════════════════
// 4. LEVEL - Safety Level (assessed from State + Signals)
// ═══════════════════════════════════════════════════════════════════════════

export enum Level {
  GREEN = 0,   // Normal operation
  YELLOW = 1,  // Minor adaptation
  ORANGE = 2,  // Significant adaptation
  RED = 3      // Emergency intervention
}


// ═══════════════════════════════════════════════════════════════════════════
// 5. INTERVENTIONS - Actions (selected based on Level + State + Signals)
// ═══════════════════════════════════════════════════════════════════════════

export enum Intervention {
  RETRY_CARD = 'RETRY_CARD',
  SKIP_CARD = 'SKIP_CARD',
  BUBBLE_BREATHING = 'BUBBLE_BREATHING',
  START_BREAK = 'START_BREAK',
  CALL_GROWNUP = 'CALL_GROWNUP'
}


// ═══════════════════════════════════════════════════════════════════════════
// 6. CONFIG - Session Config (adapted based on Level)
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionConfig {
  promptIntensity: number;      // 0-3 (minimal to high)
  avatarTone: 'calm' | 'warm';
  maxTaskTime: number;          // seconds
  inactivityTimeout: number;    // seconds
}


// ═══════════════════════════════════════════════════════════════════════════
// 7. BACKEND RESPONSE - Data Package for LLM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derived context from Event + TaskContext
 */
export interface ResponseContext {
  what_happened: 'correct_response' | 'incorrect_response' | 'child_inactive';
  child_said: string;
  target_was: string;
  attempt_number: number;
}

/**
 * Constraints for LLM response generation
 * Note: tone comes from SessionConfig.avatarTone (no duplication)
 */
export interface LLMConstraints {
  must_be_brief: boolean;
  must_not_judge: boolean;
  must_not_pressure: boolean;
  must_offer_choices: boolean;
  must_validate_feelings: boolean;
  max_sentences: number;
  forbidden_words: string[];
  required_approach: string;
}

/**
 * Reasoning for safety decisions
 */
export interface DecisionReasoning {
  safety_level_reason: string;
  interventions_reason: string;
}

/**
 * Complete data package passed to LLM prompt builder
 * References source data directly (no duplication)
 */
export interface BackendResponse {
  // Pipeline outputs
  safetyLevel: Level;
  signals: Signal[];
  interventions: Intervention[];
  sessionConfig: SessionConfig;

  // Source data references
  event: Event;
  state: State;
  taskContext: TaskContext | null;

  // Derived data
  context: ResponseContext;
  constraints: LLMConstraints;
  reasoning: DecisionReasoning;

  // Metadata
  decision: string;
  timestamp: Date;
}


// ═══════════════════════════════════════════════════════════════════════════
// 8. LLM - Response Generation and Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LLM generated response
 */
export interface LLMGeneration {
  coach_line: string;
  choice_presentation: string;
}

/**
 * LLM response validation result
 */
export interface LLMValidation {
  valid: boolean;
  checks: Record<string, boolean>;
  reason: string | null;
}


// ═══════════════════════════════════════════════════════════════════════════
// 9. OUTPUT - Final Results to Frontend
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UI package sent to frontend
 */
export interface UIPackage {
  // Pipeline data for overlay
  overlay: {
    signals: Signal[];
    state: State;
    safetyLevel: Level;
  };

  // Actions available to child
  interventions: Intervention[];

  // Session settings
  sessionConfig: SessionConfig;

  // LLM output
  speech: {
    text: string;
  };
  choiceMessage: string;

  // Logging data (optional)
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

/**
 * Complete safety gate result
 * Note: feedbackText, choiceMessage, interventionRequired, and logging data
 * are all accessible via uiPackage (no duplication)
 */
export interface SafetyGateResult {
  uiPackage: UIPackage;

  // Response metadata
  isCorrect: boolean;
  shouldSpeak: boolean;
  taskTimeExceeded: boolean;
}

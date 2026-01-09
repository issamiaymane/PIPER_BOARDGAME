// ═══════════════════════════════════════════════════════════════════════════
// SAFETY-GATE TYPES
// Organized by architecture flow:
// Event → Signals → State → Level → Interventions → Config → LLM → Output
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. INPUT - Events and Context
// ─────────────────────────────────────────────────────────────────────────────

export interface Event {
  type: 'CHILD_RESPONSE' | 'CHILD_INACTIVE';
  correct?: boolean;
  response?: string;
  previousResponse?: string;
  previousPreviousResponse?: string;
  // Pre-detected signals from voice layer
  signals?: {
    screaming?: boolean;
    crying?: boolean;
    prolongedSilence?: boolean;
  };
}

export interface CardContext {
  category: string;
  question: string;
  targetAnswers: string[];
  images: Array<{ image: string; label: string }>;
}

export interface TaskContext {
  cardType: string;
  category: string;
  question: string;
  targetAnswer: string;
  imageLabels: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNALS - Detected from Event
// ─────────────────────────────────────────────────────────────────────────────

export enum Signal {
  // AUDIO-BASED (from Event.signals - detected by voice layer)
  SCREAMING = 'SCREAMING',
  CRYING = 'CRYING',
  PROLONGED_SILENCE = 'PROLONGED_SILENCE',

  // TEXT-BASED (from LLM analysis of response)
  WANTS_BREAK = 'WANTS_BREAK',
  WANTS_QUIT = 'WANTS_QUIT',
  FRUSTRATION = 'FRUSTRATION',
  DISTRESS = 'DISTRESS',  // verbal distress like "no no no"

  // EVENT PATTERN (from Event fields)
  REPETITIVE_RESPONSE = 'REPETITIVE_RESPONSE'
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATE - Updated with Signal Effects
// ─────────────────────────────────────────────────────────────────────────────

export interface State {
  engagementLevel: number; // 0-10
  dysregulationLevel: number; // 0-10
  fatigueLevel: number; // 0-10
  consecutiveErrors: number;
  errorFrequency: number; // errors per minute
  timeInSession: number; // seconds
  timeSinceBreak: number; // seconds
  lastActivityTimestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LEVEL - Assessed from State + Signals
// ─────────────────────────────────────────────────────────────────────────────

export enum Level {
  GREEN = 0, // Normal operation
  YELLOW = 1, // Minor adaptation
  ORANGE = 2, // Significant adaptation
  RED = 3 // Emergency intervention
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERVENTIONS - Selected based on Level
// ─────────────────────────────────────────────────────────────────────────────

export enum Intervention {
  BUBBLE_BREATHING = 'BUBBLE_BREATHING',
  SKIP_CARD = 'SKIP_CARD',
  RETRY_CARD = 'RETRY_CARD',
  START_BREAK = 'START_BREAK',
  CALL_GROWNUP = 'CALL_GROWNUP'
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONFIG - Adapted based on Level
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionConfig {
  promptIntensity: number; // 0-3
  avatarTone: 'calm' | 'warm';
  maxTaskTime: number; // seconds (total time on card)
  inactivityTimeout: number; // seconds (time before "are you there?" prompt)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. LLM - Response Generation and Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMGeneration {
  coach_line: string;
  choice_presentation: string;
}

export interface LLMValidation {
  valid: boolean;
  checks: Record<string, boolean>;
  reason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7b. BACKEND RESPONSE SUBSTRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionState {
  current_event: 'CHILD_RESPONSE' | 'CHILD_INACTIVE';
  engagement: number;
  dysregulation: number;
  fatigue: number;
  consecutive_errors: number;
  time_in_session: number;
}

export interface ResponseContext {
  what_happened: 'correct_response' | 'incorrect_response' | 'child_inactive';
  child_said: string;
  target_was: string;
  attempt_number: number;
  card_context?: {
    category: string;
    card_type: string;
    question: string;
    expected_answer: string;
    visual_supports: string[];
  };
}

export interface ResponseConstraints {
  must_use_tone: 'calm' | 'warm';
  must_be_brief: boolean;
  must_not_judge: boolean;
  must_not_pressure: boolean;
  must_offer_choices: boolean;
  must_validate_feelings: boolean;
  max_sentences: number;
  forbidden_words: string[];
  required_approach: string;
}

export interface ResponseReasoning {
  safety_level_reason: string;
  interventions_reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. OUTPUT - Final Results
// ─────────────────────────────────────────────────────────────────────────────

export interface UIPackage {
  // Flow order
  overlay: {
    signals: Signal[];        // SIGNALS
    state: State;             // STATE
    safetyLevel: Level;       // LEVEL
  };
  interventions: Intervention[];  // INTERVENTIONS
  sessionConfig: SessionConfig;   // CONFIG
  speech: {                       // LLM OUTPUT
    text: string;
  };
  choiceMessage: string;          // LLM OUTPUT
  // Optional: logging data
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

export interface SafetyGateResult {
  // Main output
  uiPackage: UIPackage;
  // Response metadata
  isCorrect: boolean;
  shouldSpeak: boolean;
  interventionRequired: boolean;
  taskTimeExceeded: boolean;
  // Extracted for convenience
  feedbackText: string;
  choiceMessage: string;
  // Optional: logging data
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

export interface BackendResponse {
  // Flow order
  safetyLevel: Level;
  signals: Signal[];
  interventions: Intervention[];
  sessionConfig: SessionConfig;
  // Decision & context
  decision: string;
  sessionState: SessionState;
  context: ResponseContext;
  constraints: ResponseConstraints;
  reasoning: ResponseReasoning;
  timestamp: Date;
}

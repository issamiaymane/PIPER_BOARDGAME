// ═══════════════════════════════════════════════════════════════════════════
// SAFETY-GATE TYPES
// Organized by architecture flow: Event → State → Signals → Level → Interventions
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. INPUT - Events and Card Context
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATE - Session tracking
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
// 3. SIGNALS - Detection
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

// NOTE: State thresholds are checked directly by LevelAssessor:
// - state.consecutiveErrors >= 3
// - state.engagementLevel <= 3
// - state.fatigueLevel >= 7
// - state.dysregulationLevel >= 6

// ─────────────────────────────────────────────────────────────────────────────
// 4. LEVEL - Safety assessment
// ─────────────────────────────────────────────────────────────────────────────

export enum Level {
  GREEN = 0, // Normal operation
  YELLOW = 1, // Minor adaptation
  ORANGE = 2, // Significant adaptation
  RED = 3 // Emergency intervention
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERVENTIONS - Available actions
// ─────────────────────────────────────────────────────────────────────────────

export enum Intervention {
  BUBBLE_BREATHING = 'BUBBLE_BREATHING',
  SKIP_CARD = 'SKIP_CARD',
  RETRY_CARD = 'RETRY_CARD',
  START_BREAK = 'START_BREAK',
  CALL_GROWNUP = 'CALL_GROWNUP'
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. AI PROCESSING - LLM feedback and validation
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMResponse {
  coach_line: string;
  choice_presentation: string;
}

export interface ResponseValidationResult {
  valid: boolean;
  checks: Record<string, boolean>;
  reason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONTEXT - Task context for orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskContext {
  cardType: string;
  category: string;
  question: string;
  targetAnswer: string;
  imageLabels: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. OUTPUT - UI package and final result
// ─────────────────────────────────────────────────────────────────────────────

export interface UIPackage {
  avatar: {
    animation: string;
    expression: string;
    position: string;
  };
  speech: {
    text: string;
    voice_tone: 'calm' | 'warm' | 'neutral';
    speed: string;
  };
  choice_message: string;
  interventions: Intervention[];
  visual_cues: {
    enabled: boolean;
  };
  audio_support: {
    available: boolean;
  };
  grownup_help: {
    available: boolean;
  };
  admin_overlay: {
    safety_level: Level;
    interventions_active: number;
    interventions_list: Intervention[];
    signals_detected: Signal[];
    time_in_session: string;
    state_snapshot: State;
  };
  // Session config for retry/timeout limits
  session_config: SessionConfig;
  // Optional fields for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

export interface SafetyGateResult {
  uiPackage: UIPackage;
  feedbackText: string;
  choiceMessage: string;
  shouldSpeak: boolean;
  interventionRequired: boolean;
  isCorrect: boolean;
  // Per-card limit flags
  maxRetriesExceeded: boolean;
  taskTimeExceeded: boolean;
  // Additional data for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CONFIG - Session configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionConfig {
  prompt_intensity: number; // 0-3
  avatar_tone: 'calm' | 'warm' | 'neutral';
  max_retries: number; // 0-2
  max_task_time: number; // seconds (total time on card)
  inactivity_timeout: number; // seconds (time before "are you there?" prompt)
  show_visual_cues: boolean;
  enable_audio_support: boolean;
}

export interface BackendResponse {
  decision: string;
  safety_level: Level;
  session_state: any;
  parameters: SessionConfig;
  context: any;
  constraints: any;
  signals_detected: Signal[];
  interventions_active: Intervention[];
  reasoning: any;
  timestamp: Date;
}

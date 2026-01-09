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

// NOTE: State thresholds are checked directly by LevelAssessor:
// - state.consecutiveErrors >= 3 (YELLOW), >= 5 (ORANGE)
// - state.engagementLevel <= 3 (YELLOW)
// - state.fatigueLevel >= 6 (YELLOW), >= 8 (ORANGE)
// - state.dysregulationLevel >= 5 (YELLOW), >= 7 (ORANGE), >= 9 (RED)

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
  prompt_intensity: number; // 0-3
  avatar_tone: 'calm' | 'warm' | 'neutral';
  max_task_time: number; // seconds (total time on card)
  inactivity_timeout: number; // seconds (time before "are you there?" prompt)
  show_visual_cues: boolean;
  enable_audio_support: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. LLM - Response Generation and Validation
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
// 8. OUTPUT - Final Results
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
  // Session config for timeout limits
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
  // Per-card limit flag
  taskTimeExceeded: boolean;
  // Additional data for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
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

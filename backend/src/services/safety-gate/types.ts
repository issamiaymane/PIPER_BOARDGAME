export interface Event {
  type: 'CHILD_RESPONSE' | 'CHILD_INACTIVE';
  correct?: boolean;
  response?: string;
  previousResponse?: string;
  previousPreviousResponse?: string;
  signal?: string; // Audio-based signals (e.g., 'screaming_detected_audio')
}

export interface State {
  engagementLevel: number; // 0-10
  dysregulationLevel: number; // 0-10
  fatigueLevel: number; // 0-10
  errorFrequency: number; // errors per minute
  consecutiveErrors: number;
  timeInSession: number; // seconds
  timeSinceBreak: number; // seconds
  lastActivityTimestamp: Date;
}

export interface ValidationResult {
  approved: boolean;
  reason: string;
  rejectedWords?: string[];
}

export enum Level {
  GREEN = 0, // Normal operation
  YELLOW = 1, // Minor adaptation
  ORANGE = 2, // Significant adaptation
  RED = 3 // Emergency intervention
}

export enum Intervention {
  // Available actions for the child
  BUBBLE_BREATHING = 'BUBBLE_BREATHING',
  SKIP_CARD = 'SKIP_CARD',
  RETRY_CARD = 'RETRY_CARD',
  START_BREAK = 'START_BREAK',
  CALL_GROWNUP = 'CALL_GROWNUP'
}

export enum Signal {
  // ═══════════════════════════════════════════
  // 1. STATE-BASED (derived from State)
  // ═══════════════════════════════════════════
  CONSECUTIVE_ERRORS = 'CONSECUTIVE_ERRORS',       // consecutiveErrors >= 3
  ENGAGEMENT_DROP = 'ENGAGEMENT_DROP',             // engagementLevel <= 3
  FATIGUE_HIGH = 'FATIGUE_HIGH',                   // fatigueLevel >= 7
  DYSREGULATION_DETECTED = 'DYSREGULATION_DETECTED', // dysregulationLevel >= 6

  // ═══════════════════════════════════════════
  // 2. EVENT-BASED (derived from Event)
  // ═══════════════════════════════════════════
  REPETITIVE_WRONG_RESPONSE = 'REPETITIVE_WRONG_RESPONSE', // response === previousResponse

  // ═══════════════════════════════════════════
  // 3. TEXT-BASED (detected from response text)
  // ═══════════════════════════════════════════
  BREAK_REQUEST = 'BREAK_REQUEST',     // "break", "stop", "tired"
  QUIT_REQUEST = 'QUIT_REQUEST',       // "done", "quit", "no more"
  NO_NO_NO = 'NO_NO_NO',               // "no no no" pattern
  TEXT_SCREAMING = 'TEXT_SCREAMING',   // "scream", "ahhh", "[crying]"
  FRUSTRATION = 'FRUSTRATION',         // "ugh", "argh"

  // ═══════════════════════════════════════════
  // 4. AUDIO-BASED (detected from amplitude)
  // ═══════════════════════════════════════════
  AUDIO_SCREAMING = 'AUDIO_SCREAMING'  // high amplitude detection
}

export interface SessionConfig {
  prompt_intensity: number; // 0-3
  avatar_tone: 'calm' | 'warm' | 'neutral';
  max_retries: number; // 1-3
  max_task_time: number; // seconds
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

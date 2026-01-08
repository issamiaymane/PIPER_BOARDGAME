export interface ChildState {
  engagementLevel: number; // 0-10
  dysregulationLevel: number; // 0-10
  fatigueLevel: number; // 0-10
  errorFrequency: number; // errors per minute
  consecutiveErrors: number;
  timeInSession: number; // seconds
  timeSinceBreak: number; // seconds
  lastActivityTimestamp: Date;
}

export interface ChildEvent {
  type: 'CHILD_RESPONSE' | 'CHILD_INACTIVE' | 'VERBAL_SIGNAL';
  correct?: boolean;
  response?: string;
  previousResponse?: string;
  previousPreviousResponse?: string;
  signal?: string;
}

export interface ValidationResult {
  approved: boolean;
  reason: string;
  rejectedWords?: string[];
}

export interface Choice {
  id: string;
  label: string;
  icon: string;
  action: string;
  priority: number;
}

export enum SafetyGateLevel {
  GREEN = 0, // Normal operation
  YELLOW = 1, // Minor adaptation
  ORANGE = 2, // Significant adaptation
  RED = 3 // Emergency intervention
}

export enum InterventionType {
  SHORTEN_TASK = 'shorten_task',
  CALMER_TONE = 'calmer_tone',
  OFFER_CHOICE = 'offer_choice',
  TRIGGER_BREAK = 'trigger_break',
  BUBBLE_BREATHING = 'bubble_breathing',
  ALLOW_SKIP = 'allow_skip',
  CALL_GROWNUP = 'call_grownup'
}

export enum Signal {
  // Behavioral (detected from state)
  CONSECUTIVE_ERRORS = 'CONSECUTIVE_ERRORS',
  REPETITIVE_WRONG_RESPONSE = 'REPETITIVE_WRONG_RESPONSE',
  ENGAGEMENT_DROP = 'ENGAGEMENT_DROP',
  FATIGUE_HIGH = 'FATIGUE_HIGH',
  DYSREGULATION_DETECTED = 'DYSREGULATION_DETECTED',

  // Verbal (detected from response text)
  I_NEED_BREAK = 'I_NEED_BREAK',
  IM_DONE = 'IM_DONE',
  SCREAMING = 'SCREAMING',
  NO_NO_NO = 'NO_NO_NO',
  TEXT_SCREAMING = 'TEXT_SCREAMING',
  AUDIO_SCREAMING = 'AUDIO_SCREAMING',
  FRUSTRATION = 'FRUSTRATION',
  QUIT_SIGNAL = 'QUIT_SIGNAL',

  // Escalation (severe)
  TANTRUM = 'TANTRUM',
  MELTDOWN = 'MELTDOWN',
  EXTREME_DISTRESS = 'EXTREME_DISTRESS',
  LEAVING_ACTIVITY = 'LEAVING_ACTIVITY'
}

export interface SessionConfig {
  prompt_intensity: number; // 0-3
  avatar_tone: 'calm' | 'warm' | 'neutral';
  max_retries: number; // 1-3
  max_task_time: number; // seconds
  allow_skip: boolean;
  show_visual_cues: boolean;
  enable_audio_support: boolean;
  grownup_help_available: boolean;
  show_bubble_breathing: boolean;
}

export interface BackendResponse {
  decision: string;
  safety_level: SafetyGateLevel;
  session_state: any;
  parameters: SessionConfig;
  choices: Choice[];
  context: any;
  constraints: any;
  signals_detected: Signal[];
  interventions_active: InterventionType[];
  reasoning: any;
  timestamp: Date;
}

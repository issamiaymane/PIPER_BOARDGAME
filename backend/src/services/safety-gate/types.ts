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
  signals_detected: string[];
  interventions_active: InterventionType[];
  reasoning: any;
  timestamp: Date;
}

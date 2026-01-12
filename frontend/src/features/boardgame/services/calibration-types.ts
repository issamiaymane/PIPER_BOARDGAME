/**
 * Calibration Types (Frontend)
 * Types for the pre-session voice calibration system
 */

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION PHASES
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationPhase = 'idle' | 'silence' | 'normal' | 'excited' | 'loud' | 'complete' | 'failed';

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION RESULT (from server)
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationConfidence = 'high' | 'medium' | 'low';

export interface CalibrationResult {
  amplitudeThreshold: number;
  peakThreshold: number;
  isValid: boolean;
  confidence: CalibrationConfidence;
  failureReason?: string;
  deviceGain: number;
  calibratedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION STATE
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationState = 'idle' | 'calibrating' | 'complete' | 'failed';

export interface CalibrationStatus {
  state: CalibrationState;
  currentPhase: CalibrationPhase;
  phaseDuration: number;
  phasePrompt: string;
  result?: CalibrationResult;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION CONFIG (for UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface CalibrationPhaseConfig {
  phase: CalibrationPhase;
  title: string;
  instruction: string;
  icon: string;
  durationMs: number;
}

export const CALIBRATION_PHASES: CalibrationPhaseConfig[] = [
  {
    phase: 'silence',
    title: 'Stay Quiet',
    instruction: 'Stay quiet for just a moment...',
    icon: '🤫',
    durationMs: 2000,
  },
  {
    phase: 'normal',
    title: 'Normal Voice',
    instruction: 'Say: APPLE... SUNSHINE... RAINBOW',
    icon: '🗣️',
    durationMs: 12000,
  },
  {
    phase: 'excited',
    title: 'Excited Voice',
    instruction: 'Say: HOORAY!... WOOHOO!',
    icon: '🎉',
    durationMs: 10000,
  },
  {
    phase: 'loud',
    title: 'Loud Voice',
    instruction: 'Shout: YAAAY!',
    icon: '📢',
    durationMs: 10000,
  },
];

export function getPhaseConfig(phase: CalibrationPhase): CalibrationPhaseConfig | undefined {
  return CALIBRATION_PHASES.find(p => p.phase === phase);
}

export function getPhaseIndex(phase: CalibrationPhase): number {
  return CALIBRATION_PHASES.findIndex(p => p.phase === phase);
}

export function getTotalCalibrationDuration(): number {
  return CALIBRATION_PHASES.reduce((sum, p) => sum + p.durationMs, 0);
}

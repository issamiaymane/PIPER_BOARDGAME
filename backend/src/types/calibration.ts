/**
 * Calibration Types
 * Types for the pre-session voice calibration system
 */

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION PHASES
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationPhase = 'idle' | 'silence' | 'normal' | 'excited' | 'loud' | 'complete' | 'failed';

export interface CalibrationPhaseConfig {
  phase: CalibrationPhase;
  durationMs: number;
  prompt: string;
  expectedWords: string[];
  minWordsRequired: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMPLITUDE SAMPLES
// ─────────────────────────────────────────────────────────────────────────────

export interface AmplitudeSample {
  amplitude: number;
  peak: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE RESULTS
// ─────────────────────────────────────────────────────────────────────────────

export interface SilencePhaseResult {
  noiseFloor: number;
  noiseFloorPeak: number;
  samples: AmplitudeSample[];
}

export interface NormalPhaseResult {
  amplitudeMean: number;
  amplitudeStd: number;
  amplitudeMax: number;
  peakMean: number;
  peakMax: number;
  samples: AmplitudeSample[];
  transcript?: string;
  wordsMatched: number;
}

export interface ExcitedPhaseResult {
  amplitudeMean: number;
  amplitudeMax: number;
  peakMean: number;
  peakMax: number;
  samples: AmplitudeSample[];
  transcript?: string;
  wordsMatched: number;
}

export interface LoudPhaseResult {
  amplitudeMax: number;
  amplitude95th: number;
  peakMax: number;
  peak95th: number;
  samples: AmplitudeSample[];
  transcript?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION RESULT
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationConfidence = 'high' | 'medium' | 'low';

export interface CalibrationResult {
  // Primary outputs - the two dynamic thresholds
  amplitudeThreshold: number;
  peakThreshold: number;

  // Validity and confidence
  isValid: boolean;
  confidence: CalibrationConfidence;
  failureReason?: string;

  // Raw phase data for debugging
  rawData: {
    silence?: SilencePhaseResult;
    normal?: NormalPhaseResult;
    excited?: ExcitedPhaseResult;
    loud?: LoudPhaseResult;
  };

  // Device characteristics
  deviceGain: number;  // Relative mic sensitivity

  // Timestamp
  calibratedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION MESSAGES (WebSocket)
// ─────────────────────────────────────────────────────────────────────────────

// Client -> Server
export interface CalibrationClientMessage {
  type: 'start_calibration' | 'calibration_audio_chunk' | 'calibration_phase_complete' | 'abort_calibration';
  phase?: CalibrationPhase;
  audio?: string;  // base64 encoded audio
  amplitude?: number;
  peak?: number;
}

// Server -> Client
export interface CalibrationServerMessage {
  type: 'calibration_phase_start' | 'calibration_phase_prompt' | 'calibration_phase_result' | 'calibration_complete' | 'calibration_failed' | 'calibration_retry';
  phase?: CalibrationPhase;
  prompt?: string;
  audioPrompt?: string;  // base64 TTS audio for the prompt
  result?: CalibrationResult;
  error?: string;
  retryPhase?: CalibrationPhase;
  retryReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export interface CalibrationConfig {
  phases: {
    silence: {
      durationMs: number;
      aiSpeakingMs: number;  // How long AI speaks before child's turn
    };
    normal: {
      durationMs: number;
      aiSpeakingMs: number;
      words: string[];
      minWordsRequired: number;
    };
    excited: {
      durationMs: number;
      aiSpeakingMs: number;
      words: string[];
      minWordsRequired: number;
    };
    loud: {
      durationMs: number;
      aiSpeakingMs: number;
      words: string[];
    };
  };

  // Threshold calculation parameters
  thresholds: {
    // Amplitude: normal_ceiling + factor * (excited_mean - normal_ceiling)
    amplitudeFactor: number;
    // Peak: normal_peak + factor * (loud_peak_95th - normal_peak)
    peakFactor: number;
    // Clamp ranges
    amplitudeMin: number;
    amplitudeMax: number;
    peakMin: number;
    peakMax: number;
  };

  // Fallback values if calibration fails
  fallback: {
    amplitudeThreshold: number;
    peakThreshold: number;
  };

  // Validation thresholds
  validation: {
    minSpeechSamples: number;  // Minimum samples with voice activity
    voiceActivityThreshold: number;  // Amplitude above this = voice detected
    excitedToNormalRatio: number;  // Test2 must be this much louder than Test1
    loudToExcitedRatio: number;  // Test3 must be this much louder than Test2
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION STATE (per session)
// ─────────────────────────────────────────────────────────────────────────────

export interface CalibrationState {
  isCalibrating: boolean;
  currentPhase: CalibrationPhase;
  phaseStartTime?: number;
  samples: AmplitudeSample[];
  transcripts: string[];

  // Phase results as they complete
  silenceResult?: SilencePhaseResult;
  normalResult?: NormalPhaseResult;
  excitedResult?: ExcitedPhaseResult;
  loudResult?: LoudPhaseResult;

  // Retry tracking
  retryCount: number;
  maxRetries: number;
}

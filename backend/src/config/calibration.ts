/**
 * Calibration Configuration
 * Settings for the pre-session voice calibration system
 */

import type { CalibrationConfig } from '../types/calibration.js';

export const calibrationConfig: CalibrationConfig = {
  phases: {
    // Phase 0: Measure background noise (3 seconds)
    silence: {
      durationMs: 3000,
      aiSpeakingMs: 2000, // AI speaks for ~2s, then 1s of silence
    },

    // Phase 1: Normal speech baseline (18 seconds total)
    // AI speaks prompt (~5s), child has ~13s to say words
    normal: {
      durationMs: 18000,
      aiSpeakingMs: 5000,
      words: ['apple', 'sunshine', 'rainbow'],
      minWordsRequired: 2,
    },

    // Phase 2: Excited/happy speech (15 seconds total)
    // AI speaks prompt (~4s), child has ~11s to respond
    excited: {
      durationMs: 15000,
      aiSpeakingMs: 4000,
      words: ['hooray', 'woohoo', 'yay', 'yes', 'yeah'],
      minWordsRequired: 1,
    },

    // Phase 3: Maximum volume (15 seconds total)
    // AI speaks prompt (~4s), child has ~11s to shout
    loud: {
      durationMs: 15000,
      aiSpeakingMs: 4000,
      words: ['yay', 'yeah', 'yaaay', 'wooo', 'ahhh'],
    },
  },

  // Threshold calculation parameters
  thresholds: {
    // Amplitude threshold = normal_ceiling + 0.8 * (excited_mean - normal_ceiling)
    // where normal_ceiling = normal_mean + 2 * normal_std
    amplitudeFactor: 0.8,

    // Peak threshold = normal_peak + 0.85 * (loud_peak_95th - normal_peak)
    peakFactor: 0.85,

    // Clamp ranges to prevent extreme values
    // Minimum raised to 0.40 to prevent overly sensitive calibration for children with speech issues
    amplitudeMin: 0.40,
    amplitudeMax: 0.65,
    peakMin: 0.70,
    peakMax: 0.95,
  },

  // Fallback values if calibration is skipped or fails
  // Using conservative thresholds (0.60+) to reduce false positives for children with speech issues
  fallback: {
    amplitudeThreshold: parseFloat(process.env.CALIBRATION_FALLBACK_AMPLITUDE || '0.60'),
    peakThreshold: parseFloat(process.env.CALIBRATION_FALLBACK_PEAK || '0.95'),
  },

  // Validation thresholds
  validation: {
    // Need at least 10 audio chunks with voice activity per phase
    minSpeechSamples: 10,

    // Amplitude above this = voice detected (not silence)
    voiceActivityThreshold: 0.02,

    // Test2 (excited) must be at least 1.3x louder than Test1 (normal)
    excitedToNormalRatio: 1.3,

    // Test3 (loud) must be at least 1.2x louder than Test2 (excited)
    loudToExcitedRatio: 1.2,
  },
};

// Text prompts for each phase (spoken by AI)
export const calibrationPrompts = {
  intro: "Let's play a quick voice game before we start! It will only take a moment.",

  silence: "First, stay quiet for just a moment...",

  normal: "Now say these words in your normal voice: APPLE... SUNSHINE... RAINBOW",

  excited: "Great job! Now pretend you just won a game! Say: HOORAY!... WOOHOO!",

  loud: "Last one! Shout YAAAY as LOUD as you can! Ready... YAAAY!",

  complete: "Perfect! You're all set. Let's play!",

  retry: "I didn't hear you clearly. Let's try that one more time!",

  failed: "That's okay! We'll use our regular settings. Let's play!",
};

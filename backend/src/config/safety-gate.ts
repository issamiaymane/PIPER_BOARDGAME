/**
 * Safety-Gate Configuration
 * Centralized configuration for the safety-gate system
 */

export const safetyGateConfig = {
  // Screaming detection thresholds (RMS amplitude 0-1 scale)
  // Normal speech: ~0.05-0.15, Loud speech: ~0.15-0.30, Screaming/Yelling: >0.35
  screaming: {
    amplitudeThreshold: parseFloat(process.env.SCREAMING_AMPLITUDE_THRESHOLD || '0.35'),
    peakThreshold: parseFloat(process.env.SCREAMING_PEAK_THRESHOLD || '0.90'),
    confirmationChunks: parseInt(process.env.SCREAMING_CONFIRMATION_CHUNKS || '3', 10),
    // Wait after child stops screaming for transcription to arrive
    // Timeout only starts AFTER amplitude drops, so 2s is enough for Whisper
    postSpeechWaitMs: parseInt(process.env.SCREAMING_POST_SPEECH_WAIT_MS || '2000', 10),
    responseCooldownMs: parseInt(process.env.SCREAMING_RESPONSE_COOLDOWN_MS || '2500', 10),
  },

  // Safety level thresholds
  levels: {
    // RED level thresholds
    red: {
      dysregulation: 9,
      dysregulationWithDistress: 7,
    },
    // ORANGE level thresholds
    orange: {
      dysregulation: 7,
      consecutiveErrors: 5,
      fatigue: 8,
    },
    // YELLOW level thresholds
    yellow: {
      engagement: 3,
      dysregulation: 5,
      consecutiveErrors: 3,
      fatigue: 6,
    },
  },

  // Default session timeouts (seconds)
  defaultTimeouts: {
    inactivity: 30,
    maxTaskTime: 60,
  },
};

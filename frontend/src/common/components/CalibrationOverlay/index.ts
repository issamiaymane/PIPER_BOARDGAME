/**
 * CalibrationOverlay Component Exports
 */

export {
  showCalibrationOverlay,
  hideCalibrationOverlay,
  updateCalibrationPhase,
  updateCalibrationProgress,
  updateCalibrationTimer,
  showCalibrationComplete,
  showCalibrationFailed,
  isCalibrationOverlayVisible,
  // New simplified API
  setAiSpeaking,
  setChildTurn,
  updateVoiceActivity,
  isChildsTurn,
} from './CalibrationOverlay.js';

export type { CalibrationOverlayOptions } from './CalibrationOverlay.js';

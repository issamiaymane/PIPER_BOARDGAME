/**
 * Calibration Repository
 * Database operations for voice calibration data
 */

import { getDatabase } from '../database.js';
import { logger } from '../../utils/logger.js';

export interface VoiceCalibration {
  id: number;
  child_id: number;
  amplitude_threshold: number;
  peak_threshold: number;
  baseline_amplitude: number | null;
  baseline_peak: number | null;
  excited_amplitude: number | null;
  excited_peak: number | null;
  loud_amplitude: number | null;
  loud_peak: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  calibrated_at: string;
}

export interface SaveCalibrationData {
  amplitudeThreshold: number;
  peakThreshold: number;
  baselineAmplitude?: number;
  baselinePeak?: number;
  excitedAmplitude?: number;
  excitedPeak?: number;
  loudAmplitude?: number;
  loudPeak?: number;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Get calibration for a child
 */
export function getCalibrationByChildId(childId: number): VoiceCalibration | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM voice_calibrations WHERE child_id = ?
  `).get(childId);
  return row as VoiceCalibration | null;
}

/**
 * Save or update calibration for a child (upsert)
 */
export function saveCalibration(childId: number, data: SaveCalibrationData): void {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO voice_calibrations (
      child_id, amplitude_threshold, peak_threshold,
      baseline_amplitude, baseline_peak,
      excited_amplitude, excited_peak,
      loud_amplitude, loud_peak,
      confidence, calibrated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(child_id) DO UPDATE SET
      amplitude_threshold = excluded.amplitude_threshold,
      peak_threshold = excluded.peak_threshold,
      baseline_amplitude = excluded.baseline_amplitude,
      baseline_peak = excluded.baseline_peak,
      excited_amplitude = excluded.excited_amplitude,
      excited_peak = excluded.excited_peak,
      loud_amplitude = excluded.loud_amplitude,
      loud_peak = excluded.loud_peak,
      confidence = excluded.confidence,
      calibrated_at = CURRENT_TIMESTAMP
  `).run(
    childId,
    data.amplitudeThreshold,
    data.peakThreshold,
    data.baselineAmplitude ?? null,
    data.baselinePeak ?? null,
    data.excitedAmplitude ?? null,
    data.excitedPeak ?? null,
    data.loudAmplitude ?? null,
    data.loudPeak ?? null,
    data.confidence ?? null
  );

  logger.info(`Saved calibration for child ${childId}: amp=${data.amplitudeThreshold}, peak=${data.peakThreshold}`);
}

/**
 * Delete calibration for a child
 */
export function deleteCalibration(childId: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM voice_calibrations WHERE child_id = ?').run(childId);

  if (result.changes > 0) {
    logger.info(`Deleted calibration for child ${childId}`);
    return true;
  }
  return false;
}

/**
 * Check if a child has calibration
 */
export function hasCalibration(childId: number): boolean {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT 1 FROM voice_calibrations WHERE child_id = ? LIMIT 1
  `).get(childId);
  return result !== undefined;
}

export default {
  getCalibrationByChildId,
  saveCalibration,
  deleteCalibration,
  hasCalibration,
};

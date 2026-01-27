/**
 * Child Authentication Routes
 * Handles child login and calibration for the boardgame
 */

import { Router, Request, Response, NextFunction } from 'express';
import { loginChild, getStudentById } from '../../services/student/index.js';
import { authenticateChild } from '../middleware/childAuth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { getDatabase } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/child/login
 * Login a child with username and password
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw ApiError.badRequest('Username and password are required');
    }

    const result = await loginChild({ username, password });

    res.json({
      success: true,
      child: {
        id: result.child.id,
        username: result.child.username,
        first_name: result.child.first_name,
        last_name: result.child.last_name,
        therapist_id: result.child.therapist_id,
        problem_type: result.child.problem_type,
      },
      token: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid username or password') {
      next(ApiError.unauthorized('Invalid username or password'));
      return;
    }
    next(error);
  }
});

/**
 * GET /api/child/me
 * Get current child's info (requires authentication)
 */
router.get('/me', authenticateChild, (req: Request, res: Response, next: NextFunction) => {
  try {
    const child = getStudentById(req.child!.child_id);

    if (!child) {
      throw ApiError.notFound('Child not found');
    }

    res.json({
      child: {
        id: child.id,
        username: child.username,
        first_name: child.first_name,
        last_name: child.last_name,
        therapist_id: child.therapist_id,
        problem_type: child.problem_type,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/child/calibration
 * Get existing calibration for the authenticated child
 */
router.get('/calibration', authenticateChild, (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.child!.child_id;
    const db = getDatabase();

    const calibration = db.prepare(`
      SELECT * FROM voice_calibrations WHERE child_id = ?
    `).get(childId) as {
      amplitude_threshold: number;
      peak_threshold: number;
      baseline_amplitude: number;
      baseline_peak: number;
      excited_amplitude: number;
      excited_peak: number;
      loud_amplitude: number;
      loud_peak: number;
      confidence: string;
      calibrated_at: string;
    } | undefined;

    if (!calibration) {
      res.json({ hasCalibration: false });
      return;
    }

    res.json({
      hasCalibration: true,
      calibration: {
        amplitudeThreshold: calibration.amplitude_threshold,
        peakThreshold: calibration.peak_threshold,
        baselineAmplitude: calibration.baseline_amplitude,
        baselinePeak: calibration.baseline_peak,
        excitedAmplitude: calibration.excited_amplitude,
        excitedPeak: calibration.excited_peak,
        loudAmplitude: calibration.loud_amplitude,
        loudPeak: calibration.loud_peak,
        confidence: calibration.confidence,
        calibratedAt: calibration.calibrated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/child/calibration
 * Save calibration results for the authenticated child
 */
router.post('/calibration', authenticateChild, (req: Request, res: Response, next: NextFunction) => {
  try {
    const childId = req.child!.child_id;
    const {
      amplitudeThreshold,
      peakThreshold,
      baselineAmplitude,
      baselinePeak,
      excitedAmplitude,
      excitedPeak,
      loudAmplitude,
      loudPeak,
      confidence,
    } = req.body;

    if (amplitudeThreshold === undefined || peakThreshold === undefined) {
      throw ApiError.badRequest('amplitudeThreshold and peakThreshold are required');
    }

    const db = getDatabase();

    // Upsert calibration (replace if exists)
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
      amplitudeThreshold,
      peakThreshold,
      baselineAmplitude || null,
      baselinePeak || null,
      excitedAmplitude || null,
      excitedPeak || null,
      loudAmplitude || null,
      loudPeak || null,
      confidence || null
    );

    logger.info(`Saved calibration for child ${childId}: amp=${amplitudeThreshold}, peak=${peakThreshold}`);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

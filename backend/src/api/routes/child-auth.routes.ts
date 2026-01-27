/**
 * Child Authentication Routes
 * Handles child login and calibration for the boardgame
 */

import { Router, Request, Response, NextFunction } from 'express';
import { loginChild, getStudentById } from '../../services/student/index.js';
import { authenticateChild } from '../middleware/childAuth.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  getCalibrationByChildId,
  saveCalibration,
} from '../../services/calibration/index.js';
import { validateBody, LoginSchema, CalibrationSchema } from '../validation/index.js';

const router = Router();

/**
 * POST /api/child/login
 * Login a child with username and password
 */
router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
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
    const calibration = getCalibrationByChildId(childId);

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
router.post(
  '/calibration',
  authenticateChild,
  validateBody(CalibrationSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const childId = req.child!.child_id;
      saveCalibration(childId, req.body);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

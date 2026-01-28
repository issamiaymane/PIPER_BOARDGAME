/**
 * Authentication Routes
 * Handles therapist registration, login, and profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import { registerTherapist, loginTherapist, getTherapistById } from '../../services/auth/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';
import { authRateLimit, registerRateLimit } from '../middleware/rateLimit.js';

const router = Router();

/**
 * POST /register
 * Register a new therapist
 */
router.post(
  '/register',
  registerRateLimit,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await registerTherapist(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        next(ApiError.badRequest(error.message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * POST /login
 * Login a therapist
 */
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await loginTherapist(req.body);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        next(ApiError.unauthorized(error.message));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /me
 * Get current therapist info
 */
router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const therapist = getTherapistById(req.therapist!.therapist_id);
    if (!therapist) {
      throw ApiError.notFound('Therapist not found');
    }
    res.json({ therapist });
  } catch (error) {
    next(error);
  }
});

export default router;

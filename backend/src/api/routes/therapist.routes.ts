import { Router, Request, Response } from 'express';
import { registerTherapist, loginTherapist, getTherapistById } from '../../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import type { RegisterRequest, LoginRequest } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/therapist/register
 * Register a new therapist
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterRequest = req.body;

    if (!data.email || !data.password || !data.first_name || !data.last_name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (data.password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const result = await registerTherapist(data);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    logger.error('Registration error:', error);
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/therapist/login
 * Login a therapist
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    if (!data.email || !data.password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const result = await loginTherapist(data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

/**
 * GET /api/therapist/me
 * Get current therapist info
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    const therapist = getTherapistById(req.therapist!.therapist_id);
    if (!therapist) {
      res.status(404).json({ error: 'Therapist not found' });
      return;
    }
    res.json(therapist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get therapist info' });
  }
});

export default router;

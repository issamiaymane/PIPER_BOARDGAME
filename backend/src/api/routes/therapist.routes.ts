import { Router, Request, Response } from 'express';
import { registerTherapist, loginTherapist, getTherapistById } from '../../services/auth.service.js';
import {
  createStudent,
  listStudentsByTherapist,
  getStudentForTherapist,
  deleteStudent,
} from '../../services/student.service.js';
import { authenticate } from '../middleware/auth.js';
import type { RegisterRequest, LoginRequest, CreateChildRequest } from '../../types/index.js';
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

// ============================================
// Student/Child Routes
// ============================================

/**
 * GET /api/therapist/students
 * List all students for the logged-in therapist
 */
router.get('/students', authenticate, (req: Request, res: Response) => {
  try {
    const students = listStudentsByTherapist(req.therapist!.therapist_id);
    res.json(students);
  } catch (error) {
    logger.error('List students error:', error);
    res.status(500).json({ error: 'Failed to list students' });
  }
});

/**
 * POST /api/therapist/students
 * Create a new student (child account)
 */
router.post('/students', authenticate, async (req: Request, res: Response) => {
  try {
    const data: CreateChildRequest = req.body;

    if (!data.first_name || !data.last_name) {
      res.status(400).json({ error: 'First and last name required' });
      return;
    }

    if (!data.username || !data.password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    if (data.password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }

    const student = await createStudent(req.therapist!.therapist_id, data);
    res.status(201).json(student);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';
    logger.error('Create student error:', error);
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/therapist/students/:id
 * Get a student by ID
 */
router.get('/students/:id', authenticate, (req: Request, res: Response) => {
  try {
    const student = getStudentForTherapist(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get student' });
  }
});

/**
 * DELETE /api/therapist/students/:id
 * Delete a student
 */
router.delete('/students/:id', authenticate, (req: Request, res: Response) => {
  try {
    const success = deleteStudent(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!success) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;

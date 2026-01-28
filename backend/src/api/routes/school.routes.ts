/**
 * School Routes
 * Handles school CRUD operations for therapist dashboard
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
} from '../../services/school/index.js';

const router = Router();

/**
 * GET /schools
 * List all schools with member counts
 */
router.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = listSchools();
    res.json(schools);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /schools
 * Create a new school
 */
router.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contact_name, contact_email, contact_phone, admin_id, member_ids } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('School name is required');
    }

    const school = createSchool({ name, contact_name, contact_email, contact_phone, admin_id, member_ids });
    res.status(201).json(school);
  } catch (error) {
    if (error instanceof Error) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
});

/**
 * PUT /schools/:id
 * Update a school
 */
router.put('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, contact_name, contact_email, contact_phone } = req.body;

    const school = updateSchool(Number(id), { name, contact_name, contact_email, contact_phone });
    res.json(school);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        next(ApiError.notFound(error.message));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /schools/:id
 * Delete a school
 */
router.delete('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    deleteSchool(Number(id));
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        next(ApiError.notFound(error.message));
      } else {
        next(ApiError.badRequest(error.message));
      }
    } else {
      next(error);
    }
  }
});

export default router;

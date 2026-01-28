/**
 * Member Routes
 * Handles member CRUD operations for therapist dashboard
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  listMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../../services/member/index.js';
import { config } from '../../config/index.js';

const router = Router();
const { minPasswordLength } = config.auth;

/**
 * GET /members
 * List all members with school names
 */
router.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = listMembers();
    res.json(members);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /members
 * Invite/create a new member
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, roles, school_id } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Member name is required');
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw ApiError.badRequest('Member email is required');
    }

    if (!password || typeof password !== 'string' || password.length < minPasswordLength) {
      throw ApiError.badRequest(`Password is required (minimum ${minPasswordLength} characters)`);
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      throw ApiError.badRequest('At least one role is required');
    }

    const member = await createMember({ name, email, password, roles, school_id });
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof Error) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
});

/**
 * PUT /members/:id
 * Update a member
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, password, roles, school_id } = req.body;

    // Validate password if provided
    if (password !== undefined && (typeof password !== 'string' || password.length < minPasswordLength)) {
      throw ApiError.badRequest(`Password must be at least ${minPasswordLength} characters`);
    }

    const member = await updateMember(Number(id), { name, email, password, roles, school_id });
    res.json(member);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Member not found') {
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
 * DELETE /members/:id
 * Delete a member
 */
router.delete('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    deleteMember(Number(id));
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Member not found') {
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

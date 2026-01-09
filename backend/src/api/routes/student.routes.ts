/**
 * Student Routes
 * Handles student/child CRUD operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createStudent,
  listStudentsByTherapist,
  getStudentForTherapist,
  updateStudent,
  deleteStudent,
} from '../../services/student/index.js';
import { authenticate } from '../middleware/auth.js';
import {
  validate,
  validateParams,
  createStudentSchema,
  updateStudentSchema,
  idParamSchema,
} from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /students
 * List all students for the logged-in therapist
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = listStudentsByTherapist(req.therapist!.therapist_id);
    res.json(students);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /students
 * Create a new student
 */
router.post(
  '/',
  validate(createStudentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await createStudent(req.therapist!.therapist_id, req.body);
      res.status(201).json(student);
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
 * GET /students/:id
 * Get a student by ID
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);
      const student = getStudentForTherapist(studentId, req.therapist!.therapist_id);

      if (!student) {
        throw ApiError.notFound('Student not found');
      }

      res.json(student);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /students/:id
 * Update a student
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(updateStudentSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);
      const updatedStudent = updateStudent(
        studentId,
        req.therapist!.therapist_id,
        req.body
      );

      if (!updatedStudent) {
        throw ApiError.notFound('Student not found');
      }

      res.json(updatedStudent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /students/:id
 * Delete a student
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);
      const success = deleteStudent(studentId, req.therapist!.therapist_id);

      if (!success) {
        throw ApiError.notFound('Student not found');
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

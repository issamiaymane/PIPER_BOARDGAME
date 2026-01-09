/**
 * Goal Routes
 * Handles IEP goals PDF upload, extraction, and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { getStudentForTherapist } from '../../services/student/index.js';
import {
  validatePdfFile,
  saveGoalsPdf,
  updateStudentGoalsPdfMetadata,
  getGoalsPdfPath,
  deleteGoalsPdf,
  extractGoalsData,
  PasswordRequiredError,
  createGoalsFromExtraction,
  listGoalsByStudent,
  deleteAllGoalsForStudent,
} from '../../services/goal/index.js';
import { authenticate } from '../middleware/auth.js';
import {
  validate,
  validateParams,
  confirmGoalsSchema,
  idParamSchema,
} from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const router = Router();

router.use(authenticate);

function getVerifiedStudent(studentId: number, therapistId: number) {
  const student = getStudentForTherapist(studentId, therapistId);
  if (!student) {
    throw ApiError.notFound('Student not found');
  }
  return student;
}

/**
 * POST /students/:id/goals/upload
 * Upload IEP goals PDF and extract data
 */
router.post(
  '/:id/goals/upload',
  validateParams(idParamSchema),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }

      const validation = validatePdfFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      if (!validation.valid) {
        throw ApiError.badRequest(validation.error || 'Invalid PDF file');
      }

      const { filePath } = await saveGoalsPdf(
        studentId,
        req.file.buffer,
        req.file.originalname
      );

      updateStudentGoalsPdfMetadata(studentId, filePath, req.file.originalname);

      const password = req.body?.password || undefined;

      const extractedData = await extractGoalsData(req.file.buffer, password);

      res.json({
        success: true,
        pdf_url: `/api/therapist/students/${studentId}/goals/pdf`,
        extracted_data: extractedData,
        extraction_notes: extractedData.extraction_notes,
      });
    } catch (error) {
      if (error instanceof PasswordRequiredError) {
        next(ApiError.unauthorized('PDF is password protected', 'PASSWORD_REQUIRED'));
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /students/:id/goals/pdf
 * Serve the IEP goals PDF file
 */
router.get(
  '/:id/goals/pdf',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      const student = getVerifiedStudent(studentId, req.therapist!.therapist_id);

      const pdfPath = getGoalsPdfPath(studentId);
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw ApiError.notFound('No goals PDF found');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${student.goals_pdf_original_name || 'goals.pdf'}"`
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /students/:id/goals/confirm
 * Save confirmed/edited goals
 */
router.post(
  '/:id/goals/confirm',
  validateParams(idParamSchema),
  validate(confirmGoalsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);
      const { goals } = req.body;

      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      // Delete existing goals and create new ones from extraction
      deleteAllGoalsForStudent(studentId);
      const createdGoals = createGoalsFromExtraction(studentId, goals);

      res.json({
        success: true,
        goals: createdGoals,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /students/:id/goals
 * Get all goals for a student
 */
router.get(
  '/:id/goals',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      const goals = listGoalsByStudent(studentId);
      res.json({ goals });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /students/:id/goals/pdf
 * Delete the goals PDF
 */
router.delete(
  '/:id/goals/pdf',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      await deleteGoalsPdf(studentId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

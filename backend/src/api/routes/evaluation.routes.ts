/**
 * Evaluation Routes
 * Handles PDF upload, extraction, and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { getStudentForTherapist, updateStudent } from '../../services/student.service.js';
import {
  validatePdfFile,
  saveEvaluationPdf,
  updateStudentPdfMetadata,
  getEvaluationPdfPath,
  deleteEvaluationPdf,
  extractEvaluationData,
  PasswordRequiredError,
} from '../../services/evaluation/index.js';
import { authenticate } from '../middleware/auth.js';
import {
  validate,
  validateParams,
  confirmEvaluationSchema,
  idParamSchema,
} from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { UpdateChildRequest, EvalData } from '../../types/index.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Helper to verify student ownership
 */
function getVerifiedStudent(studentId: number, therapistId: number) {
  const student = getStudentForTherapist(studentId, therapistId);
  if (!student) {
    throw ApiError.notFound('Student not found');
  }
  return student;
}

/**
 * POST /students/:id/evaluation/upload
 * Upload evaluation PDF and extract data
 */
router.post(
  '/:id/evaluation/upload',
  validateParams(idParamSchema),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      // Check if file was uploaded
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }

      // Validate PDF file
      const validation = validatePdfFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      if (!validation.valid) {
        throw ApiError.badRequest(validation.error || 'Invalid PDF file');
      }

      // Save PDF file
      const { filePath } = await saveEvaluationPdf(
        studentId,
        req.file.buffer,
        req.file.originalname
      );

      // Update student metadata
      updateStudentPdfMetadata(studentId, filePath, req.file.originalname);

      // Get password if provided
      const password = req.body?.password || undefined;

      // Extract data from PDF using AI
      const extractedData = await extractEvaluationData(req.file.buffer, password);

      res.json({
        success: true,
        pdf_url: `/api/therapist/students/${studentId}/evaluation/pdf`,
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
 * GET /students/:id/evaluation/pdf
 * Serve the evaluation PDF file
 */
router.get(
  '/:id/evaluation/pdf',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = getVerifiedStudent(studentId, req.therapist!.therapist_id);

      // Get PDF path
      const pdfPath = getEvaluationPdfPath(studentId);
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw ApiError.notFound('No evaluation PDF found');
      }

      // Serve PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${student.eval_pdf_original_name || 'evaluation.pdf'}"`
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /students/:id/evaluation/confirm
 * Save confirmed/edited evaluation data
 */
/**
 * Transform structured extraction format to plain EvalData
 * Frontend sends: { field: { value, confidence, source_hint } }
 * Database stores: { field: value }
 */
function extractEvalDataValues(structuredData: Record<string, { value: unknown; confidence?: number; source_hint?: string }>): EvalData {
  const evalData: EvalData = {};

  for (const [key, fieldData] of Object.entries(structuredData)) {
    if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
      const value = fieldData.value;

      // Only include non-null, non-empty values
      if (value !== null && value !== undefined && value !== '') {
        (evalData as Record<string, unknown>)[key] = value;
      }
    }
  }

  return evalData;
}

router.post(
  '/:id/evaluation/confirm',
  validateParams(idParamSchema),
  validate(confirmEvaluationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);
      const { eval_data, service_type } = req.body;

      console.log('🔍 CONFIRM EVAL ENDPOINT - Received body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 eval_data (structured):', JSON.stringify(eval_data, null, 2));
      console.log('🔍 service_type:', service_type);

      // Transform structured format to plain values for database storage
      const plainEvalData = extractEvalDataValues(eval_data);
      console.log('🔍 plainEvalData (extracted values):', JSON.stringify(plainEvalData, null, 2));

      // Build update data
      const updateData: UpdateChildRequest = { eval_data: plainEvalData };
      if (service_type) {
        updateData.problem_type = service_type;
      }

      console.log('🔍 Calling updateStudent with:', JSON.stringify(updateData, null, 2));

      // Update student
      const updatedStudent = updateStudent(
        studentId,
        req.therapist!.therapist_id,
        updateData
      );

      if (!updatedStudent) {
        throw ApiError.notFound('Student not found');
      }

      console.log('✅ Student updated successfully');

      res.json({
        success: true,
        student: updatedStudent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /students/:id/evaluation/pdf
 * Delete the evaluation PDF
 */
router.delete(
  '/:id/evaluation/pdf',
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      getVerifiedStudent(studentId, req.therapist!.therapist_id);

      await deleteEvaluationPdf(studentId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

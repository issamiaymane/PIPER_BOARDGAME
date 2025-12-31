import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { registerTherapist, loginTherapist, getTherapistById } from '../../services/auth.service.js';
import {
  createStudent,
  listStudentsByTherapist,
  getStudentForTherapist,
  updateStudent,
  deleteStudent,
} from '../../services/student.service.js';
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
import type { RegisterRequest, LoginRequest, CreateChildRequest, UpdateChildRequest, EvalData } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

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

// ============================================
// Evaluation Upload Routes
// ============================================

/**
 * POST /api/therapist/students/:id/evaluation/upload
 * Upload evaluation PDF and extract data
 */
router.post(
  '/students/:id/evaluation/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = getStudentForTherapist(studentId, req.therapist!.therapist_id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Validate PDF file
      const validation = validatePdfFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
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
      logger.error('Evaluation upload error:', error);

      if (error instanceof PasswordRequiredError) {
        res.status(401).json({
          error: 'PDF is password protected',
          code: 'PASSWORD_REQUIRED',
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/therapist/students/:id/evaluation/pdf
 * Serve the evaluation PDF file
 */
router.get(
  '/students/:id/evaluation/pdf',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = getStudentForTherapist(studentId, req.therapist!.therapist_id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Get PDF path
      const pdfPath = getEvaluationPdfPath(studentId);
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        res.status(404).json({ error: 'No evaluation PDF found' });
        return;
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
      logger.error('Evaluation PDF retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve PDF' });
    }
  }
);

/**
 * POST /api/therapist/students/:id/evaluation/confirm
 * Save confirmed/edited evaluation data
 */
router.post(
  '/students/:id/evaluation/confirm',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);
      const { eval_data, service_type } = req.body;

      if (!eval_data) {
        res.status(400).json({ error: 'Evaluation data required' });
        return;
      }

      // Build update data
      const updateData: UpdateChildRequest = { eval_data: eval_data as EvalData };
      if (service_type && ['language', 'articulation', 'both'].includes(service_type)) {
        updateData.problem_type = service_type;
      }

      // Update student
      const updatedStudent = updateStudent(
        studentId,
        req.therapist!.therapist_id,
        updateData
      );

      if (!updatedStudent) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.json({
        success: true,
        student: updatedStudent,
      });
    } catch (error) {
      logger.error('Evaluation confirm error:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * DELETE /api/therapist/students/:id/evaluation/pdf
 * Delete the evaluation PDF
 */
router.delete(
  '/students/:id/evaluation/pdf',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = getStudentForTherapist(studentId, req.therapist!.therapist_id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      await deleteEvaluationPdf(studentId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Evaluation PDF deletion error:', error);
      res.status(500).json({ error: 'Failed to delete PDF' });
    }
  }
);

export default router;

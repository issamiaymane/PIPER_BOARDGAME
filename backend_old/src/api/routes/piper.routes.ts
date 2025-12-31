/**
 * PIPER API Routes
 * All endpoints for the PIPER language therapy module
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { authenticatePiper } from '../middleware/piper-auth';
import { authenticateChild } from '../middleware/child-auth';
import therapistService from '../../services/piper/auth/therapist.service';
import studentService from '../../services/piper/students/student.service';
import {
  validatePdfFile,
  saveEvaluationPdf,
  updateStudentPdfMetadata,
  getEvaluationPdfPath,
  deleteEvaluationPdf,
} from '../../services/piper/evaluation/evaluation-upload.service';
import {
  extractEvaluationData,
  PasswordRequiredError as EvalPasswordRequiredError,
} from '../../services/piper/evaluation/evaluation-extraction.service';
import {
  validateGoalPdfFile,
  saveGoalPdf,
  updateStudentGoalPdfMetadata,
  getGoalPdfPath,
  deleteGoalPdf,
} from '../../services/piper/goal/goal-upload.service';
import {
  extractGoalData,
  PasswordRequiredError as GoalPasswordRequiredError,
} from '../../services/piper/goal/goal-extraction.service';
import childService from '../../services/piper/auth/child.service';
import goalService from '../../services/piper/goals/goal.service';
import thresholdService from '../../services/piper/goals/threshold.service';
import feedbackService, { FeedbackRequest } from '../../services/piper/ai/feedback.service';
import goalAIService from '../../services/piper/ai/goal-ai.service';
import {
  RegisterRequest,
  LoginRequest,
  CreateStudentRequest,
  UpdateStudentRequest,
  CreateIEPGoalRequest,
  UpdateIEPGoalRequest,
  ChildLoginRequest,
  IEP_GOAL_CATEGORY_MAPPINGS,
  IEP_GOAL_TYPE_LABELS,
  EvaluationDataForGeneration,
  EvalData,
} from '../../types/piper';
import { logger } from '../../utils/logger';

const router = Router();

// Configure multer for file uploads (memory storage for validation before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ============================================
// Auth Routes
// ============================================

/**
 * POST /api/piper/auth/register
 * Register a new therapist
 */
router.post('/auth/register', async (req: Request, res: Response) => {
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

    const result = await therapistService.registerTherapist(data);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    logger.error('Registration error:', error);
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/piper/auth/login
 * Login a therapist
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    if (!data.email || !data.password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const result = await therapistService.loginTherapist(data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

/**
 * GET /api/piper/auth/me
 * Get current therapist info
 */
router.get('/auth/me', authenticatePiper, (req: Request, res: Response) => {
  try {
    const therapist = therapistService.getTherapistById(req.therapist!.therapist_id);
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
// Child Auth Routes (for children/students)
// ============================================

/**
 * POST /api/piper/child/login
 * Login a child to the boardgame
 */
router.post('/child/login', async (req: Request, res: Response) => {
  try {
    const data: ChildLoginRequest = req.body;

    if (!data.username || !data.password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const result = await childService.childLogin(data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

/**
 * GET /api/piper/child/me
 * Get current child info and session state
 */
router.get('/child/me', authenticateChild, (req: Request, res: Response) => {
  try {
    const child = childService.getChildById(req.child!.child_id);
    if (!child) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const sessionState = childService.getChildSessionState(req.child!.child_id);
    res.json({ child, ...sessionState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get child info' });
  }
});

/**
 * POST /api/piper/child/demo-seen
 * Mark that child has seen the demo video
 */
router.post('/child/demo-seen', authenticateChild, (req: Request, res: Response) => {
  try {
    childService.markDemoSeen(req.child!.child_id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update demo status' });
  }
});

// ============================================
// Student Routes (Therapist Admin)
// ============================================

/**
 * GET /api/piper/students
 * List all students for the logged-in therapist
 */
router.get('/students', authenticatePiper, (req: Request, res: Response) => {
  try {
    const students = studentService.listStudentsByTherapist(
      req.therapist!.therapist_id
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list students' });
  }
});

/**
 * POST /api/piper/students
 * Create a new student (child account)
 */
router.post('/students', authenticatePiper, async (req: Request, res: Response) => {
  try {
    const data: CreateStudentRequest = req.body;

    if (!data.first_name || !data.last_name) {
      res.status(400).json({ error: 'First and last name required' });
      return;
    }

    if (!data.username || !data.password) {
      res.status(400).json({ error: 'Username and password required for child account' });
      return;
    }

    if (data.password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }

    // problem_type is optional - it will be set from AI when uploading evaluation PDF
    if (data.problem_type && !['language', 'articulation'].includes(data.problem_type)) {
      res.status(400).json({ error: 'Problem type must be "language" or "articulation"' });
      return;
    }

    const student = await studentService.createStudent(
      req.therapist!.therapist_id,
      data
    );
    res.status(201).json(student);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/piper/students/:id
 * Get a student by ID
 */
router.get('/students/:id', authenticatePiper, (req: Request, res: Response) => {
  try {
    const student = studentService.getStudentByIdForTherapist(
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
 * PUT /api/piper/students/:id
 * Update a student
 */
router.put('/students/:id', authenticatePiper, async (req: Request, res: Response) => {
  try {
    const data: UpdateStudentRequest = req.body;
    const student = await studentService.updateStudent(
      parseInt(req.params.id),
      req.therapist!.therapist_id,
      data
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update student';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/piper/students/:id
 * Delete a student
 */
router.delete('/students/:id', authenticatePiper, (req: Request, res: Response) => {
  try {
    const success = studentService.deleteStudent(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!success) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ============================================
// Evaluation Upload Routes
// ============================================

/**
 * POST /api/piper/students/:id/evaluation/upload
 * Upload evaluation PDF and extract data
 */
router.post(
  '/students/:id/evaluation/upload',
  authenticatePiper,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Validate the PDF file
      const validation = validatePdfFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Save the PDF file
      const { filePath } = await saveEvaluationPdf(
        studentId,
        req.file.buffer,
        req.file.originalname
      );

      // Update student metadata
      updateStudentPdfMetadata(studentId, filePath, req.file.originalname);

      // Get password if provided (for password-protected PDFs)
      const password = req.body?.password || undefined;

      // Extract data from PDF using AI
      const extractedData = await extractEvaluationData(req.file.buffer, password);

      // Return the result
      res.json({
        success: true,
        pdf_url: `/api/piper/students/${studentId}/evaluation/pdf`,
        extracted_data: extractedData,
        extraction_notes: extractedData.extraction_notes,
      });
    } catch (error) {
      logger.error('Evaluation upload error:', error);

      // Check if PDF requires password
      if (error instanceof EvalPasswordRequiredError) {
        res.status(401).json({
          error: 'PDF is password protected',
          code: 'PASSWORD_REQUIRED'
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/piper/students/:id/evaluation/pdf
 * Serve the evaluation PDF file
 */
router.get(
  '/students/:id/evaluation/pdf',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

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

      // Serve the PDF
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
 * POST /api/piper/students/:id/evaluation/confirm
 * Save confirmed/edited evaluation data
 */
router.post(
  '/students/:id/evaluation/confirm',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);
      const { eval_data, service_type } = req.body;

      if (!eval_data) {
        res.status(400).json({ error: 'Evaluation data required' });
        return;
      }

      // Build update data - include problem_type if service_type was detected
      const updateData: UpdateStudentRequest = { eval_data };
      if (service_type && ['language', 'articulation', 'both'].includes(service_type)) {
        updateData.problem_type = service_type;
      }

      // Update student with evaluation data and optionally problem_type
      const updatedStudent = await studentService.updateStudent(
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
 * DELETE /api/piper/students/:id/evaluation/pdf
 * Delete the evaluation PDF
 */
router.delete(
  '/students/:id/evaluation/pdf',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

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

// ============================================
// Goal Upload Routes
// ============================================

/**
 * POST /api/piper/students/:id/goals/upload
 * Upload IEP goals PDF and extract goal data
 */
router.post(
  '/students/:id/goals/upload',
  authenticatePiper,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Validate the PDF file
      const validation = validateGoalPdfFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Save the PDF file
      const { filePath } = await saveGoalPdf(
        studentId,
        req.file.buffer,
        req.file.originalname
      );

      // Update student metadata
      updateStudentGoalPdfMetadata(studentId, filePath, req.file.originalname);

      // Get student's service type from evaluation data (problem_type)
      const serviceType = student.problem_type as 'language' | 'articulation' | null;

      // Get password if provided (for password-protected PDFs)
      const password = req.body?.password || undefined;

      // Extract goal data from PDF using AI, passing the service type for proper classification
      const extractedData = await extractGoalData(req.file.buffer, serviceType, password);

      // Return the result with service type from student's evaluation data
      res.json({
        success: true,
        pdf_url: `/api/piper/students/${studentId}/goals/pdf`,
        extracted_data: extractedData,
        extraction_notes: extractedData.extraction_notes,
        service_type: serviceType, // From student's evaluation data, not extracted from goals
      });
    } catch (error) {
      logger.error('Goal upload error:', error);

      // Check if PDF requires password
      if (error instanceof GoalPasswordRequiredError) {
        res.status(401).json({
          error: 'PDF is password protected',
          code: 'PASSWORD_REQUIRED'
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/piper/students/:id/goals/pdf
 * Serve the goals PDF file
 */
router.get(
  '/students/:id/goals/pdf',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Get PDF path
      const pdfPath = getGoalPdfPath(studentId);

      if (!pdfPath || !fs.existsSync(pdfPath)) {
        res.status(404).json({ error: 'No goals PDF found' });
        return;
      }

      // Serve the PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${student.goal_pdf_original_name || 'goals.pdf'}"`
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Goals PDF retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve PDF' });
    }
  }
);

/**
 * POST /api/piper/students/:id/goals/confirm
 * Save extracted goals to the database
 */
router.post(
  '/students/:id/goals/confirm',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);
      const { baseline, goals } = req.body;

      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        res.status(400).json({ error: 'At least one goal is required' });
        return;
      }

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      // Create each goal (baseline is now per-goal, top-level baseline is deprecated)
      const createdGoals = [];
      for (const goalData of goals) {
        const goal = goalService.createGoal(studentId, req.therapist!.therapist_id, {
          goal_type: goalData.goal_type,
          goal_description: goalData.description,
          target_percentage: goalData.target_accuracy || 80,
          sessions_to_confirm: goalData.sessions_to_confirm || 3,
          expected_prompt_level: 2, // Default to MOD
          deadline: goalData.deadline,
          baseline: goalData.baseline || baseline, // Prefer per-goal baseline, fallback to top-level (deprecated)
          comments: goalData.comments,
        });
        createdGoals.push(goal);
      }

      res.json({
        success: true,
        goals: createdGoals,
        count: createdGoals.length,
      });
    } catch (error) {
      logger.error('Goals confirm error:', error);
      const message = error instanceof Error ? error.message : 'Failed to save goals';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * DELETE /api/piper/students/:id/goals/pdf
 * Delete the goals PDF
 */
router.delete(
  '/students/:id/goals/pdf',
  authenticatePiper,
  async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);

      // Verify student belongs to therapist
      const student = studentService.getStudentByIdForTherapist(
        studentId,
        req.therapist!.therapist_id
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      await deleteGoalPdf(studentId);

      res.json({ success: true });
    } catch (error) {
      logger.error('Goals PDF deletion error:', error);
      res.status(500).json({ error: 'Failed to delete PDF' });
    }
  }
);

// ============================================
// IEP Goal Routes
// ============================================

/**
 * GET /api/piper/goal-types
 * Get available goal types and their category mappings
 */
router.get('/goal-types', (_req: Request, res: Response) => {
  const goalTypes = Object.entries(IEP_GOAL_TYPE_LABELS).map(([key, label]) => ({
    type: key,
    label,
    categories: IEP_GOAL_CATEGORY_MAPPINGS[key as keyof typeof IEP_GOAL_CATEGORY_MAPPINGS] || [],
  }));
  res.json(goalTypes);
});

/**
 * GET /api/piper/students/:studentId/goals
 * List goals for a student
 */
router.get('/students/:studentId/goals', authenticatePiper, (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active === 'true';
    const goals = goalService.listGoalsByStudent(
      parseInt(req.params.studentId),
      req.therapist!.therapist_id,
      activeOnly
    );
    // Transform goals to include goal_types array parsed from mapped_categories
    const goalsWithTypes = goals.map(goal => ({
      ...goal,
      goal_types: goalService.parseMappedCategories(goal),
    }));
    res.json(goalsWithTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list goals' });
  }
});

/**
 * POST /api/piper/students/:studentId/goals
 * Create a new IEP goal
 */
router.post('/students/:studentId/goals', authenticatePiper, (req: Request, res: Response) => {
  try {
    const data: CreateIEPGoalRequest = req.body;

    if (!data.goal_type || !data.goal_description) {
      res.status(400).json({ error: 'Goal type and description required' });
      return;
    }

    const goal = goalService.createGoal(
      parseInt(req.params.studentId),
      req.therapist!.therapist_id,
      data
    );
    // Include goal_types in response
    res.status(201).json({
      ...goal,
      goal_types: goalService.parseMappedCategories(goal),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create goal';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/piper/goals/:id
 * Get a goal by ID
 */
router.get('/goals/:id', authenticatePiper, (req: Request, res: Response) => {
  try {
    const goal = goalService.getGoalForTherapist(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    // Include goal_types in response
    res.json({
      ...goal,
      goal_types: goalService.parseMappedCategories(goal),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get goal' });
  }
});

/**
 * PUT /api/piper/goals/:id
 * Update a goal
 */
router.put('/goals/:id', authenticatePiper, (req: Request, res: Response) => {
  try {
    const data: UpdateIEPGoalRequest = req.body;
    const goal = goalService.updateGoal(
      parseInt(req.params.id),
      req.therapist!.therapist_id,
      data
    );

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    // Include goal_types in response
    res.json({
      ...goal,
      goal_types: goalService.parseMappedCategories(goal),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

/**
 * DELETE /api/piper/goals/:id
 * Delete a goal
 */
router.delete('/goals/:id', authenticatePiper, (req: Request, res: Response) => {
  try {
    const success = goalService.deleteGoal(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!success) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

/**
 * GET /api/piper/goals/:id/progress
 * Get progress stats for a goal
 */
router.get('/goals/:id/progress', authenticatePiper, (req: Request, res: Response) => {
  try {
    const goal = goalService.getGoalForTherapist(
      parseInt(req.params.id),
      req.therapist!.therapist_id
    );

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const progress = thresholdService.calculateGoalProgress(goal.id);
    const status = thresholdService.getThresholdStatus(goal.id);

    res.json({
      goal,
      progress,
      threshold_status: status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get goal progress' });
  }
});

/**
 * POST /api/piper/goals/generate
 * Generate AI-powered IEP goals for a student
 */
router.post('/goals/generate', authenticatePiper, async (req: Request, res: Response) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      res.status(400).json({ error: 'Student ID required' });
      return;
    }

    // Get student with verification
    const student = studentService.getStudentByIdForTherapist(
      student_id,
      req.therapist!.therapist_id
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found or access denied' });
      return;
    }

    // Parse eval_data if it's a string
    let evalData: EvalData;
    if (student.eval_data) {
      try {
        evalData = typeof student.eval_data === 'string'
          ? JSON.parse(student.eval_data)
          : student.eval_data;
      } catch {
        evalData = {};
      }
    } else {
      evalData = {};
    }

    // Build evaluation data for generation
    const evaluationData: EvaluationDataForGeneration = {
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      grade_level: student.grade_level,
      diagnosis: student.diagnosis,
      problem_type: student.problem_type,
      eval_data: evalData,
    };

    // Validate evaluation data
    const validationError = goalAIService.validateEvaluationData(evaluationData);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    // Generate goals
    logger.info(`Generating IEP goals for student ${student_id}`);
    const result = await goalAIService.generateIEPGoals(evaluationData);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate goals';
    logger.error('Goal generation error:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/piper/goals/:id/review
 * Mark goal as SLP reviewed
 */
router.put(
  '/goals/:id/review',
  authenticatePiper,
  (req: Request, res: Response) => {
    try {
      const goalId = parseInt(req.params.id);
      const { slp_reviewed } = req.body;

      const goal = goalService.markGoalReviewed(
        goalId,
        req.therapist!.therapist_id,
        slp_reviewed !== false
      );

      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      res.json({ success: true, goal });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update goal review status';
      logger.error('Goal review update error:', error);
      res.status(500).json({ error: message });
    }
  }
);

// ============================================
// AI Feedback Routes
// ============================================

/**
 * POST /api/piper/child/feedback
 * Generate AI feedback for a trial (for logged-in child)
 */
router.post('/child/feedback', authenticateChild, async (req: Request, res: Response) => {
  try {
    const { category, question, expected_answer, user_answer, is_correct, prompt_level } = req.body;

    if (!category || !question || expected_answer === undefined || is_correct === undefined) {
      res.status(400).json({ error: 'category, question, expected_answer, and is_correct required' });
      return;
    }

    // Get child to determine problem_type
    const child = childService.getChildById(req.child!.child_id);
    if (!child) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    // Validate prompt_level if provided (1=MAX, 2=MOD, 3=MIN)
    const validPromptLevel = [1, 2, 3].includes(prompt_level) ? prompt_level : 2;

    const feedbackRequest: FeedbackRequest = {
      problem_type: child.problem_type,
      category,
      question,
      expected_answer,
      user_answer: user_answer || '',
      is_correct,
      child_name: child.first_name,
      prompt_level: validPromptLevel as 1 | 2 | 3,
    };

    const result = await feedbackService.generateFeedback(feedbackRequest);
    res.json(result);
  } catch (error) {
    logger.error('Feedback generation error:', error);
    // Return quick feedback on error
    const quickFeedback = feedbackService.generateQuickFeedback(
      req.body.is_correct,
      req.body.expected_answer,
      req.body.user_answer
    );
    res.json({ feedback: quickFeedback });
  }
});

/**
 * POST /api/piper/feedback
 * Generate AI feedback (public endpoint for non-logged-in users)
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { problem_type, category, question, expected_answer, user_answer, is_correct, child_name, prompt_level } = req.body;

    if (!problem_type || !category || !question || expected_answer === undefined || is_correct === undefined) {
      res.status(400).json({ error: 'problem_type, category, question, expected_answer, and is_correct required' });
      return;
    }

    if (!['language', 'articulation'].includes(problem_type)) {
      res.status(400).json({ error: 'problem_type must be "language" or "articulation"' });
      return;
    }

    // Validate prompt_level if provided (1=MAX, 2=MOD, 3=MIN)
    const validPromptLevel = [1, 2, 3].includes(prompt_level) ? prompt_level : 2;

    const feedbackRequest: FeedbackRequest = {
      problem_type,
      category,
      question,
      expected_answer,
      user_answer: user_answer || '',
      is_correct,
      child_name,
      prompt_level: validPromptLevel as 1 | 2 | 3,
    };

    const result = await feedbackService.generateFeedback(feedbackRequest);
    res.json(result);
  } catch (error) {
    logger.error('Feedback generation error:', error);
    // Return quick feedback on error
    const quickFeedback = feedbackService.generateQuickFeedback(
      req.body.is_correct,
      req.body.expected_answer,
      req.body.user_answer
    );
    res.json({ feedback: quickFeedback });
  }
});

export default router;

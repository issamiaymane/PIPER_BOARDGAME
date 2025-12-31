/**
 * Routes Index
 * Combines all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import evaluationRoutes from './evaluation.routes.js';
import goalRoutes from './goal.routes.js';

const router = Router();

// Mount routes
router.use('/', authRoutes);           // /api/therapist/register, /login, /me
router.use('/students', studentRoutes); // /api/therapist/students/*
router.use('/students', evaluationRoutes); // /api/therapist/students/:id/evaluation/*
router.use('/students', goalRoutes);   // /api/therapist/students/:id/goals/*

export default router;

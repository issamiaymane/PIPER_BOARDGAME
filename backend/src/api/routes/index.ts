/**
 * Routes Index
 * Combines all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import evaluationRoutes from './evaluation.routes.js';
import goalRoutes from './goal.routes.js';
import schoolRoutes from './school.routes.js';
import memberRoutes from './member.routes.js';

const router = Router();

// Mount routes
router.use('/', authRoutes);           // /api/therapist/register, /login, /me
router.use('/students', studentRoutes); // /api/therapist/students/*
router.use('/students', evaluationRoutes); // /api/therapist/students/:id/evaluation/*
router.use('/students', goalRoutes);   // /api/therapist/students/:id/goals/*
router.use('/schools', schoolRoutes);  // /api/therapist/schools/*
router.use('/members', memberRoutes);  // /api/therapist/members/*

export default router;

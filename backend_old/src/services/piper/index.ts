/**
 * PIPER Services - Barrel Export
 * Personalized IEP Progress & Evaluation Reporter
 *
 * Domain-based organization:
 * - auth/       : Authentication (therapist, child)
 * - students/   : Student management
 * - goals/      : IEP goals and threshold logic
 * - evaluation/ : Evaluation upload & processing
 * - goal/       : Goal upload & processing
 * - ai/         : AI-powered feedback
 */

// =============================================================================
// DATABASE (Infrastructure)
// =============================================================================
export { initializeDatabase, getDatabase, closeDatabase } from './database';

// =============================================================================
// AUTH SERVICES
// =============================================================================
export { default as therapistService } from './auth/therapist.service';
export { default as childService } from './auth/child.service';

// =============================================================================
// STUDENT SERVICES
// =============================================================================
export { default as studentService } from './students/student.service';

// =============================================================================
// GOAL SERVICES
// =============================================================================
export { default as goalService } from './goals/goal.service';
export { default as thresholdService } from './goals/threshold.service';
export { default as goalGeneratorService } from './goals/goal-generator.service';

// =============================================================================
// AI SERVICES
// =============================================================================
export { default as feedbackService } from './ai/feedback.service';
export { default as goalAIService } from './ai/goal-ai.service';

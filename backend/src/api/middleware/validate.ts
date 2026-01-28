/**
 * Validation Middleware
 * Uses Zod for request validation
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation targets
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * @param schema - Zod schema to validate against
 * @param target - Request property to validate (body, query, params)
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      // Replace with parsed/transformed data
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation failed';
        res.status(400).json({ error: message });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate route params (e.g., :id)
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return validate(schema, 'params');
}

/**
 * Validate query string
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return validate(schema, 'query');
}

// ============================================
// Common Schemas
// ============================================

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID').transform(Number),
});

// ============================================
// Auth Schemas
// ============================================

/**
 * Strong password validation for therapist accounts
 * Requires: 8+ chars, uppercase, lowercase, number, special char
 */
const therapistPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: therapistPasswordSchema,
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// Student Schemas
// ============================================

/**
 * Student password validation (simplified for children)
 * Requires: 6+ chars, at least one letter and one number
 */
const studentPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const createStudentSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: studentPasswordSchema,
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().optional(),
  grade_level: z.string().optional(),
  slp_id: z.number().optional(),
  school_id: z.number().optional(),
});

export const updateStudentSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  date_of_birth: z.string().optional(),
  grade_level: z.string().optional(),
  problem_type: z.enum(['language', 'articulation', 'both']).optional(),
  eval_data: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// Evaluation Schemas
// ============================================

// Helper schema for extracted fields
const extractedFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: z.number(),
    source_hint: z.string().optional(),
  });

// Schema for evaluation data - matches frontend getFormEvalData() structure
const evalDataSchema = z.object({
  service_type: extractedFieldSchema(
    z.enum(['language', 'articulation', 'both']).nullable()
  )
    .extend({ reasoning: z.string().optional() })
    .optional(),
  languages_spoken: extractedFieldSchema(z.string().nullable()).optional(),
  family_religion: extractedFieldSchema(z.string().nullable()).optional(),
  medical_history: extractedFieldSchema(z.string().nullable()).optional(),
  other_diagnoses: extractedFieldSchema(z.string().nullable()).optional(),
  speech_diagnoses: extractedFieldSchema(z.string().nullable()).optional(),
  prior_therapy: extractedFieldSchema(z.string().nullable()).optional(),
  baseline_accuracy: extractedFieldSchema(z.number().nullable()).optional(),
  goals_benchmarks: extractedFieldSchema(z.string().nullable()).optional(),
  strengths: extractedFieldSchema(z.string().nullable()).optional(),
  weaknesses: extractedFieldSchema(z.string().nullable()).optional(),
  target_sounds: extractedFieldSchema(z.array(z.string()).nullable()).optional(),
  teachers: extractedFieldSchema(z.string().nullable()).optional(),
  notes: extractedFieldSchema(z.string().nullable()).optional(),
});

// Schema for confirm evaluation request - matches API body structure
export const confirmEvaluationSchema = z.object({
  eval_data: evalDataSchema,
  service_type: z.enum(['language', 'articulation', 'both']).optional(),
});

// ============================================
// Goal Schemas
// ============================================

export const confirmGoalsSchema = z.object({
  goals: z.array(
    z.object({
      goal_type: z.object({
        value: z.enum(['language', 'articulation']).nullable(),
        confidence: z.number().optional(),
      }),
      goal_description: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }),
      target_percentage: z.object({
        value: z.number().nullable(),
        confidence: z.number().optional(),
      }),
      target_date: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }),
      baseline: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }).optional(),
      deadline: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }).optional(),
      sessions_to_confirm: z.object({
        value: z.number().nullable(),
        confidence: z.number().optional(),
      }).optional(),
      comments: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }).optional(),
      boardgame_categories: z.object({
        value: z.array(z.string()).nullable(),
        confidence: z.number().optional(),
      }).optional(),
      // Session time per goal
      session_duration_minutes: z.object({
        value: z.number().min(1).max(180).nullable(),
        confidence: z.number().optional(),
      }).optional(),
      session_frequency: z.object({
        value: z.string().nullable(),
        confidence: z.number().optional(),
      }).optional(),
    })
  ),
});

// Export types inferred from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ConfirmEvaluationInput = z.infer<typeof confirmEvaluationSchema>;
export type ConfirmGoalsInput = z.infer<typeof confirmGoalsSchema>;

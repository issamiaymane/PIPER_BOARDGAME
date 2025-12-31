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

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

export const createStudentSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().optional(),
  grade_level: z.string().optional(),
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

export const confirmEvaluationSchema = z.object({
  eval_data: z.record(z.string(), z.unknown()),
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

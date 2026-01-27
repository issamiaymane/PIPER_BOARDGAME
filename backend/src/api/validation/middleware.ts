/**
 * Validation Middleware
 * Express middleware for Zod schema validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodIssue } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Creates middleware that validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        throw ApiError.badRequest(
          `Validation failed: ${errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      // Replace body with parsed (and potentially transformed) data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Creates middleware that validates request query params against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const errors = result.error.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        throw ApiError.badRequest(
          `Query validation failed: ${errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      req.query = result.data as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

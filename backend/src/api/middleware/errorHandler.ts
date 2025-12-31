/**
 * Global Error Handler Middleware
 * Centralizes error handling for consistent API responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message: string = 'Unauthorized', code?: string): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Not found'): ApiError {
    return new ApiError(404, message);
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Success response helper
 */
export function successResponse<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } as ApiResponse<T>);
}

/**
 * Error response helper
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
  };
  if (code) {
    response.code = code;
  }
  res.status(statusCode).json(response);
}

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Unhandled error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message || 'Validation failed';
    errorResponse(res, message, 400);
    return;
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    errorResponse(res, err.message, err.statusCode, err.code);
    return;
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    const message = err.message === 'File too large'
      ? 'File is too large. Maximum size is 20MB.'
      : err.message;
    errorResponse(res, message, 400);
    return;
  }

  // Default to 500 internal server error
  errorResponse(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    500
  );
}

/**
 * 404 Not Found handler
 * Register after all routes but before error handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
  errorResponse(res, 'Endpoint not found', 404);
}

/**
 * API Validation Schemas
 * Zod schemas for HTTP request body validation
 */

import { z } from 'zod';

// Child Auth Schemas
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const CalibrationSchema = z.object({
  amplitudeThreshold: z.number().min(0).max(1),
  peakThreshold: z.number().min(0).max(1),
  baselineAmplitude: z.number().min(0).max(1).optional(),
  baselinePeak: z.number().min(0).max(1).optional(),
  excitedAmplitude: z.number().min(0).max(1).optional(),
  excitedPeak: z.number().min(0).max(1).optional(),
  loudAmplitude: z.number().min(0).max(1).optional(),
  loudPeak: z.number().min(0).max(1).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

// Session Schemas
export const CreateSessionSchema = z.object({
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  theme: z.string().nullish(),
  character: z.string().nullish(),
  voiceSessionId: z.string().nullish(),
});

export const EndSessionSchema = z.object({
  finalScore: z.number().int().min(0).nullish(),
  boardPosition: z.number().int().min(0).nullish(),
  status: z.enum(['completed', 'abandoned']).nullish(),
  voiceSessionId: z.string().nullish(),
});

export const RecordResponseSchema = z.object({
  cardCategory: z.string().min(1),
  cardQuestion: z.string().min(1),
  childResponse: z.string().nullish(),
  isCorrect: z.boolean(),
  attemptNumber: z.number().int().positive().nullish(),
  timeSpentSeconds: z.number().int().min(0).nullish(),
  safetyLevel: z.number().int().min(0).max(10).nullish(),
  signalsDetected: z.array(z.string()).nullish(),
});

// Types derived from schemas
export type LoginRequest = z.infer<typeof LoginSchema>;
export type CalibrationRequest = z.infer<typeof CalibrationSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type EndSessionRequest = z.infer<typeof EndSessionSchema>;
export type RecordResponseSchemaType = z.infer<typeof RecordResponseSchema>;

/**
 * Voice Types
 * Types for voice WebSocket communication
 */

import { z } from 'zod';
import type { UIPackage } from './safety-gate.js';

// ─────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CardContextSchema = z.object({
  category: z.string(),
  question: z.string(),
  targetAnswers: z.array(z.string()),
  images: z.array(z.object({
    image: z.string(),
    label: z.string()
  }))
});

export const ClientMessageSchema = z.object({
  type: z.enum([
    'start_session',
    'speak_card',
    'audio_chunk',
    'commit_audio',
    'end_session',
    'set_card_context',
    'choice_selected',
    'activity_ended'
  ]),
  text: z.string().optional(),
  category: z.string().optional(),
  audio: z.string().optional(),
  amplitude: z.number().min(0).max(1).optional(),
  peak: z.number().min(0).max(1).optional(),
  cardContext: CardContextSchema.optional(),
  action: z.string().optional(),
  activity: z.string().optional()
});

// Derive type from schema (single source of truth)
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SERVER MESSAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerMessage {
  type: 'session_ready' | 'audio_chunk' | 'transcript' | 'speaking_started' | 'speaking_done' | 'error' | 'safety_gate_response';
  sessionId?: string;
  audio?: string; // base64 encoded PCM16 audio
  text?: string;
  role?: 'assistant' | 'user';
  message?: string;
  // Safety-gate UI package
  uiPackage?: UIPackage;
  isCorrect?: boolean;
  // Flag for card flow control
  taskTimeExceeded?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME API TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type RealtimeEventHandler = (event: RealtimeServerEvent) => void;

export interface RealtimeServerEvent {
  type: string;
  event_id?: string;
  delta?: string;
  transcript?: string;
  error?: { code?: string; message?: string };
  [key: string]: unknown;
}

export interface RealtimeClientEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

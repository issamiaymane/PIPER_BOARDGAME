/**
 * Auth Service
 * Handles therapist authentication only
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './database.js';
import { config } from '../config/index.js';
import type { RegisterRequest, LoginRequest, Therapist, TherapistAuthResult } from '../types/index.js';

const SALT_ROUNDS = 10;

function generateToken(therapistId: number): string {
  return jwt.sign({ therapist_id: therapistId }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export async function registerTherapist(data: RegisterRequest): Promise<TherapistAuthResult> {
  const db = getDatabase();

  // Check if email already exists
  const existing = db
    .prepare('SELECT id FROM therapists WHERE email = ?')
    .get(data.email);

  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Insert therapist
  const result = db
    .prepare(
      'INSERT INTO therapists (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
    )
    .run(data.email, passwordHash, data.first_name, data.last_name);

  const therapistId = result.lastInsertRowid as number;

  // Get created therapist
  const therapist = getTherapistById(therapistId)!;
  const token = generateToken(therapistId);

  return { therapist, token };
}

export async function loginTherapist(data: LoginRequest): Promise<TherapistAuthResult> {
  const db = getDatabase();

  // Find therapist by email
  const row = db
    .prepare('SELECT * FROM therapists WHERE email = ?')
    .get(data.email) as { id: number; password_hash: string } | undefined;

  if (!row) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const valid = await bcrypt.compare(data.password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const therapist = getTherapistById(row.id)!;
  const token = generateToken(row.id);

  return { therapist, token };
}

export function getTherapistById(id: number): Therapist | null {
  const db = getDatabase();

  const row = db
    .prepare('SELECT id, email, first_name, last_name, created_at FROM therapists WHERE id = ?')
    .get(id) as Therapist | undefined;

  return row || null;
}

export function verifyToken(token: string): { therapist_id: number } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { therapist_id: number };
    return decoded;
  } catch {
    return null;
  }
}

export default {
  registerTherapist,
  loginTherapist,
  getTherapistById,
  verifyToken,
};

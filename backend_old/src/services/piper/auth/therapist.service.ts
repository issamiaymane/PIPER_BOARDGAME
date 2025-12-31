/**
 * PIPER Therapist Service
 * Handles therapist registration, login, and profile management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { execute, queryOne } from '../database';
import {
  Therapist,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  JWTPayload,
} from '../../../types/piper';
import { logger } from '../../../utils/logger';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'piper-default-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Register a new therapist
 */
export async function registerTherapist(
  data: RegisterRequest
): Promise<AuthResponse> {
  // Check if email already exists
  const existing = queryOne<Therapist>(
    'SELECT id FROM therapists WHERE email = ?',
    [data.email.toLowerCase()]
  );

  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Insert therapist
  const result = execute(
    `INSERT INTO therapists (email, password_hash, first_name, last_name, credentials)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.email.toLowerCase(),
      password_hash,
      data.first_name,
      data.last_name,
      data.credentials || null,
    ]
  );

  const therapist_id = result.lastInsertRowid as number;

  // Get the created therapist
  const therapist = queryOne<Therapist>(
    'SELECT * FROM therapists WHERE id = ?',
    [therapist_id]
  );

  if (!therapist) {
    throw new Error('Failed to create therapist');
  }

  // Generate JWT
  const token = generateToken(therapist);

  logger.info(`Therapist registered: ${data.email}`);

  return {
    token,
    therapist: sanitizeTherapist(therapist),
  };
}

/**
 * Login a therapist
 */
export async function loginTherapist(
  data: LoginRequest
): Promise<AuthResponse> {
  // Find therapist by email
  const therapist = queryOne<Therapist>(
    'SELECT * FROM therapists WHERE email = ?',
    [data.email.toLowerCase()]
  );

  if (!therapist) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const validPassword = await bcrypt.compare(data.password, therapist.password_hash);

  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT
  const token = generateToken(therapist);

  logger.info(`Therapist logged in: ${data.email}`);

  return {
    token,
    therapist: sanitizeTherapist(therapist),
  };
}

/**
 * Get therapist by ID
 */
export function getTherapistById(id: number): Omit<Therapist, 'password_hash'> | null {
  const therapist = queryOne<Therapist>(
    'SELECT * FROM therapists WHERE id = ?',
    [id]
  );

  if (!therapist) {
    return null;
  }

  return sanitizeTherapist(therapist);
}

/**
 * Update therapist profile
 */
export function updateTherapist(
  id: number,
  data: Partial<Omit<Therapist, 'id' | 'password_hash' | 'created_at'>>
): Omit<Therapist, 'password_hash'> | null {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.first_name) {
    updates.push('first_name = ?');
    values.push(data.first_name);
  }
  if (data.last_name) {
    updates.push('last_name = ?');
    values.push(data.last_name);
  }
  if (data.credentials !== undefined) {
    updates.push('credentials = ?');
    values.push(data.credentials);
  }

  if (updates.length === 0) {
    return getTherapistById(id);
  }

  values.push(id);
  execute(
    `UPDATE therapists SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return getTherapistById(id);
}

/**
 * Change therapist password
 */
export async function changePassword(
  id: number,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const therapist = queryOne<Therapist>(
    'SELECT * FROM therapists WHERE id = ?',
    [id]
  );

  if (!therapist) {
    throw new Error('Therapist not found');
  }

  const validPassword = await bcrypt.compare(currentPassword, therapist.password_hash);

  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  execute('UPDATE therapists SET password_hash = ? WHERE id = ?', [
    password_hash,
    id,
  ]);

  logger.info(`Password changed for therapist ID: ${id}`);

  return true;
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate JWT token for therapist
 */
function generateToken(therapist: Therapist): string {
  const payload: JWTPayload = {
    therapist_id: therapist.id,
    email: therapist.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Remove password_hash from therapist object
 */
function sanitizeTherapist(
  therapist: Therapist
): Omit<Therapist, 'password_hash'> {
  const { password_hash: _, ...safe } = therapist;
  return safe;
}

export default {
  registerTherapist,
  loginTherapist,
  getTherapistById,
  updateTherapist,
  changePassword,
  verifyToken,
};

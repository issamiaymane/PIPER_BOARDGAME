/**
 * Student Service
 * Handles student/child CRUD operations and authentication
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database.js';
import { config } from '../../config/index.js';
import type { Child, CreateChildRequest, UpdateChildRequest, ChildLoginRequest, ChildAuthResult } from '../../types/index.js';

// Fields to select (excluding password_hash)
const STUDENT_FIELDS = `id, therapist_id, username, first_name, last_name, date_of_birth,
  grade_level, problem_type, eval_data, eval_pdf_path, eval_pdf_uploaded_at,
  eval_pdf_original_name, created_at`;

const SALT_ROUNDS = 10;

export function isUsernameAvailable(username: string): boolean {
  const db = getDatabase();
  const existing = db
    .prepare('SELECT id FROM children WHERE username = ?')
    .get(username);
  return !existing;
}

export async function createStudent(
  therapist_id: number,
  data: CreateChildRequest
): Promise<Child> {
  const db = getDatabase();

  if (!isUsernameAvailable(data.username)) {
    throw new Error('Username already taken');
  }

  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const result = db
    .prepare(
      `INSERT INTO children (
        therapist_id, username, password_hash, first_name, last_name,
        date_of_birth, grade_level, problem_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      therapist_id,
      data.username,
      password_hash,
      data.first_name,
      data.last_name,
      data.date_of_birth || null,
      data.grade_level || null,
      data.problem_type || null
    );

  const student = getStudentById(result.lastInsertRowid as number);
  if (!student) {
    throw new Error('Failed to create student');
  }

  return student;
}

export function getStudentById(id: number): Child | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT ${STUDENT_FIELDS} FROM children WHERE id = ?`)
    .get(id) as Child | undefined;
  return row || null;
}

export function getStudentForTherapist(id: number, therapist_id: number): Child | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT ${STUDENT_FIELDS} FROM children WHERE id = ? AND therapist_id = ?`)
    .get(id, therapist_id) as Child | undefined;
  return row || null;
}

export function listStudentsByTherapist(therapist_id: number): Child[] {
  const db = getDatabase();
  return db
    .prepare(`SELECT ${STUDENT_FIELDS} FROM children WHERE therapist_id = ? ORDER BY first_name, last_name`)
    .all(therapist_id) as Child[];
}

export function updateStudent(
  id: number,
  therapist_id: number,
  data: UpdateChildRequest
): Child | null {
  const db = getDatabase();

  // Verify ownership
  const existing = getStudentForTherapist(id, therapist_id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.first_name !== undefined) {
    updates.push('first_name = ?');
    values.push(data.first_name);
  }
  if (data.last_name !== undefined) {
    updates.push('last_name = ?');
    values.push(data.last_name);
  }
  if (data.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    values.push(data.date_of_birth);
  }
  if (data.grade_level !== undefined) {
    updates.push('grade_level = ?');
    values.push(data.grade_level);
  }
  if (data.problem_type !== undefined) {
    updates.push('problem_type = ?');
    values.push(data.problem_type);
  }
  if (data.eval_data !== undefined) {
    updates.push('eval_data = ?');
    const jsonData = JSON.stringify(data.eval_data);
    values.push(jsonData);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);
  db.prepare(`UPDATE children SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getStudentById(id);
}

export function deleteStudent(id: number, therapist_id: number): boolean {
  const db = getDatabase();
  const existing = getStudentForTherapist(id, therapist_id);
  if (!existing) {
    return false;
  }
  db.prepare('DELETE FROM children WHERE id = ?').run(id);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Child Authentication
// ─────────────────────────────────────────────────────────────────────────────

function generateChildToken(childId: number): string {
  return jwt.sign({ child_id: childId }, config.jwtSecret, {
    expiresIn: '24h',
  });
}

export async function loginChild(data: ChildLoginRequest): Promise<ChildAuthResult> {
  const db = getDatabase();

  // Find child by username
  const row = db
    .prepare('SELECT id, password_hash FROM children WHERE username = ?')
    .get(data.username) as { id: number; password_hash: string } | undefined;

  if (!row) {
    throw new Error('Invalid username or password');
  }

  // Verify password
  const valid = await bcrypt.compare(data.password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid username or password');
  }

  const child = getStudentById(row.id)!;
  const token = generateChildToken(row.id);

  return { child, token };
}

export function verifyChildToken(token: string): { child_id: number } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { child_id: number };
    // Make sure it's a child token (has child_id, not therapist_id)
    if (typeof decoded.child_id === 'number') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

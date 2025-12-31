/**
 * Student Service
 * Handles student/child CRUD operations
 */

import bcrypt from 'bcryptjs';
import { getDatabase } from './database.js';
import type { Child, CreateChildRequest } from '../types/index.js';

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
    .prepare(
      'SELECT id, therapist_id, username, first_name, last_name, date_of_birth, grade_level, problem_type, created_at FROM children WHERE id = ?'
    )
    .get(id) as Child | undefined;
  return row || null;
}

export function getStudentForTherapist(id: number, therapist_id: number): Child | null {
  const db = getDatabase();
  const row = db
    .prepare(
      'SELECT id, therapist_id, username, first_name, last_name, date_of_birth, grade_level, problem_type, created_at FROM children WHERE id = ? AND therapist_id = ?'
    )
    .get(id, therapist_id) as Child | undefined;
  return row || null;
}

export function listStudentsByTherapist(therapist_id: number): Child[] {
  const db = getDatabase();
  return db
    .prepare(
      'SELECT id, therapist_id, username, first_name, last_name, date_of_birth, grade_level, problem_type, created_at FROM children WHERE therapist_id = ? ORDER BY first_name, last_name'
    )
    .all(therapist_id) as Child[];
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

export default {
  isUsernameAvailable,
  createStudent,
  getStudentById,
  getStudentForTherapist,
  listStudentsByTherapist,
  deleteStudent,
};

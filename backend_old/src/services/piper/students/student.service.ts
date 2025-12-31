/**
 * PIPER Student Service
 * Handles student CRUD operations
 */

import bcrypt from 'bcrypt';
import { execute, queryAll, queryOne } from '../database';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../../../types/piper';
import { logger } from '../../../utils/logger';

const SALT_ROUNDS = 10;

/**
 * Check if username is available
 */
export function isUsernameAvailable(username: string): boolean {
  const existing = queryOne<{ id: number }>(
    'SELECT id FROM students WHERE username = ?',
    [username]
  );
  return !existing;
}

/**
 * Create a new student (child account)
 */
export async function createStudent(
  therapist_id: number,
  data: CreateStudentRequest
): Promise<Student> {
  // Check username availability
  if (!isUsernameAvailable(data.username)) {
    throw new Error('Username already taken');
  }

  // Hash password
  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Serialize eval data if provided
  const eval_data_json = data.eval_data ? JSON.stringify(data.eval_data) : null;

  const result = execute(
    `INSERT INTO students (
      therapist_id, first_name, last_name, date_of_birth, grade_level,
      diagnosis, avatar_emoji, username, password_hash, problem_type, eval_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      therapist_id,
      data.first_name,
      data.last_name,
      data.date_of_birth || null,
      data.grade_level || null,
      data.diagnosis || null,
      data.avatar_emoji || '🧒',
      data.username,
      password_hash,
      data.problem_type,
      eval_data_json,
    ]
  );

  const student = getStudentById(result.lastInsertRowid as number);
  if (!student) {
    throw new Error('Failed to create student');
  }

  logger.info(`Student created: ${data.first_name} ${data.last_name} (ID: ${student.id}, username: ${data.username})`);
  return student;
}

/**
 * Get student by ID
 */
export function getStudentById(id: number): Student | null {
  const student = queryOne<Student>(
    'SELECT * FROM students WHERE id = ?',
    [id]
  );
  return student || null;
}

/**
 * Get student by ID (with ownership check)
 */
export function getStudentByIdForTherapist(
  id: number,
  therapist_id: number
): Student | null {
  const student = queryOne<Student>(
    'SELECT * FROM students WHERE id = ? AND therapist_id = ?',
    [id, therapist_id]
  );
  return student || null;
}

/**
 * List all students for a therapist
 */
export function listStudentsByTherapist(therapist_id: number): Student[] {
  return queryAll<Student>(
    'SELECT * FROM students WHERE therapist_id = ? ORDER BY first_name, last_name',
    [therapist_id]
  );
}

/**
 * Update a student
 */
export async function updateStudent(
  id: number,
  therapist_id: number,
  data: UpdateStudentRequest
): Promise<Student | null> {
  // First verify ownership
  const existing = getStudentByIdForTherapist(id, therapist_id);
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
  if (data.diagnosis !== undefined) {
    updates.push('diagnosis = ?');
    values.push(data.diagnosis);
  }
  if (data.avatar_emoji !== undefined) {
    updates.push('avatar_emoji = ?');
    values.push(data.avatar_emoji);
  }
  if (data.username !== undefined) {
    // Check username availability (exclude current student)
    const usernameExists = queryOne<{ id: number }>(
      'SELECT id FROM students WHERE username = ? AND id != ?',
      [data.username, id]
    );
    if (usernameExists) {
      throw new Error('Username already taken');
    }
    updates.push('username = ?');
    values.push(data.username);
  }
  if (data.password !== undefined) {
    const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    updates.push('password_hash = ?');
    values.push(password_hash);
  }
  if (data.problem_type !== undefined) {
    updates.push('problem_type = ?');
    values.push(data.problem_type);
  }
  if (data.eval_data !== undefined) {
    updates.push('eval_data = ?');
    values.push(JSON.stringify(data.eval_data));
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);
  execute(
    `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  logger.info(`Student updated: ID ${id}`);
  return getStudentById(id);
}

/**
 * Delete a student
 */
export function deleteStudent(id: number, therapist_id: number): boolean {
  const existing = getStudentByIdForTherapist(id, therapist_id);
  if (!existing) {
    return false;
  }

  execute('DELETE FROM students WHERE id = ?', [id]);
  logger.info(`Student deleted: ID ${id}`);
  return true;
}

/**
 * Search students by name
 */
export function searchStudents(
  therapist_id: number,
  query: string
): Student[] {
  const searchTerm = `%${query}%`;
  return queryAll<Student>(
    `SELECT * FROM students
     WHERE therapist_id = ?
     AND (first_name LIKE ? OR last_name LIKE ?)
     ORDER BY first_name, last_name`,
    [therapist_id, searchTerm, searchTerm]
  );
}

/**
 * Get student count for therapist
 */
export function getStudentCount(therapist_id: number): number {
  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM students WHERE therapist_id = ?',
    [therapist_id]
  );
  return result?.count || 0;
}

export default {
  createStudent,
  getStudentById,
  getStudentByIdForTherapist,
  listStudentsByTherapist,
  updateStudent,
  deleteStudent,
  searchStudents,
  getStudentCount,
  isUsernameAvailable,
};

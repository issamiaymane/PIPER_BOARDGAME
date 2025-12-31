/**
 * Goal Upload Service
 *
 * Handles PDF file upload, validation, and storage for IEP goal documents.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execute, queryOne } from '../database';
import { Student } from '../../../types/piper';
import { logger } from '../../../utils/logger';

// Upload configuration
const UPLOADS_DIR = path.join(__dirname, '../../../../data/uploads/goals');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

/**
 * Ensure the uploads directory exists for a student
 */
function ensureStudentUploadDir(studentId: number): string {
  const studentDir = path.join(UPLOADS_DIR, String(studentId));
  if (!fs.existsSync(studentDir)) {
    fs.mkdirSync(studentDir, { recursive: true });
  }
  return studentDir;
}

/**
 * Generate a unique filename for the uploaded PDF
 */
function generateUniqueFilename(): string {
  return `${crypto.randomUUID()}.pdf`;
}

/**
 * Validate the uploaded file
 */
export function validateGoalPdfFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): { valid: boolean; error?: string } {
  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: 'Only PDF files are allowed' };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check PDF magic bytes (PDF files start with %PDF)
  const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
  if (!buffer.subarray(0, 4).equals(pdfMagicBytes)) {
    return { valid: false, error: 'Invalid PDF file format' };
  }

  // Check file extension
  if (!originalName.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have .pdf extension' };
  }

  return { valid: true };
}

/**
 * Save the uploaded PDF file to disk
 */
export async function saveGoalPdf(
  studentId: number,
  buffer: Buffer,
  _originalName: string
): Promise<{ filePath: string; fileName: string }> {
  const studentDir = ensureStudentUploadDir(studentId);
  const fileName = generateUniqueFilename();
  const filePath = path.join(studentDir, fileName);

  // Write file to disk
  await fs.promises.writeFile(filePath, buffer);

  logger.info(`Goal PDF saved: ${filePath}`);

  return { filePath, fileName };
}

/**
 * Update student record with goal PDF metadata
 */
export function updateStudentGoalPdfMetadata(
  studentId: number,
  filePath: string,
  originalName: string
): void {
  const now = new Date().toISOString();

  execute(
    `UPDATE students
     SET goal_pdf_path = ?,
         goal_pdf_uploaded_at = ?,
         goal_pdf_original_name = ?
     WHERE id = ?`,
    [filePath, now, originalName, studentId]
  );

  logger.info(`Student ${studentId} goal PDF metadata updated`);
}

/**
 * Get the full path to a student's goal PDF
 */
export function getGoalPdfPath(studentId: number): string | null {
  const student = queryOne<Student>(
    'SELECT goal_pdf_path FROM students WHERE id = ?',
    [studentId]
  );

  return student?.goal_pdf_path || null;
}

/**
 * Check if a student has an uploaded goal PDF
 */
export function hasGoalPdf(studentId: number): boolean {
  const pdfPath = getGoalPdfPath(studentId);
  return pdfPath !== null && fs.existsSync(pdfPath);
}

/**
 * Delete a student's goal PDF
 */
export async function deleteGoalPdf(studentId: number): Promise<boolean> {
  const pdfPath = getGoalPdfPath(studentId);

  if (pdfPath && fs.existsSync(pdfPath)) {
    await fs.promises.unlink(pdfPath);
    logger.info(`Goal PDF deleted: ${pdfPath}`);
  }

  // Clear metadata in database
  execute(
    `UPDATE students
     SET goal_pdf_path = NULL,
         goal_pdf_uploaded_at = NULL,
         goal_pdf_original_name = NULL
     WHERE id = ?`,
    [studentId]
  );

  return true;
}

/**
 * Read the goal PDF as a buffer
 */
export async function readGoalPdf(studentId: number): Promise<Buffer | null> {
  const pdfPath = getGoalPdfPath(studentId);

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return null;
  }

  return fs.promises.readFile(pdfPath);
}

export default {
  validateGoalPdfFile,
  saveGoalPdf,
  updateStudentGoalPdfMetadata,
  getGoalPdfPath,
  hasGoalPdf,
  deleteGoalPdf,
  readGoalPdf,
};

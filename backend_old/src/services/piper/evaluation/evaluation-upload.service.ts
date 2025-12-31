/**
 * Evaluation Upload Service
 *
 * Handles PDF file upload, validation, and storage for evaluation reports.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execute, queryOne } from '../database';
import { Student } from '../../../types/piper';
import { logger } from '../../../utils/logger';

// Upload configuration
const UPLOADS_DIR = path.join(__dirname, '../../../../data/uploads/evaluations');
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
export function validatePdfFile(
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
export async function saveEvaluationPdf(
  studentId: number,
  buffer: Buffer,
  _originalName: string
): Promise<{ filePath: string; fileName: string }> {
  const studentDir = ensureStudentUploadDir(studentId);
  const fileName = generateUniqueFilename();
  const filePath = path.join(studentDir, fileName);

  // Write file to disk
  await fs.promises.writeFile(filePath, buffer);

  logger.info(`Evaluation PDF saved: ${filePath}`);

  return { filePath, fileName };
}

/**
 * Update student record with PDF metadata
 */
export function updateStudentPdfMetadata(
  studentId: number,
  filePath: string,
  originalName: string
): void {
  const now = new Date().toISOString();

  execute(
    `UPDATE students
     SET eval_pdf_path = ?,
         eval_pdf_uploaded_at = ?,
         eval_pdf_original_name = ?
     WHERE id = ?`,
    [filePath, now, originalName, studentId]
  );

  logger.info(`Student ${studentId} PDF metadata updated`);
}

/**
 * Get the full path to a student's evaluation PDF
 */
export function getEvaluationPdfPath(studentId: number): string | null {
  const student = queryOne<Student>(
    'SELECT eval_pdf_path FROM students WHERE id = ?',
    [studentId]
  );

  return student?.eval_pdf_path || null;
}

/**
 * Check if a student has an uploaded evaluation PDF
 */
export function hasEvaluationPdf(studentId: number): boolean {
  const pdfPath = getEvaluationPdfPath(studentId);
  return pdfPath !== null && fs.existsSync(pdfPath);
}

/**
 * Delete a student's evaluation PDF
 */
export async function deleteEvaluationPdf(studentId: number): Promise<boolean> {
  const pdfPath = getEvaluationPdfPath(studentId);

  if (pdfPath && fs.existsSync(pdfPath)) {
    await fs.promises.unlink(pdfPath);
    logger.info(`Evaluation PDF deleted: ${pdfPath}`);
  }

  // Clear metadata in database
  execute(
    `UPDATE students
     SET eval_pdf_path = NULL,
         eval_pdf_uploaded_at = NULL,
         eval_pdf_original_name = NULL
     WHERE id = ?`,
    [studentId]
  );

  return true;
}

/**
 * Read the evaluation PDF as a buffer
 */
export async function readEvaluationPdf(studentId: number): Promise<Buffer | null> {
  const pdfPath = getEvaluationPdfPath(studentId);

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return null;
  }

  return fs.promises.readFile(pdfPath);
}

export default {
  validatePdfFile,
  saveEvaluationPdf,
  updateStudentPdfMetadata,
  getEvaluationPdfPath,
  hasEvaluationPdf,
  deleteEvaluationPdf,
  readEvaluationPdf,
};

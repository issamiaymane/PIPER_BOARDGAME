/**
 * Goal Upload Service
 * Handles IEP goal PDF file upload, validation, and storage
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getDatabase } from '../database.js';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads/goals');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

function ensureStudentUploadDir(studentId: number): string {
  const studentDir = path.join(UPLOADS_DIR, String(studentId));
  if (!fs.existsSync(studentDir)) {
    fs.mkdirSync(studentDir, { recursive: true });
  }
  return studentDir;
}

function generateUniqueFilename(): string {
  return `${crypto.randomUUID()}.pdf`;
}

export function validatePdfFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: 'Only PDF files are allowed' };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]);
  if (!buffer.subarray(0, 4).equals(pdfMagicBytes)) {
    return { valid: false, error: 'Invalid PDF file format' };
  }

  if (!originalName.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have .pdf extension' };
  }

  return { valid: true };
}

export async function saveGoalsPdf(
  studentId: number,
  buffer: Buffer,
  _originalName: string
): Promise<{ filePath: string; fileName: string }> {
  const studentDir = ensureStudentUploadDir(studentId);
  const fileName = generateUniqueFilename();
  const filePath = path.join(studentDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  logger.info(`Goals PDF saved: ${filePath}`);

  return { filePath, fileName };
}

export function updateStudentGoalsPdfMetadata(
  studentId: number,
  filePath: string,
  originalName: string
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE children
     SET goals_pdf_path = ?,
         goals_pdf_uploaded_at = ?,
         goals_pdf_original_name = ?
     WHERE id = ?`
  ).run(filePath, now, originalName, studentId);

  logger.info(`Student ${studentId} goals PDF metadata updated`);
}

export function getGoalsPdfPath(studentId: number): string | null {
  const db = getDatabase();
  const student = db
    .prepare('SELECT goals_pdf_path FROM children WHERE id = ?')
    .get(studentId) as { goals_pdf_path?: string } | undefined;

  return student?.goals_pdf_path || null;
}

export function hasGoalsPdf(studentId: number): boolean {
  const pdfPath = getGoalsPdfPath(studentId);
  return pdfPath !== null && fs.existsSync(pdfPath);
}

export async function deleteGoalsPdf(studentId: number): Promise<boolean> {
  const pdfPath = getGoalsPdfPath(studentId);

  if (pdfPath && fs.existsSync(pdfPath)) {
    await fs.promises.unlink(pdfPath);
    logger.info(`Goals PDF deleted: ${pdfPath}`);
  }

  const db = getDatabase();
  db.prepare(
    `UPDATE children
     SET goals_pdf_path = NULL,
         goals_pdf_uploaded_at = NULL,
         goals_pdf_original_name = NULL
     WHERE id = ?`
  ).run(studentId);

  return true;
}

export default {
  validatePdfFile,
  saveGoalsPdf,
  updateStudentGoalsPdfMetadata,
  getGoalsPdfPath,
  hasGoalsPdf,
  deleteGoalsPdf,
};

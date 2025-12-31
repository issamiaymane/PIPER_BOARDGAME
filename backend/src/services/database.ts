import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/piper.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export function initializeDatabase(): void {
  logger.info('Initializing database...');

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create therapists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS therapists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create children table (for child dashboard)
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      therapist_id INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      grade_level TEXT,
      problem_type TEXT CHECK(problem_type IN ('language', 'articulation', 'both')),
      eval_data TEXT,
      eval_pdf_path TEXT,
      eval_pdf_uploaded_at TEXT,
      eval_pdf_original_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    )
  `);

  // Run migrations for existing tables
  runMigrations(db);

  logger.info('Database initialized successfully');
}

/**
 * Run migrations to add columns to existing tables
 */
function runMigrations(db: Database.Database): void {
  // Get existing columns in children table
  const columns = db
    .prepare("PRAGMA table_info(children)")
    .all() as { name: string }[];
  const columnNames = columns.map((c) => c.name);

  // Add eval_data if missing
  if (!columnNames.includes('eval_data')) {
    db.exec('ALTER TABLE children ADD COLUMN eval_data TEXT');
    logger.info('Migration: Added eval_data column');
  }

  // Add eval_pdf_path if missing
  if (!columnNames.includes('eval_pdf_path')) {
    db.exec('ALTER TABLE children ADD COLUMN eval_pdf_path TEXT');
    logger.info('Migration: Added eval_pdf_path column');
  }

  // Add eval_pdf_uploaded_at if missing
  if (!columnNames.includes('eval_pdf_uploaded_at')) {
    db.exec('ALTER TABLE children ADD COLUMN eval_pdf_uploaded_at TEXT');
    logger.info('Migration: Added eval_pdf_uploaded_at column');
  }

  // Add eval_pdf_original_name if missing
  if (!columnNames.includes('eval_pdf_original_name')) {
    db.exec('ALTER TABLE children ADD COLUMN eval_pdf_original_name TEXT');
    logger.info('Migration: Added eval_pdf_original_name column');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

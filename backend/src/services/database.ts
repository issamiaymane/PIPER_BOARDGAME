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

  // Create IEP goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS iep_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL CHECK(goal_type IN ('language', 'articulation')),
      goal_description TEXT NOT NULL,
      target_percentage INTEGER DEFAULT 80,
      current_percentage INTEGER DEFAULT 0,
      target_date TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'achieved', 'discontinued')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE
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

  // Add goals_pdf_path if missing
  if (!columnNames.includes('goals_pdf_path')) {
    db.exec('ALTER TABLE children ADD COLUMN goals_pdf_path TEXT');
    logger.info('Migration: Added goals_pdf_path column');
  }

  // Add goals_pdf_uploaded_at if missing
  if (!columnNames.includes('goals_pdf_uploaded_at')) {
    db.exec('ALTER TABLE children ADD COLUMN goals_pdf_uploaded_at TEXT');
    logger.info('Migration: Added goals_pdf_uploaded_at column');
  }

  // Add goals_pdf_original_name if missing
  if (!columnNames.includes('goals_pdf_original_name')) {
    db.exec('ALTER TABLE children ADD COLUMN goals_pdf_original_name TEXT');
    logger.info('Migration: Added goals_pdf_original_name column');
  }

  // Get existing columns in iep_goals table
  const goalColumns = db
    .prepare("PRAGMA table_info(iep_goals)")
    .all() as { name: string }[];
  const goalColumnNames = goalColumns.map((c) => c.name);

  // Add baseline if missing
  if (!goalColumnNames.includes('baseline')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN baseline TEXT');
    logger.info('Migration: Added baseline column to iep_goals');
  }

  // Add sessions_to_confirm if missing
  if (!goalColumnNames.includes('sessions_to_confirm')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN sessions_to_confirm INTEGER DEFAULT 3');
    logger.info('Migration: Added sessions_to_confirm column to iep_goals');
  }

  // Add comments if missing
  if (!goalColumnNames.includes('comments')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN comments TEXT');
    logger.info('Migration: Added comments column to iep_goals');
  }

  // Add boardgame_categories if missing (stored as JSON string)
  if (!goalColumnNames.includes('boardgame_categories')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN boardgame_categories TEXT');
    logger.info('Migration: Added boardgame_categories column to iep_goals');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

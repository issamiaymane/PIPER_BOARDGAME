import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

// Use process.cwd() for consistent path resolution in both dev and production
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'piper.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export function initializeDatabase(): void {
  logger.info('Initializing database...');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info(`Created data directory: ${DATA_DIR}`);
  }

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

  // Create gameplay sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gameplay_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      therapist_id INTEGER NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      duration_seconds INTEGER,
      categories_selected TEXT NOT NULL,
      theme TEXT,
      character TEXT,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned')),
      final_score INTEGER DEFAULT 0,
      final_board_position INTEGER DEFAULT 0,
      total_cards_played INTEGER DEFAULT 0,
      correct_responses INTEGER DEFAULT 0,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    )
  `);

  // Create session responses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      card_category TEXT NOT NULL,
      card_question TEXT NOT NULL,
      child_response TEXT,
      is_correct INTEGER NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      card_shown_at TEXT DEFAULT CURRENT_TIMESTAMP,
      response_at TEXT,
      time_spent_seconds INTEGER,
      safety_level INTEGER DEFAULT 0,
      signals_detected TEXT,
      FOREIGN KEY (session_id) REFERENCES gameplay_sessions(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for session tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_therapist ON gameplay_sessions(therapist_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_child ON gameplay_sessions(child_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON gameplay_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_responses_session ON session_responses(session_id, card_shown_at);
  `);

  // Create voice calibration table (stores calibration results per child)
  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_calibrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL UNIQUE,
      amplitude_threshold REAL NOT NULL,
      peak_threshold REAL NOT NULL,
      baseline_amplitude REAL,
      baseline_peak REAL,
      excited_amplitude REAL,
      excited_peak REAL,
      loud_amplitude REAL,
      loud_peak REAL,
      confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
      calibrated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
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

  // Get existing columns in session_responses table
  const responseColumns = db
    .prepare("PRAGMA table_info(session_responses)")
    .all() as { name: string }[];
  const responseColumnNames = responseColumns.map((c) => c.name);

  // Add intervention_chosen if missing
  if (!responseColumnNames.includes('intervention_chosen')) {
    db.exec('ALTER TABLE session_responses ADD COLUMN intervention_chosen TEXT');
    logger.info('Migration: Added intervention_chosen column to session_responses');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

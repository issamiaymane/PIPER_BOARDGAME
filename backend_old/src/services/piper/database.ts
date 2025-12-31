/**
 * PIPER Database Service
 * SQLite database connection and migrations
 */

import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../../utils/logger';

// Database file path
const DB_PATH = path.join(__dirname, '../../../data/piper.db');

// Create database instance
let db: Database.Database;

/**
 * Initialize the database connection and run migrations
 */
export function initializeDatabase(): Database.Database {
  if (db) return db;

  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints

    logger.info(`PIPER database initialized at: ${DB_PATH}`);

    // Run migrations
    runMigrations();

    return db;
  } catch (error) {
    logger.error('Failed to initialize PIPER database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    logger.info('PIPER database connection closed');
  }
}

/**
 * Run database migrations
 */
function runMigrations(): void {
  const migrations = [
    // Migration 1: Create core tables
    `
    CREATE TABLE IF NOT EXISTS therapists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      credentials TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      therapist_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth DATE,
      grade_level TEXT,
      diagnosis TEXT,
      avatar_emoji TEXT DEFAULT '🧒',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS iep_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL,
      goal_description TEXT NOT NULL,
      target_percentage INTEGER DEFAULT 80,
      sessions_to_confirm INTEGER DEFAULT 3,
      current_prompt_level INTEGER DEFAULT 2,
      mapped_categories TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      therapist_id INTEGER NOT NULL,
      iep_goal_id INTEGER,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      total_trials INTEGER DEFAULT 0,
      correct_trials INTEGER DEFAULT 0,
      accuracy_percentage REAL DEFAULT 0,
      prompt_level_used INTEGER DEFAULT 2,
      status TEXT DEFAULT 'in_progress',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id),
      FOREIGN KEY (iep_goal_id) REFERENCES iep_goals(id)
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS trials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      card_category TEXT NOT NULL,
      card_data TEXT NOT NULL,
      user_answer TEXT,
      is_correct INTEGER NOT NULL,
      prompt_level INTEGER NOT NULL,
      response_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS session_accuracy_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      iep_goal_id INTEGER NOT NULL,
      session_id INTEGER NOT NULL,
      accuracy_percentage REAL NOT NULL,
      prompt_level INTEGER NOT NULL,
      session_number INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (iep_goal_id) REFERENCES iep_goals(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    `,

    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_students_therapist ON students(therapist_id)`,
    `CREATE INDEX IF NOT EXISTS idx_iep_goals_student ON iep_goals(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_iep_goals_active ON iep_goals(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_goal ON sessions(iep_goal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_trials_session ON trials(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_accuracy_history_goal ON session_accuracy_history(iep_goal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_accuracy_history_student ON session_accuracy_history(student_id)`,

    // Migration 2: Add child login and eval data fields
    // Note: SQLite doesn't allow UNIQUE constraint in ALTER TABLE, so we add column first then index
    `ALTER TABLE students ADD COLUMN username TEXT`,
    `ALTER TABLE students ADD COLUMN password_hash TEXT`,
    `ALTER TABLE students ADD COLUMN problem_type TEXT DEFAULT 'language'`, // 'language', 'articulation', or 'both'
    `ALTER TABLE students ADD COLUMN eval_data TEXT`, // JSON: {baseline_accuracy, target_sounds, categories, prompt_level}
    `ALTER TABLE students ADD COLUMN has_seen_demo INTEGER DEFAULT 0`,
    `ALTER TABLE students ADD COLUMN last_login DATETIME`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username ON students(username)`,

    // Migration 3: Add goal deadline, baseline, and comments fields
    `ALTER TABLE iep_goals ADD COLUMN deadline TEXT`,
    `ALTER TABLE iep_goals ADD COLUMN baseline TEXT`,
    `ALTER TABLE iep_goals ADD COLUMN comments TEXT`,

    // Migration 4: Add SOAP note fields to sessions table
    `ALTER TABLE sessions ADD COLUMN soap_subjective TEXT`,
    `ALTER TABLE sessions ADD COLUMN soap_objective TEXT`,
    `ALTER TABLE sessions ADD COLUMN soap_assessment TEXT`,
    `ALTER TABLE sessions ADD COLUMN soap_plan TEXT`,

    // Migration 5: Add evaluation PDF upload fields
    `ALTER TABLE students ADD COLUMN eval_pdf_path TEXT`,
    `ALTER TABLE students ADD COLUMN eval_pdf_uploaded_at DATETIME`,
    `ALTER TABLE students ADD COLUMN eval_pdf_original_name TEXT`,

    // Migration 6: Add goal PDF upload fields
    `ALTER TABLE students ADD COLUMN goal_pdf_path TEXT`,
    `ALTER TABLE students ADD COLUMN goal_pdf_uploaded_at DATETIME`,
    `ALTER TABLE students ADD COLUMN goal_pdf_original_name TEXT`,

    // Migration 7: Add SLP review tracking for sessions
    `ALTER TABLE sessions ADD COLUMN slp_reviewed INTEGER DEFAULT 0`,

    // Migration 8: Add SLP review tracking for goals
    `ALTER TABLE iep_goals ADD COLUMN slp_reviewed INTEGER DEFAULT 0`,
  ];

  // Run each migration
  for (const migration of migrations) {
    try {
      db.exec(migration);
    } catch (error) {
      // Ignore errors for CREATE IF NOT EXISTS and duplicate columns
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate column')
        ) {
          // Expected for idempotent migrations
          continue;
        }
      }
      logger.warn('Migration warning:', error);
    }
  }

  logger.info('PIPER database migrations completed');
}

/**
 * Helper to run a query and return all results
 */
export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Helper to run a query and return first result
 */
export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * Helper to run an insert/update/delete and return changes info
 */
export function execute(
  sql: string,
  params: unknown[] = []
): Database.RunResult {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Helper to run multiple statements in a transaction
 */
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

export default {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  queryAll,
  queryOne,
  execute,
  transaction,
};

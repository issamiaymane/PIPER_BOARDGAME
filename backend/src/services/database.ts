import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 10;

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
      slp_id INTEGER,
      school_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
      FOREIGN KEY (slp_id) REFERENCES therapist_members(id) ON DELETE SET NULL,
      FOREIGN KEY (school_id) REFERENCES therapist_schools(id) ON DELETE SET NULL
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

  // Create schools table (for therapist dashboard management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS therapist_schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create members table (for therapist dashboard management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS therapist_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      roles TEXT NOT NULL,
      school_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES therapist_schools(id) ON DELETE SET NULL
    )
  `);

  // Create indexes for schools and members
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_school ON therapist_members(school_id);
    CREATE INDEX IF NOT EXISTS idx_members_email ON therapist_members(email);
  `);

  // Run migrations for existing tables
  runMigrations(db);

  // Seed default data
  seedDefaultData(db);

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

  // Add session_duration_minutes if missing (IEP service time)
  if (!columnNames.includes('session_duration_minutes')) {
    db.exec('ALTER TABLE children ADD COLUMN session_duration_minutes INTEGER');
    logger.info('Migration: Added session_duration_minutes column');
  }

  // Add session_frequency if missing (IEP service time)
  if (!columnNames.includes('session_frequency')) {
    db.exec('ALTER TABLE children ADD COLUMN session_frequency TEXT');
    logger.info('Migration: Added session_frequency column');
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

  // Add session_duration_minutes if missing (per-goal session time)
  if (!goalColumnNames.includes('session_duration_minutes')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN session_duration_minutes INTEGER');
    logger.info('Migration: Added session_duration_minutes column to iep_goals');
  }

  // Add session_frequency if missing (per-goal session frequency)
  if (!goalColumnNames.includes('session_frequency')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN session_frequency TEXT');
    logger.info('Migration: Added session_frequency column to iep_goals');
  }

  // Add objectives if missing (JSON array of objectives)
  if (!goalColumnNames.includes('objectives')) {
    db.exec('ALTER TABLE iep_goals ADD COLUMN objectives TEXT');
    logger.info('Migration: Added objectives column to iep_goals');
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

  // Get existing columns in therapist_members table
  const memberColumns = db
    .prepare("PRAGMA table_info(therapist_members)")
    .all() as { name: string }[];
  const memberColumnNames = memberColumns.map((c) => c.name);

  // Add password_hash if missing
  if (memberColumnNames.length > 0 && !memberColumnNames.includes('password_hash')) {
    db.exec("ALTER TABLE therapist_members ADD COLUMN password_hash TEXT DEFAULT ''");
    logger.info('Migration: Added password_hash column to therapist_members');
  }

  // Add slp_id to children table if missing
  if (!columnNames.includes('slp_id')) {
    db.exec('ALTER TABLE children ADD COLUMN slp_id INTEGER');
    logger.info('Migration: Added slp_id column to children');
  }

  // Add school_id to children table if missing
  if (!columnNames.includes('school_id')) {
    db.exec('ALTER TABLE children ADD COLUMN school_id INTEGER');
    logger.info('Migration: Added school_id column to children');
  }
}

/**
 * Seed default therapist and student data
 */
async function seedDefaultData(db: Database.Database): Promise<void> {
  // Check if default therapist exists
  const existingTherapist = db.prepare(
    'SELECT id FROM therapists WHERE email = ?'
  ).get('hailey@piperspeech.com') as { id: number } | undefined;

  let therapistId: number;

  if (!existingTherapist) {
    // Create default therapist
    const passwordHash = bcrypt.hashSync('Piper1234', SALT_ROUNDS);
    const result = db.prepare(`
      INSERT INTO therapists (email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?)
    `).run('hailey@piperspeech.com', passwordHash, 'Hailey', 'Elias');
    therapistId = result.lastInsertRowid as number;
    logger.info('Seeded default therapist: hailey@piperspeech.com');
  } else {
    therapistId = existingTherapist.id;
  }

  // Check if default student exists
  const existingStudent = db.prepare(
    'SELECT id FROM children WHERE username = ?'
  ).get('student@piperspeech.com') as { id: number } | undefined;

  if (!existingStudent) {
    // Create default student with real extracted eval data
    const passwordHash = bcrypt.hashSync('Piper1234', SALT_ROUNDS);
    const evalData = JSON.stringify({
      service_type: { value: 'both', confidence: 0.9 },
      languages_spoken: { value: 'English', confidence: 1 },
      family_religion: { value: null, confidence: 0 },
      medical_history: {
        value: 'Prenatal exposure to psychiatric medications and drugs/alcohol, many seizures during first weeks of life, adopted at 2 weeks old.',
        confidence: 0.9
      },
      other_diagnoses: { value: 'Autism Spectrum Disorder', confidence: 1 },
      speech_diagnoses: { value: 'Moderate/severe language delay', confidence: 0.9 },
      prior_therapy: { value: 'less-1', confidence: 0.8 },
      baseline_accuracy: { value: null, confidence: 0 },
      goals_benchmarks: {
        value: 'Formulate sentences or questions when provided a word or statement.',
        confidence: 0.8
      },
      strengths: {
        value: 'Adequate pragmatic and social skills, average articulation abilities.',
        confidence: 0.8
      },
      weaknesses: {
        value: 'Misuse of age-appropriate syntactic structures, difficulty with expressive language/syntax.',
        confidence: 0.9
      },
      target_sounds: { value: ['w/r', 'l/r'], confidence: 0.8 },
      teachers: { value: 'Pam Gandy', confidence: 0.9 },
      notes: { value: 'Student is in a home-based independent-study program.', confidence: 0.8 }
    });
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO children (
        therapist_id, username, password_hash, first_name, last_name,
        date_of_birth, grade_level, problem_type, eval_data,
        eval_pdf_path, eval_pdf_uploaded_at, eval_pdf_original_name,
        goals_pdf_path, goals_pdf_uploaded_at, goals_pdf_original_name,
        session_duration_minutes, session_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      therapistId,
      'student@piperspeech.com',
      passwordHash,
      'Piper',
      'Elias',
      '2018-05-12',
      '1st Grade',
      'both',
      evalData,
      '/uploads/evaluations/piper_elias_eval.pdf',
      now,
      'Piper_Elias_Speech_Evaluation_2024.pdf',
      '/uploads/goals/piper_elias_iep.pdf',
      now,
      'Piper_Elias_IEP_Goals_2024.pdf',
      30,           // session_duration_minutes: 30 minutes per session
      '2x weekly'   // session_frequency: twice per week
    );

    // Get the student ID for adding goals
    const studentResult = db.prepare('SELECT id FROM children WHERE username = ?').get('student@piperspeech.com') as { id: number };
    const studentId = studentResult.id;

    // Seed IEP goals
    const goals = [
      {
        goal_type: 'language',
        goal_description: 'By February 2026, Piper will retell a ability-appropriate story using first/next/last vocabulary and correct syntactic structures, given minimal supports and a visual cue, with 80% accuracy over the course of 3 trials, as determined by SLP/A observation and tally.',
        target_percentage: 80,
        baseline: '60% accuracy retell with complete grammar and age-appropriate syntactic structures',
        target_date: '2026-02-01',
        sessions_to_confirm: 3,
        comments: 'Syntax/verbal formulation goal',
        boardgame_categories: JSON.stringify([
          'Wh- Questions Short Stories',
          'First Next Then Last',
          'Sequencing Images - Set Of 3 Or 4',
          'Short Stories Sequencing',
          'Short Stories Level 1',
          'Short Stories Level 2',
          'Building Sentences Level 1 - Elementary'
        ]),
        session_duration_minutes: 30,
        session_frequency: '2x weekly',
        objectives: JSON.stringify([
          {
            description: 'By the first reporting period, Piper will retell a ability-appropriate story using first/next/last vocabulary and correct syntactic structures, given moderate supports and a visual cue, with 65% accuracy over the course of 3 trials.',
            target_percentage: 65,
            deadline: '2025-06-01'
          },
          {
            description: 'By the second reporting period, Piper will retell a ability-appropriate story using first/next/last vocabulary and correct syntactic structures, given moderate supports and a visual cue, with 70% accuracy over the course of 3 trials.',
            target_percentage: 70,
            deadline: '2025-10-01'
          },
          {
            description: 'By the third reporting period, Piper will retell a ability-appropriate story using first/next/last vocabulary and correct syntactic structures, given minimal supports and a visual cue, with 75% accuracy over the course of 3 trials.',
            target_percentage: 75,
            deadline: '2026-02-01'
          }
        ])
      },
      {
        goal_type: 'language',
        goal_description: 'By February 2026, when provided a visual aid and asked to describe a target picture/object, Piper will improve expressive semantic knowledge by accurately verbalizing the items on a semantic relations map (e.g., category, function, appearance, etc.), using age-appropriate grammar and complete utterances, with 80% accuracy given minimal support.',
        target_percentage: 80,
        baseline: '50% accuracy',
        target_date: '2026-02-01',
        sessions_to_confirm: 3,
        comments: 'Semantic and expressive language goal',
        boardgame_categories: JSON.stringify([
          'Function Labeling',
          'Semantic Relationships',
          'Categories - Label The Category',
          'Categories - Identifying Members Of A Category',
          'Identifying Parts Of A Whole',
          'Describing',
          'Describing - More Advanced',
          'Expanding Sentences - Images With Who What Where',
          'Naming And Categorizing'
        ]),
        session_duration_minutes: 30,
        session_frequency: '2x weekly',
        objectives: null
      }
    ];

    const insertGoal = db.prepare(`
      INSERT INTO iep_goals (
        student_id, goal_type, goal_description, target_percentage,
        baseline, target_date, sessions_to_confirm, comments, boardgame_categories,
        session_duration_minutes, session_frequency, objectives
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const goal of goals) {
      insertGoal.run(
        studentId,
        goal.goal_type,
        goal.goal_description,
        goal.target_percentage,
        goal.baseline,
        goal.target_date,
        goal.sessions_to_confirm,
        goal.comments,
        goal.boardgame_categories,
        goal.session_duration_minutes,
        goal.session_frequency,
        goal.objectives
      );
    }

    logger.info('Seeded default student: student@piperspeech.com (Piper Elias) with eval data and 2 IEP goals');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

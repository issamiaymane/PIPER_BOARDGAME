const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'admin.db'));

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        admin_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        roles TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS school_members (
        school_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        PRIMARY KEY (school_id, member_id),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        birthdate TEXT NOT NULL,
        slp_id INTEGER NOT NULL,
        school_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slp_id) REFERENCES members(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        slp_id INTEGER NOT NULL,
        school_id INTEGER NOT NULL,
        date DATETIME NOT NULL,
        status TEXT DEFAULT 'in_progress',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (slp_id) REFERENCES members(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );
`);

module.exports = db;

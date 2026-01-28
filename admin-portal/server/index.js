require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyToken } = require('@clerk/backend');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://69.62.106.83:5173', 'http://localhost:3001', 'http://69.62.106.83:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Helper middleware for API auth - verifies custom JWT template
const requireApiAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the custom JWT using Clerk's verifyToken
        const claims = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            authorizedParties: [
                'http://localhost:5173',
                'http://69.62.106.83:5173',
                'http://localhost:3001',
                'http://69.62.106.83:3001'
            ]
        });

        console.log('JWT claims:', JSON.stringify(claims, null, 2));

        if (!claims.userId) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.auth = claims;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check (no auth required)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Piper Admin API' });
});

// Serve admin portal at /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Serve client portal at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve student login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// ============ STUDENT LOGIN API (No auth - for kids) ============

app.post('/api/student-login', (req, res) => {
    try {
        const { initials, birthdate } = req.body;

        if (!initials || !birthdate) {
            return res.status(400).json({ error: 'Initials and birthdate are required' });
        }

        const student = db.prepare(`
            SELECT s.*, sc.name as school_name, m.name as slp_name
            FROM students s
            LEFT JOIN schools sc ON s.school_id = sc.id
            LEFT JOIN members m ON s.slp_id = m.id
            WHERE UPPER(s.initials) = UPPER(?) AND s.birthdate = ?
        `).get(initials, birthdate);

        if (!student) {
            return res.status(401).json({ error: 'Invalid initials or birthdate' });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SCHOOLS ROUTES ============

// Get all schools
app.get('/api/schools', requireApiAuth, (req, res) => {
    try {
        const schools = db.prepare(`
            SELECT s.*,
                   COUNT(sm.member_id) as member_count
            FROM schools s
            LEFT JOIN school_members sm ON s.id = sm.school_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `).all();
        res.json(schools);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create school
app.post('/api/schools', requireApiAuth, (req, res) => {
    try {
        const { name, contactName, contactEmail, contactPhone, adminId } = req.body;
        const result = db.prepare(`
            INSERT INTO schools (name, contact_name, contact_email, contact_phone, admin_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, contactName, contactEmail, contactPhone, adminId || null);

        const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(school);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete school
app.delete('/api/schools/:id', requireApiAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM schools WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MEMBERS ROUTES ============

// Get all members
app.get('/api/members', requireApiAuth, (req, res) => {
    try {
        const members = db.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
        // Parse roles JSON
        const parsed = members.map(m => ({
            ...m,
            roles: JSON.parse(m.roles)
        }));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create member (invite)
app.post('/api/members', requireApiAuth, (req, res) => {
    try {
        const { name, email, roles } = req.body;
        const result = db.prepare(`
            INSERT INTO members (name, email, roles)
            VALUES (?, ?, ?)
        `).run(name, email, JSON.stringify(roles));

        const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({
            ...member,
            roles: JSON.parse(member.roles)
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete member
app.delete('/api/members/:id', requireApiAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ STUDENTS ROUTES ============

// Get all students
app.get('/api/students', requireApiAuth, (req, res) => {
    try {
        const students = db.prepare(`
            SELECT s.*, m.name as slp_name, sc.name as school_name
            FROM students s
            LEFT JOIN members m ON s.slp_id = m.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            ORDER BY s.created_at DESC
        `).all();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create student
app.post('/api/students', requireApiAuth, (req, res) => {
    try {
        const { name, birthdate, slpId, schoolId } = req.body;
        // Generate initials from name
        const initials = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('');

        const result = db.prepare(`
            INSERT INTO students (name, initials, birthdate, slp_id, school_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, initials, birthdate, slpId, schoolId);

        // Return full student with JOINs
        const student = db.prepare(`
            SELECT s.*, m.name as slp_name, sc.name as school_name
            FROM students s
            LEFT JOIN members m ON s.slp_id = m.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE s.id = ?
        `).get(result.lastInsertRowid);
        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update student
app.put('/api/students/:id', requireApiAuth, (req, res) => {
    try {
        const { name, birthdate, slpId } = req.body;
        const initials = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('');

        db.prepare(`
            UPDATE students SET name = ?, initials = ?, birthdate = ?, slp_id = ?
            WHERE id = ?
        `).run(name, initials, birthdate, slpId, req.params.id);

        // Return full student with JOINs
        const student = db.prepare(`
            SELECT s.*, m.name as slp_name, sc.name as school_name
            FROM students s
            LEFT JOIN members m ON s.slp_id = m.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE s.id = ?
        `).get(req.params.id);
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete student
app.delete('/api/students/:id', requireApiAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SESSIONS ROUTES ============

// Get all sessions
app.get('/api/sessions', requireApiAuth, (req, res) => {
    try {
        const sessions = db.prepare(`
            SELECT se.*, st.name as student_name, st.initials as student_initials,
                   m.name as slp_name, sc.name as school_name
            FROM sessions se
            LEFT JOIN students st ON se.student_id = st.id
            LEFT JOIN members m ON se.slp_id = m.id
            LEFT JOIN schools sc ON se.school_id = sc.id
            ORDER BY se.date DESC
        `).all();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create session
app.post('/api/sessions', requireApiAuth, (req, res) => {
    try {
        const { studentId, slpId, schoolId, date, status, notes } = req.body;

        const result = db.prepare(`
            INSERT INTO sessions (student_id, slp_id, school_id, date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(studentId, slpId, schoolId, date || new Date().toISOString(), status || 'in_progress', notes || null);

        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session
app.put('/api/sessions/:id', requireApiAuth, (req, res) => {
    try {
        const { status, notes } = req.body;

        db.prepare(`
            UPDATE sessions SET status = ?, notes = ?
            WHERE id = ?
        `).run(status, notes, req.params.id);

        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete session
app.delete('/api/sessions/:id', requireApiAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ STATS ROUTE ============

app.get('/api/stats', requireApiAuth, (req, res) => {
    try {
        const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools').get().count;
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
        const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
        const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
        res.json({
            schools: schoolCount,
            members: memberCount,
            students: studentCount,
            sessions: sessionCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

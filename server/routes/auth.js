const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insert = await db.query(
            'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone]
        );
        const result = await db.query(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [insert.rows.insertId]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user, token });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') { // Unique constraint violation
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        // Remove password hash from response
        delete user.password_hash;

        res.json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Login (Simplified for template, typically same as user login but checks role)
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    // Check against env vars for simple admin, or DB
    // The requirement says "separate admin login (simple env-based is OK)"
    // But also "Manage admins". We will hybrid this. 
    // We will check DB first. If not in DB, check ENV.

    // Actually, sticking to DB is better for consistency, but we can seed the admin from Env.
    // Let's just use the Usage DB flow for consistency.

    try {
        const result = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        delete user.password_hash;
        res.json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Current User
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await db.query('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Auth /me error:', err);
        res.status(500).json({ error: 'Server error check auth' });
    }
});

module.exports = router;

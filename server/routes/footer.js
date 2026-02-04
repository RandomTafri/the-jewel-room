const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin, optionalAuth } = require('../middleware/auth');

// Get all active footer links (public)
router.get('/links', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, title, url, display_order FROM footer_links WHERE is_active = true ORDER BY display_order ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all footer links including inactive (admin only)
router.get('/links/all', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM footer_links ORDER BY display_order ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new footer link (admin only)
router.post('/links', isAdmin, async (req, res) => {
    try {
        const { title, url, display_order, is_active } = req.body;

        if (!title || !url) {
            return res.status(400).json({ error: 'Title and URL are required' });
        }

        const result = await db.query(
            'INSERT INTO footer_links (title, url, display_order, is_active) VALUES (?, ?, ?, ?)',
            [title, url, display_order || 0, is_active !== false]
        );

        const created = await db.query('SELECT * FROM footer_links WHERE id = ?', [result.rows.insertId]);
        res.json(created.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update footer link (admin only)
router.put('/links/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, display_order, is_active } = req.body;

        const result = await db.query(
            'UPDATE footer_links SET title = ?, url = ?, display_order = ?, is_active = ? WHERE id = ?',
            [title, url, display_order, is_active, id]
        );

        const updated = await db.query('SELECT * FROM footer_links WHERE id = ?', [id]);
        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'Footer link not found' });
        }

        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete footer link (admin only)
router.delete('/links/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM footer_links WHERE id = ?', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Footer link not found' });
        }
        await db.query('DELETE FROM footer_links WHERE id = ?', [id]);

        res.json({ message: 'Footer link deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

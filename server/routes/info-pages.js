const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// Get all info pages
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM info_pages WHERE is_active = true ORDER BY display_order'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching pages' });
    }
});

// Get single page by slug
router.get('/:slug', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM info_pages WHERE slug = ?',
            [req.params.slug]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching page' });
    }
});

// Update page content (admin only)
router.put('/:id', isAdmin, async (req, res) => {
    const { title, content } = req.body;
    try {
        await db.query(
            'UPDATE info_pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, req.params.id]
        );
        res.json({ message: 'Page updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating page' });
    }
});

module.exports = router;

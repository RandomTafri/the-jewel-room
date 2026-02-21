const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

function clampRating(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n);
    if (r < 1 || r > 5) return null;
    return r;
}

// Public: Get featured reviews (max 3)
router.get('/featured', async (req, res) => {
    try {
        const featured = await db.query(
            `SELECT id, author_name, rating, content, created_at
             FROM reviews
             WHERE is_approved = true AND is_featured = true
             ORDER BY featured_order ASC, created_at DESC
             LIMIT 3`,
            []
        );

        if (featured.rows.length === 3) {
            return res.json({ reviews: featured.rows });
        }

        // Fallback: show latest approved (keeps homepage alive if admin hasn't featured 3 yet)
        const approved = await db.query(
            `SELECT id, author_name, rating, content, created_at
             FROM reviews
             WHERE is_approved = true
             ORDER BY created_at DESC
             LIMIT 3`,
            []
        );

        return res.json({ reviews: approved.rows, fallback: true });
    } catch (err) {
        // If migrations weren't run yet (or table was never created), avoid breaking the homepage.
        if (err && err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ reviews: [], fallback: true, missingTable: true });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public: Submit a review (pending approval)
router.post('/', async (req, res) => {
    try {
        const { authorName, rating, content } = req.body || {};

        const name = String(authorName || '').trim();
        const text = String(content || '').trim();
        const r = clampRating(rating);

        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!text || text.length < 10) {
            return res.status(400).json({ error: 'Review is too short' });
        }
        if (name.length > 255) {
            return res.status(400).json({ error: 'Name is too long' });
        }
        if (text.length > 2000) {
            return res.status(400).json({ error: 'Review is too long' });
        }

        const insert = await db.query(
            `INSERT INTO reviews (author_name, rating, content, source, is_approved, is_featured, featured_order)
             VALUES (?, ?, ?, 'website', false, false, 0)`,
            [name, r, text]
        );

        res.status(201).json({ message: 'Review submitted for approval', id: insert.rows.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: List all reviews
router.get('/all', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, author_name, rating, content, source, is_approved, is_featured, featured_order, created_at
             FROM reviews
             ORDER BY created_at DESC`,
            []
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Approve / unapprove a review
router.put('/:id/approve', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_approved } = req.body || {};
        const approved = Boolean(is_approved);

        await db.query('UPDATE reviews SET is_approved = ? WHERE id = ?', [approved, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Set featured reviews (exactly 3)
router.put('/featured', isAdmin, async (req, res) => {
    const featuredIds = (req.body && req.body.featuredIds) || [];

    if (!Array.isArray(featuredIds) || featuredIds.length !== 3) {
        return res.status(400).json({ error: 'Select exactly 3 reviews to feature' });
    }

    const unique = Array.from(new Set(featuredIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))));
    if (unique.length !== 3) {
        return res.status(400).json({ error: 'Featured review ids must be 3 unique numbers' });
    }

    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verify all ids are approved
        const placeholders = unique.map(() => '?').join(',');
        const [rows] = await conn.execute(
            `SELECT id FROM reviews WHERE id IN (${placeholders}) AND is_approved = true`,
            unique
        );

        if (rows.length !== 3) {
            await conn.rollback();
            return res.status(400).json({ error: 'All featured reviews must be approved' });
        }

        await conn.execute('UPDATE reviews SET is_featured = false, featured_order = 0', []);

        for (let i = 0; i < unique.length; i++) {
            await conn.execute(
                'UPDATE reviews SET is_featured = true, featured_order = ? WHERE id = ?',
                [i + 1, unique[i]]
            );
        }

        await conn.commit();
        res.json({ message: 'Featured reviews updated' });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

module.exports = router;

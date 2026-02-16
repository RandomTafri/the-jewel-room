const express = require('express');
const router = express.Router();
const db = require('../db');

// Secure this with a simple query param secret or just rely on it being temporary
// Usage: /api/setup/migrate?secret=supersecuremigration
router.get('/migrate', async (req, res) => {
    if (req.query.secret !== 'supersecuremigration') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = [];

    try {
        // 1. Add is_trending to products
        try {
            await db.query('ALTER TABLE products ADD COLUMN is_trending BOOLEAN DEFAULT FALSE');
            results.push('Added is_trending column to products.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                results.push('is_trending column already exists.');
            } else {
                results.push(`Error adding is_trending: ${e.message}`);
                console.error(e);
            }
        }

        // 2. Add index for is_trending
        try {
            await db.query('CREATE INDEX idx_is_trending ON products(is_trending)');
            results.push('Added index on is_trending.');
        } catch (e) {
            // Ignore if exists
            if (e.code === 'ER_DUP_KEYNAME') {
                results.push('Index idx_is_trending already exists.');
            } else {
                results.push(`Note on index: ${e.message}`);
            }
        }

        // 3. Create instagram_feed table
        await db.query(`
            CREATE TABLE IF NOT EXISTS instagram_feed (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_url VARCHAR(255) NOT NULL,
                caption VARCHAR(255),
                post_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        results.push('Verified/Created instagram_feed table.');

        res.json({ success: true, log: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Migration failed', details: err.message, log: results });
    }
});

module.exports = router;

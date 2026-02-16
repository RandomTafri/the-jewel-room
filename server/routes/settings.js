const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// Helper to ensure table exists
async function ensureSettingsTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value TEXT
        )
    `);
}

// GET all settings
router.get('/', async (req, res) => {
    try {
        try {
            const result = await db.query('SELECT * FROM site_settings');
            const settings = {};
            result.rows.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });
            res.json(settings);
        } catch (e) {
            // If table doesn't exist, create it and return defaults
            if (e.code === 'ER_NO_SUCH_TABLE' || e.message.includes('doesn\'t exist')) {
                await ensureSettingsTable();
                await db.query(`
                    INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES 
                    ('show_trending', 'true'),
                    ('show_instagram', 'true')
                `);
                return res.json({ show_trending: 'true', show_instagram: 'true' });
            }
            throw e;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update settings (Admin only)
router.put('/', isAdmin, async (req, res) => {
    const settings = req.body; // Expects { key: value, key2: value2 }
    try {
        const queries = Object.entries(settings).map(([key, value]) => {
            return db.query(
                `INSERT INTO site_settings (setting_key, setting_value) 
                 VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                [key, String(value)]
            );
        });
        await Promise.all(queries);
        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

module.exports = router;

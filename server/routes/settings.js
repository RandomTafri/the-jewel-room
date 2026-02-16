const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// GET all settings
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM site_settings');
        // Convert array of {setting_key, setting_value} to object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
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

const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/instagram');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'insta-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Helper to ensure table exists
async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS instagram_feed (
            id INT AUTO_INCREMENT PRIMARY KEY,
            image_url VARCHAR(255) NOT NULL,
            link VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// GET all items
router.get('/', async (req, res) => {
    try {
        await ensureTable();
        const result = await db.query('SELECT * FROM instagram_feed ORDER BY created_at DESC');
        res.json(result.rows); // Normalize for mysql2/pg wrapper if needed
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST new item (Admin only)
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    try {
        await ensureTable();
        let imageUrl = req.body.image_url;
        if (req.file) {
            imageUrl = '/uploads/instagram/' + req.file.filename;
        }

        if (!imageUrl) return res.status(400).json({ error: 'Image required' });

        await db.query(
            'INSERT INTO instagram_feed (image_url, link) VALUES (?, ?)',
            [imageUrl, req.body.link || '#']
        );
        res.json({ message: 'Added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE item (Admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM instagram_feed WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

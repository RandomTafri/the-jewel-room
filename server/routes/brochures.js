const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { isAdmin } = require('../middleware/auth');
const { uploadBufferToR2, isR2Configured } = require('../utils/r2');

// Get all brochures
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, title, link, created_at FROM brochures ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Brochure Thumbnail
router.get('/:id/thumbnail', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT thumbnail_url FROM brochures WHERE id = ?', [id]);

        if (result.rows.length === 0 || !result.rows[0].thumbnail_url) return res.status(404).send('Not Found');
        res.redirect(result.rows[0].thumbnail_url);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Legacy: Serve File (Keep for old records if needed, or return 404/redirect)
router.get('/:id/file', async (req, res) => {
    // For V2, we prefer the link. But if old record has file_data, serve it.
    try {
        const { id } = req.params;
        const result = await db.query('SELECT link FROM brochures WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).send('Not Found');

        const b = result.rows[0];
        if (b.link) return res.redirect(b.link); // Redirect to link if exists
        res.status(404).send('No content');
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Admin: Upload Brochure (V2: Link + Thumbnail)
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        // image is now the thumbnail

        let thumbnail_url = '';
        if (req.file) {
            if (!isR2Configured()) {
                return res.status(503).json({ error: 'R2 not configured' });
            }
            const uploadRes = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'brochures/thumbnail',
                originalName: req.file.originalname
            });
            thumbnail_url = uploadRes.publicUrl;
        }

        const result = await db.query(
            'INSERT INTO brochures (title, link, thumbnail_url) VALUES (?, ?, ?)',
            [title, link, thumbnail_url]
        );
        const created = await db.query('SELECT id, title, link FROM brochures WHERE id = ?', [result.rows.insertId]);
        res.status(201).json(created.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error uploading brochure' });
    }
});

// Admin: Delete Brochure
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM brochures WHERE id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting' });
    }
});

module.exports = router;

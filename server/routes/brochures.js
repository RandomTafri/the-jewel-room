const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { isAdmin } = require('../middleware/auth');

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
        const result = await db.query('SELECT thumbnail_data, thumbnail_mime_type FROM brochures WHERE id = $1', [id]);

        if (result.rows.length === 0 || !result.rows[0].thumbnail_data) return res.status(404).send('Not Found');

        const file = result.rows[0];
        res.setHeader('Content-Type', file.thumbnail_mime_type || 'image/jpeg');
        res.send(file.thumbnail_data);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Legacy: Serve File (Keep for old records if needed, or return 404/redirect)
router.get('/:id/file', async (req, res) => {
    // For V2, we prefer the link. But if old record has file_data, serve it.
    try {
        const { id } = req.params;
        const result = await db.query('SELECT link, file_data, mime_type FROM brochures WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).send('Not Found');

        const b = result.rows[0];
        if (b.link) return res.redirect(b.link); // Redirect to link if exists

        if (b.file_data) {
            res.setHeader('Content-Type', b.mime_type || 'application/pdf');
            res.send(b.file_data);
        } else {
            res.status(404).send('No content');
        }
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Admin: Upload Brochure (V2: Link + Thumbnail)
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        // image is now the thumbnail

        let thumbData = null;
        let thumbType = null;
        if (req.file) {
            thumbData = req.file.buffer;
            thumbType = req.file.mimetype;
        }

        const result = await db.query(
            'INSERT INTO brochures (title, link, thumbnail_data, thumbnail_mime_type) VALUES ($1, $2, $3, $4) RETURNING id, title',
            [title, link, thumbData, thumbType]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error uploading brochure' });
    }
});

// Admin: Delete Brochure
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM brochures WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting' });
    }
});

module.exports = router;

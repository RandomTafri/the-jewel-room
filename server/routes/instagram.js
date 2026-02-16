const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBufferToR2, isR2Configured } = require('../utils/r2');
const { logRequest, logDbQuery, logError } = require('../utils/apiLogger');

// GET all feed items
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM instagram_feed ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST new item (Admin)
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    const { caption, post_url, image_url: manualUrl } = req.body;
    logRequest('POST /instagram', 'CREATE', {}, req.body);

    let finalImageUrl = manualUrl || '';

    if (req.file) {
        if (!isR2Configured()) {
            return res.status(400).json({ error: 'R2 not configured' });
        }
        try {
            const uploadRes = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'instagram',
                originalName: req.file.originalname
            });
            finalImageUrl = uploadRes.publicUrl;
        } catch (e) {
            return res.status(500).json({ error: 'Upload failed' });
        }
    }

    if (!finalImageUrl) {
        return res.status(400).json({ error: 'Image required' });
    }

    try {
        const params = [finalImageUrl, caption || null, post_url || null];
        const result = await db.query(
            'INSERT INTO instagram_feed (image_url, caption, post_url) VALUES (?, ?, ?)',
            params
        );
        res.status(201).json({ id: result.insertId, image_url: finalImageUrl, caption, post_url });
    } catch (err) {
        logError('POST /instagram', err, { body: req.body });
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE item (Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM instagram_feed WHERE id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

module.exports = router;

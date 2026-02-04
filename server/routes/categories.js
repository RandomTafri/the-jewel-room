const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { isAdmin } = require('../middleware/auth');
const { uploadBufferToR2, isR2Configured } = require('../utils/r2');

// Get all categories (JSON list)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, image_url FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Category Image
router.get('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT image_url FROM categories WHERE id = ?', [id]);

        if (result.rows.length === 0 || !result.rows[0].image_url) {
            return res.redirect('https://via.placeholder.com/300'); // Fallback
        }

        res.redirect(result.rows[0].image_url);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Admin: Create Category
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        let image_url = '';

        if (req.file) {
            if (!isR2Configured()) {
                return res.status(503).json({ error: 'R2 not configured' });
            }
            const uploadRes = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'categories',
                originalName: req.file.originalname
            });
            image_url = uploadRes.publicUrl;
        }

        const result = await db.query(
            'INSERT INTO categories (name, image_url) VALUES (?, ?)',
            [name, image_url]
        );
        const created = await db.query('SELECT id, name, image_url FROM categories WHERE id = ?', [result.rows.insertId]);
        res.status(201).json(created.rows[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Category exists' });
        console.error(err);
        res.status(500).json({ error: 'Error creating category' });
    }
});

// Admin: Update Category
router.put('/:id', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        let image_url = null;
        if (req.file) {
            if (!isR2Configured()) {
                return res.status(503).json({ error: 'R2 not configured' });
            }
            const uploadRes = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'categories',
                originalName: req.file.originalname
            });
            image_url = uploadRes.publicUrl;
        }

        await db.query(
            `UPDATE categories
             SET name = ?,
                 image_url = COALESCE(?, image_url)
             WHERE id = ?`,
            [name, image_url, id]
        );

        const result = await db.query('SELECT id, name, image_url FROM categories WHERE id = ?', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Category exists' });
        console.error(err);
        res.status(500).json({ error: 'Error updating category' });
    }
});

// Admin: Delete Category
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting' });
    }
});

module.exports = router;

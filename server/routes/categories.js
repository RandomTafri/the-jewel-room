const express = require('express');
const router = express.Router();
const db = require('../db');
const upload = require('../middleware/upload');
const { isAdmin } = require('../middleware/auth');

// Get all categories (JSON list)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Category Image
router.get('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT image_data, mime_type FROM categories WHERE id = $1', [id]);

        if (result.rows.length === 0 || !result.rows[0].image_data) {
            return res.redirect('https://via.placeholder.com/300'); // Fallback
        }

        const img = result.rows[0];
        res.setHeader('Content-Type', img.mime_type || 'image/jpeg');
        res.send(img.image_data);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Admin: Create Category
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        let image_data = null;
        let mime_type = null;

        if (req.file) {
            image_data = req.file.buffer;
            mime_type = req.file.mimetype;
        }

        const result = await db.query(
            'INSERT INTO categories (name, image_data, mime_type) VALUES ($1, $2, $3) RETURNING id, name',
            [name, image_data, mime_type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Category exists' });
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

        let image_data = null;
        let mime_type = null;

        if (req.file) {
            image_data = req.file.buffer;
            mime_type = req.file.mimetype;
        }

        const result = await db.query(
            `UPDATE categories
             SET name = $1,
                 image_data = COALESCE($2, image_data),
                 mime_type = COALESCE($3, mime_type)
             WHERE id = $4
             RETURNING id, name`,
            [name, image_data, mime_type, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Category exists' });
        console.error(err);
        res.status(500).json({ error: 'Error updating category' });
    }
});

// Admin: Delete Category
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting' });
    }
});

module.exports = router;

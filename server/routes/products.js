const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBufferToR2, isR2Configured } = require('../utils/r2');

// Get all products (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { cat, search, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM products WHERE is_active = true';
        const params = [];

        if (cat) {
            params.push(`%${cat}%`);
            query += ` AND category LIKE ?`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`);
        }

        if (minPrice) {
            params.push(minPrice);
            query += ` AND price >= ?`;
        }

        if (maxPrice) {
            params.push(maxPrice);
            query += ` AND price <= ?`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Product Image
router.get('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT image_url FROM products WHERE id = ?', [id]);

        if (result.rows.length === 0 || !result.rows[0].image_url) {
            return res.status(404).send('Not Found');
        }

        res.redirect(result.rows[0].image_url);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Create Product
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    const { name, description, price, category, stock, image_url: manualUrl } = req.body;

    let image_url = manualUrl || '';

    if (req.file) {
        if (!isR2Configured()) {
            return res.status(503).json({ error: 'R2 not configured' });
        }
        const upload = await uploadBufferToR2({
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
            keyPrefix: 'products',
            originalName: req.file.originalname
        });
        image_url = upload.publicUrl;
    }

    try {
        const insert = await db.query(
            'INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, category, image_url, stock]
        );
        const insertedId = insert.rows.insertId;
        const result = await db.query('SELECT * FROM products WHERE id = ?', [insertedId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating product' });
    }
});

// Admin: Update Product
router.put('/:id', isAdmin, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock, is_active } = req.body;

    let nextImageUrl = image_url;
    if (req.file) {
        if (!isR2Configured()) {
            return res.status(503).json({ error: 'R2 not configured' });
        }
        const upload = await uploadBufferToR2({
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
            keyPrefix: 'products',
            originalName: req.file.originalname
        });
        nextImageUrl = upload.publicUrl;
    }

    try {
        await db.query(
            `UPDATE products SET 
                name = COALESCE(?, name), 
                description = COALESCE(?, description), 
                price = COALESCE(?, price), 
                category = COALESCE(?, category), 
                image_url = COALESCE(?, image_url), 
                stock = COALESCE(?, stock),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, description, price, category, nextImageUrl, stock, is_active, id]
        );
        const result = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating product' });
    }
});

// Admin: Delete Product
router.delete('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE products SET is_active = false WHERE id = ?', [id]);
        const result = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted (soft)' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting product' });
    }
});

module.exports = router;

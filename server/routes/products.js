const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBufferToR2, isR2Configured } = require('../utils/r2');
const { logRequest, logDbQuery, logError, logSuccess } = require('../utils/apiLogger');

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

    logRequest('POST /products', 'CREATE', {}, req.body);

    let image_url = manualUrl || '';

    if (req.file) {
        if (!isR2Configured()) {
            return res.status(400).json({
                error: 'Image upload not available: R2 storage is not configured. Please use a manual image URL instead.'
            });
        }
        try {
            const upload = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'products',
                originalName: req.file.originalname
            });
            image_url = upload.publicUrl;
        } catch (uploadErr) {
            console.error('R2 upload failed:', uploadErr);
            return res.status(500).json({
                error: 'Image upload failed. Please try using a manual image URL instead.'
            });
        }
    }

    try {
        const params = [name ?? null, description ?? null, price ?? null, category ?? null, image_url ?? null, stock ?? null];
        logDbQuery('INSERT INTO products', params);

        const insert = await db.query(
            'INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)',
            params
        );
        const insertedId = insert.insertId;
        const result = await db.query('SELECT * FROM products WHERE id = ?', [insertedId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        logError('POST /products', err, { body: req.body });
        res.status(500).json({ error: 'Error creating product' });
    }
});

// Admin: Update Product
router.put('/:id', isAdmin, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock, is_active } = req.body;

    logRequest('PUT /products/:id', 'UPDATE', { id }, req.body);

    let nextImageUrl = image_url ?? null;
    if (req.file) {
        if (!isR2Configured()) {
            return res.status(400).json({
                error: 'Image upload not available: R2 storage is not configured. Please use a manual image URL instead.'
            });
        }
        try {
            const upload = await uploadBufferToR2({
                buffer: req.file.buffer,
                contentType: req.file.mimetype,
                keyPrefix: 'products',
                originalName: req.file.originalname
            });
            nextImageUrl = upload.publicUrl;
        } catch (uploadErr) {
            console.error('R2 upload failed:', uploadErr);
            return res.status(500).json({
                error: 'Image upload failed. Please try using a manual image URL instead.'
            });
        }
    }

    try {
        const params = [
            name ?? null,
            description ?? null,
            price ?? null,
            category ?? null,
            nextImageUrl ?? null,
            stock ?? null,
            is_active ?? null,
            id
        ];

        logDbQuery('UPDATE products', params);

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
            params
        );
        const result = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        logSuccess('PUT /products/:id', 'Product updated successfully');
        res.json(result.rows[0]);
    } catch (err) {
        logError('PUT /products/:id', err, { id, body: req.body });
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

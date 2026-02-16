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

        query += ' ORDER BY is_featured DESC, created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ... (GET /:id/image and GET /:id remain unchanged)

// Admin: Create Product
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    const { name, description, price, category, stock, image_url: manualUrl, is_featured } = req.body;

    logRequest('POST /products', 'CREATE', {}, req.body);

    let image_url = manualUrl || '';

    // ... (Image upload logic remains unchanged)

    try {
        const params = [
            name ?? null,
            description ?? null,
            price ?? null,
            category ?? null,
            image_url ?? null,
            stock ?? null,
            is_featured === 'true' || is_featured === true // Handle string or boolean
        ];
        logDbQuery('INSERT INTO products', params);

        const insert = await db.query(
            'INSERT INTO products (name, description, price, category, image_url, stock, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
    const { name, description, price, category, image_url, stock, is_active, is_featured } = req.body;

    // ... (Logging logic remains unchanged)

    // ... (Image upload logic remains unchanged)

    try {
        const params = [
            name ?? null,
            description ?? null,
            price ?? null,
            category ?? null,
            nextImageUrl ?? null,
            stock ?? null,
            is_active ?? null,
            is_featured !== undefined ? (is_featured === 'true' || is_featured === true) : null,
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
                is_active = COALESCE(?, is_active),
                is_featured = COALESCE(?, is_featured)
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

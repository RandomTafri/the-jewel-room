const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all products (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { cat, search, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM products WHERE is_active = true';
        const params = [];

        if (cat) {
            params.push(`%${cat}%`);
            query += ` AND category ILIKE $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        if (minPrice) {
            params.push(minPrice);
            query += ` AND price >= $${params.length}`;
        }

        if (maxPrice) {
            params.push(maxPrice);
            query += ` AND price <= $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        // Map results to use DB image endpoint if data exists
        const products = result.rows.map(p => ({
            ...p,
            image_url: p.image_data ? `/api/products/${p.id}/image` : p.image_url
        }));

        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Product Image
router.get('/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT image_data, mime_type FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0 || !result.rows[0].image_data) {
            return res.status(404).send('Not Found');
        }

        const img = result.rows[0];
        res.setHeader('Content-Type', img.mime_type || 'image/jpeg');
        res.send(img.image_data);
    } catch (err) {
        res.status(500).send('Error');
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const p = result.rows[0];
        if (p.image_data) p.image_url = `/api/products/${p.id}/image`;

        res.json(p);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Create Product
router.post('/', isAdmin, upload.single('image'), async (req, res) => {
    const { name, description, price, category, stock, image_url: manualUrl } = req.body;

    let image_data = null;
    let mime_type = null;
    let image_url = manualUrl || '';

    if (req.file) {
        image_data = req.file.buffer;
        mime_type = req.file.mimetype;
    }

    try {
        const result = await db.query(
            'INSERT INTO products (name, description, price, category, image_url, image_data, mime_type, stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, description, price, category, image_url, image_data, mime_type, stock]
        );
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

    let image_data = null;
    let mime_type = null;

    if (req.file) {
        image_data = req.file.buffer;
        mime_type = req.file.mimetype;
    }

    try {
        const result = await db.query(
            `UPDATE products SET 
                name = COALESCE($1, name), 
                description = COALESCE($2, description), 
                price = COALESCE($3, price), 
                category = COALESCE($4, category), 
                image_url = COALESCE($5, image_url), 
                stock = COALESCE($6, stock),
                is_active = COALESCE($7, is_active),
                image_data = COALESCE($8, image_data),
                mime_type = COALESCE($9, mime_type)
             WHERE id = $10 RETURNING *`,
            [name, description, price, category, image_url, stock, is_active, image_data, mime_type, id]
        );
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
        const result = await db.query('UPDATE products SET is_active = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted (soft)' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting product' });
    }
});

module.exports = router;

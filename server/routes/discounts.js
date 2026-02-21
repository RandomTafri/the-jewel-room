const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// GET all discounts (Admin only)
router.get('/', isAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM discounts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching discounts:', err);
        res.status(500).json({ error: 'Failed to fetch discounts' });
    }
});

// POST new discount (Admin only)
router.post('/', isAdmin, async (req, res) => {
    const { code, type, value, min_order_value, is_active } = req.body;

    if (!code || !type || value === undefined) {
        return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    try {
        const query = `
            INSERT INTO discounts (code, type, value, min_order_value, is_active)
            VALUES (?, ?, ?, ?, ?)
        `;
        const activeState = (is_active === false || is_active === 'false' || is_active === 0) ? false : true;

        await db.query(query, [
            code.toUpperCase(),
            type.toUpperCase(),
            value,
            min_order_value || 0,
            activeState
        ]);

        res.status(201).json({ message: 'Discount created successfully' });
    } catch (err) {
        console.error('Error creating discount:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: 'Failed to create discount' });
    }
});

// PUT update discount (Admin only) - usually used to toggle active status or edit details
router.put('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { code, type, value, min_order_value, is_active } = req.body;

    try {
        // Build dynamic update query to handle partial updates
        let query = 'UPDATE discounts SET ';
        const params = [];
        const updates = [];

        if (code !== undefined) {
            updates.push('code = ?');
            params.push(code.toUpperCase());
        }
        if (type !== undefined) {
            updates.push('type = ?');
            params.push(type.toUpperCase());
        }
        if (value !== undefined) {
            updates.push('value = ?');
            params.push(value);
        }
        if (min_order_value !== undefined) {
            updates.push('min_order_value = ?');
            params.push(min_order_value);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            const activeState = (is_active === false || is_active === 'false' || is_active === 0) ? false : true;
            params.push(activeState);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);
        res.json({ message: 'Discount updated successfully' });
    } catch (err) {
        console.error('Error updating discount:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: 'Failed to update discount' });
    }
});

// DELETE a discount (Admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM discounts WHERE id = ?', [id]);
        res.json({ message: 'Discount deleted successfully' });
    } catch (err) {
        console.error('Error deleting discount:', err);
        res.status(500).json({ error: 'Failed to delete discount' });
    }
});

module.exports = router;

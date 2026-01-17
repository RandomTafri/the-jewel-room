const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// Get All Orders
router.get('/orders', isAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

// Update Order Status
router.put('/orders/:id/status', isAdmin, async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        await db.query('UPDATE orders SET order_status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

module.exports = router;

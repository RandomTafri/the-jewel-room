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
        await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

// Get Single Order Details
router.get('/orders/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Get order
        const orderResult = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Parse items_snapshot to get order items
        let items = [];
        if (order.items_snapshot) {
            // Check if already parsed (object) or needs parsing (string)
            items = typeof order.items_snapshot === 'string'
                ? JSON.parse(order.items_snapshot)
                : order.items_snapshot;
        }

        // Combine order data with items
        const orderDetails = {
            ...order,
            items: items,
            // Parse shipping address if it's JSON string
            shipping_address_line1: order.shipping_address,
            shipping_address_line2: '',
            shipping_city: '',
            shipping_state: '',
            shipping_pincode: ''
        };

        // Try to parse shipping_address if it contains structured data
        try {
            if (typeof order.shipping_address === 'string' && order.shipping_address.includes('{')) {
                const addr = JSON.parse(order.shipping_address);
                orderDetails.shipping_address_line1 = addr.line1 || addr.address || order.shipping_address;
                orderDetails.shipping_address_line2 = addr.line2 || '';
                orderDetails.shipping_city = addr.city || '';
                orderDetails.shipping_state = addr.state || '';
                orderDetails.shipping_pincode = addr.pincode || addr.zip || '';
            }
        } catch (e) {
            // Keep as is if not JSON
        }

        res.json(orderDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching order details' });
    }
});

module.exports = router;

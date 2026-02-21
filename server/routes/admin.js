const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// ===================== ADMIN USER MANAGEMENT =====================

// List all admin users
router.get('/users', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, name, email, phone, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching admin users' });
    }
});

// Add a new admin user
router.post('/users', isAdmin, async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, 'admin', ?)",
            [name, email, hashedPassword, phone || null]
        );
        res.status(201).json({ message: 'Admin user created' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error creating admin user' });
    }
});

// Update an admin user
router.put('/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, password } = req.body;
    try {
        // Check user exists and is admin
        const check = await db.query("SELECT id FROM users WHERE id = ? AND role = 'admin'", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });

        // Update basic fields
        await db.query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone || null, id]);

        // If password provided, update it too
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, id]);
        }

        res.json({ message: 'Admin user updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error updating admin user' });
    }
});

// Delete an admin user (cannot delete yourself)
router.delete('/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    try {
        const check = await db.query("SELECT id FROM users WHERE id = ? AND role = 'admin'", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });

        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Admin user deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting admin user' });
    }
});

// ===================== ORDER MANAGEMENT =====================

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

// Update Payment Status
router.put('/orders/:id/payment-status', isAdmin, async (req, res) => {
    const { payment_status } = req.body;
    const { id } = req.params;
    try {
        await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);
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

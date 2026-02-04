const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Razorpay = require('razorpay');
require('dotenv').config();

//const razorpay = new Razorpay({
//    key_id: process.env.RAZORPAY_KEY_ID,
//    key_secret: process.env.RAZORPAY_KEY_SECRET
//});

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const razorpay =
  key_id && key_secret
    ? new Razorpay({ key_id, key_secret })
    : null;

// In routes: if (!razorpay) return 503 with message "Razorpay not configured"

// Create Order
router.post('/', authenticateToken, async (req, res) => {
    const {
        shippingAddress,
        customerName,
        customerPhone,
        items, // Passed from frontend or we fetch from DB cart. Fetching from DB is safer.
        paymentMethod, // 'COD' or 'ONLINE'
        totalAmount // Simplified: Frontend calculates, Backend verifies ideally.
    } = req.body;

    // In a real app, perform calculation verification here using `items` IDs.
    // For this template, we assume `items` contains { product_id, quantity, price } and we sum it up.

    try {
        if (paymentMethod === 'ONLINE' && !razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }
        // 1. Create Order in DB
        const insert = await db.query(
            `INSERT INTO orders 
            (user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, payment_method, items_snapshot, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                customerName,
                req.user.email, // Assuming email from token 
                customerPhone,
                shippingAddress,
                totalAmount,
                paymentMethod,
                JSON.stringify(items),
                paymentMethod === 'COD' ? 'PENDING' : 'PENDING'
            ]
        );

        const orderResult = await db.query('SELECT * FROM orders WHERE id = ?', [insert.rows.insertId]);
        const order = orderResult.rows[0];

        // 2. If Online, create Razorpay Order
        let razorpayOrder = null;
        if (paymentMethod === 'ONLINE') {
            const options = {
                amount: Math.round(totalAmount * 100), // amount in paisa
                currency: "INR",
                receipt: `order_${order.id}`
            };
            razorpayOrder = await razorpay.orders.create(options);

            // Update DB with razorpay order id
            await db.query('UPDATE orders SET razorpay_order_id = ? WHERE id = ?', [razorpayOrder.id, order.id]);
        }

        // 3. Clear Cart (assume user has one cart)
        await db.query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)', [req.user.id]);

        res.json({
            orderId: order.id,
            razorpayOrder,
            message: 'Order Created'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Order Creation Failed' });
    }
});

// Verify Payment (Razorpay)
router.post('/verify-payment', authenticateToken, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
        // Success
        await db.query(
            "UPDATE orders SET payment_status = 'PAID', razorpay_payment_id = ? WHERE id = ?",
            [razorpay_payment_id, orderId]
        );
        res.json({ status: 'success' });
    } else {
        res.status(400).json({ status: 'failure' });
    }
});

// Get User Orders
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

module.exports = router;

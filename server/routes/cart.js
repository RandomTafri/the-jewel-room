const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { calculateDiscount } = require('../utils/discounts');

// Helper: Get Cart (Guest or User)
async function getOrCreateCart(userId, sessionId) {
    let query, params;
    if (userId) {
        query = 'SELECT * FROM carts WHERE user_id = ?';
        params = [userId];
    } else {
        query = 'SELECT * FROM carts WHERE session_id = ?';
        params = [sessionId];
    }

    let result = await db.query(query, params);
    if (result.rows.length > 0) return result.rows[0];

    // Create
    if (userId) {
        result = await db.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    } else {
        result = await db.query('INSERT INTO carts (session_id) VALUES (?)', [sessionId]);
    }
    const inserted = await db.query('SELECT * FROM carts WHERE id = ?', [result.rows.insertId]);
    return inserted.rows[0];
}

// Get Cart items
router.get('/', async (req, res) => {
    const userId = req.headers['authorization'] ? getUserIdFromToken(req) : null;
    const sessionId = req.headers['x-session-id'];
    const couponCode = req.query.coupon; // Allow checking via query param

    if (!userId && !sessionId) return res.status(400).json({ error: 'Info missing' });

    try {
        const cart = await getOrCreateCart(userId, sessionId);
        const items = await db.query(
            `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_url 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.id 
             WHERE ci.cart_id = ?`,
            [cart.id]
        );

        const subtotal = items.rows.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);

        let discount = { discountAmount: 0, finalTotal: subtotal, message: '' };
        if (couponCode) {
            discount = await calculateDiscount(items.rows, couponCode, subtotal);
        }

        res.json({
            cartId: cart.id,
            items: items.rows,
            subtotal,
            discount,
            total: discount.finalTotal
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Item
router.post('/', async (req, res) => {
    const userId = req.headers['authorization'] ? getUserIdFromToken(req) : null;
    const sessionId = req.headers['x-session-id'];
    const { productId, quantity } = req.body;

    if (!userId && !sessionId) return res.status(400).json({ error: 'Info missing' });

    try {
        const cart = await getOrCreateCart(userId, sessionId);
        const qtyToAdd = parseInt(quantity) || 1;

        // Check Product Stock
        const productRes = await db.query('SELECT stock FROM products WHERE id = ?', [productId]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const availableStock = productRes.rows[0].stock;

        // Check if item exists
        const existing = await db.query(
            'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cart.id, productId]
        );

        let currentQtyInCart = 0;
        if (existing.rows.length > 0) {
            currentQtyInCart = existing.rows[0].quantity;
        }

        if (currentQtyInCart + qtyToAdd > availableStock) {
            return res.status(400).json({ error: `Insufficient stock. Available: ${availableStock}` });
        }

        if (existing.rows.length > 0) {
            // Update quantity
            const newQty = existing.rows[0].quantity + qtyToAdd;
            await db.query(
                'UPDATE cart_items SET quantity = ? WHERE id = ?',
                [newQty, existing.rows[0].id]
            );
        } else {
            // Insert
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cart.id, productId, qtyToAdd]
            );
        }
        res.json({ message: 'Added to cart' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Item Qty
router.put('/update/:itemId', async (req, res) => {
    const { quantity } = req.body;
    const { itemId } = req.params;
    try {
        if (quantity <= 0) {
            await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
        } else {
            await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
        }
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Merge Guest Cart
router.post('/merge', authenticateToken, async (req, res) => {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) return res.status(400).json({ error: 'No session ID' });

    try {
        const guestCart = await db.query('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
        if (guestCart.rows.length === 0) return res.json({ message: 'No guest cart' });

        const guestCartId = guestCart.rows[0].id;
        const userCart = await getOrCreateCart(userId, null);

        const guestItems = await db.query('SELECT * FROM cart_items WHERE cart_id = ?', [guestCartId]);

        for (let item of guestItems.rows) {
            const userItem = await db.query(
                'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
                [userCart.id, item.product_id]
            );
            if (userItem.rows.length > 0) {
                await db.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [item.quantity, userItem.rows[0].id]);
            } else {
                await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [userCart.id, item.product_id, item.quantity]);
            }
        }

        await db.query('DELETE FROM carts WHERE id = ?', [guestCartId]);
        res.json({ message: 'Merged' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Merge failed' });
    }
});

const jwt = require('jsonwebtoken');
function getUserIdFromToken(req) {
    try {
        const token = req.headers['authorization'].split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return decoded.id;
    } catch (e) {
        return null;
    }
}

module.exports = router;

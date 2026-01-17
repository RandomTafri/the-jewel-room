const express = require('express');
const router = express.Router();
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

// Middleware to get user_id or session_id
router.use(optionalAuth);

// Get Wishlist Items (with Product Details)
router.get('/', async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const sessionId = req.headers['x-session-id']; // Client sends this

        if (!userId && !sessionId) {
            return res.status(400).json({ error: 'No user or session context' });
        }

        let query = `
            SELECT w.id as wishlist_id, p.*, 
            (SELECT image_data FROM products WHERE id = p.id) as image_data 
            FROM wishlist w
            JOIN products p ON w.product_id = p.id
            WHERE `;

        const params = [];

        if (userId) {
            query += `w.user_id = $1`;
            params.push(userId);
        } else {
            query += `w.session_id = $1 AND w.user_id IS NULL`;
            params.push(sessionId);
        }

        query += ` ORDER BY w.created_at DESC`;

        const result = await db.query(query, params);

        // Format image URLs
        const items = result.rows.map(p => ({
            ...p,
            image_url: p.image_data ? `/api/products/${p.id}/image` : p.image_url,
            image_data: undefined // Don't send raw bytes in list
        }));

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle Like (Add/Remove)
router.post('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user ? req.user.id : null;
        const sessionId = req.headers['x-session-id'];

        if (!userId && !sessionId) {
            return res.status(400).json({ error: 'No context' });
        }

        // Check if exists
        let checkQuery = 'SELECT id FROM wishlist WHERE product_id = $1 AND ';
        let checkParams = [productId];

        if (userId) {
            checkQuery += 'user_id = $2';
            checkParams.push(userId);
        } else {
            checkQuery += 'session_id = $2 AND user_id IS NULL';
            checkParams.push(sessionId);
        }

        const checkRes = await db.query(checkQuery, checkParams);

        if (checkRes.rows.length > 0) {
            // Exists -> Remove it (Unlike)
            await db.query('DELETE FROM wishlist WHERE id = $1', [checkRes.rows[0].id]);
            return res.json({ liked: false, message: 'Removed from wishlist' });
        } else {
            // Not exist -> Add it (Like)
            let insertQuery = 'INSERT INTO wishlist (product_id, user_id, session_id) VALUES ($1, $2, $3) RETURNING id';
            let insertParams = [productId, userId, userId ? null : sessionId]; // If user, session is null (or keep both? prefer strict ownership)

            // Note: If user logs in, we might want to migrate session likes. For now, strict separation.

            await db.query(insertQuery, insertParams);
            return res.json({ liked: true, message: 'Added to wishlist' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

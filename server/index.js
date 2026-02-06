const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin'); // Admin specific actions not covered in others
const brochureRoutes = require('./routes/brochures');
const categoryRoutes = require('./routes/categories');
const wishlistRoutes = require('./routes/wishlist');
const footerRoutes = require('./routes/footer');
const infoPages = require('./routes/info-pages');
const reviewRoutes = require('./routes/reviews');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brochures', brochureRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/footer', footerRoutes);
app.use('/api/info-pages', infoPages);
app.use('/api/reviews', reviewRoutes);

// Config endpoint for frontend
const config = require('../config');
app.get('/api/config', (req, res) => {
    res.json({
        appName: config.appName,
        enableCOD: config.enableCOD,
        enableOnlinePayment: config.enableOnlinePayment,
        razorpayKeyId: config.razorpayKeyId, // Safe to expose public key
        whatsappNumber: config.whatsappNumber,
        theme: config.theme,
        supportEmail: config.supportEmail
    });
});

// Fallback for SPA-like navigation if we were using it, but we are using multi-page
// For multi-page, we just serve static files. 
// If a file isn't found, 404.

(async () => {
    try {
        await db.pingWithRetry();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        // Print useful, non-secret diagnostics for shared hosts (Hostinger, etc.)
        const debugInfo = typeof db.getDbDebugInfo === 'function' ? db.getDbDebugInfo() : {};
        console.error('Database connection failed during startup:', {
            code: err && err.code,
            errno: err && err.errno,
            sqlState: err && err.sqlState,
            message: err && (err.sqlMessage || err.message),
            db: debugInfo
        });
        process.exit(1);
    }
})();

const { loadEnv, candidateEnvPaths } = require('./utils/load-env');
const logger = require('./utils/fileLogger');

const loadedFrom = loadEnv();
if (loadedFrom) {
    logger.log(`Loaded environment from: ${loadedFrom}`);
} else {
    logger.log(`No .env found (checked: ${candidateEnvPaths().join(', ')}). Using process environment only.`);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { runMigrations } = require('./utils/migrate');

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
        logger.log('Starting server...');
        logger.log('Connecting to database...');
        await db.pingWithRetry();
        logger.log('Database connection successful!');

        // Optional: create any missing tables/indexes at boot. Safe (additive-only).
        // Helpful on shared hosts where you may not have a reliable way to run migrations.
        if ((process.env.AUTO_MIGRATE || 'true').toLowerCase() === 'true') {
            logger.log('Running migrations...');
            await runMigrations();
            logger.log('Migrations completed');
        }

        app.listen(PORT, () => {
            logger.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        // Print useful, non-secret diagnostics for shared hosts (Hostinger, etc.)
        const debugInfo = typeof db.getDbDebugInfo === 'function' ? db.getDbDebugInfo() : {};
        const errorDetails = {
            code: err && err.code,
            errno: err && err.errno,
            sqlState: err && err.sqlState,
            message: err && (err.sqlMessage || err.message),
            db: debugInfo
        };

        logger.error('Database connection failed during startup', err);
        logger.error('Debug info', errorDetails);
        console.error('Database connection failed during startup:', errorDetails);
        process.exit(1);
    }
})();


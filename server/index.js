// Wrap everything in try-catch to catch module loading errors
try {
    console.log('[STARTUP] Loading environment...');
    const { loadEnv, candidateEnvPaths } = require('./utils/load-env');

    const loadedFrom = loadEnv();
    if (loadedFrom) {
        console.log(`[STARTUP] Loaded environment from: ${loadedFrom}`);
    } else {
        console.log(`[STARTUP] No .env found. Using process environment only.`);
    }

    console.log('[STARTUP] Loading dependencies...');
    const express = require('express');
    const cors = require('cors');
    const path = require('path');

    console.log('[STARTUP] Loading database module...');
    const db = require('./db');

    console.log('[STARTUP] Loading migrations module...');
    const { runMigrations } = require('./utils/migrate');

    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    console.log('[STARTUP] Loading routes...');
    // Routes
    const authRoutes = require('./routes/auth');
    const productRoutes = require('./routes/products');
    const cartRoutes = require('./routes/cart');
    const orderRoutes = require('./routes/orders');
    const adminRoutes = require('./routes/admin');
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
            razorpayKeyId: config.razorpayKeyId,
            whatsappNumber: config.whatsappNumber,
            theme: config.theme,
            supportEmail: config.supportEmail
        });
    });

    console.log('[STARTUP] Starting server...');

    (async () => {
        try {
            console.log('[STARTUP] Connecting to database...');
            await db.pingWithRetry();
            console.log('[STARTUP] ✅ Database connection successful!');

            if ((process.env.AUTO_MIGRATE || 'true').toLowerCase() === 'true') {
                console.log('[STARTUP] Running migrations...');
                await runMigrations();
                console.log('[STARTUP] ✅ Migrations completed');
            }

            app.listen(PORT, () => {
                console.log(`[STARTUP] ✅ Server running on port ${PORT}`);
            });
        } catch (err) {
            const debugInfo = typeof db.getDbDebugInfo === 'function' ? db.getDbDebugInfo() : {};
            const errorDetails = {
                code: err && err.code,
                errno: err && err.errno,
                sqlState: err && err.sqlState,
                message: err && (err.sqlMessage || err.message),
                stack: err && err.stack,
                db: debugInfo
            };

            console.error('[STARTUP] ❌ Database connection failed:', JSON.stringify(errorDetails, null, 2));
            process.exit(1);
        }
    })();

} catch (err) {
    console.error('[STARTUP] ❌ CRITICAL ERROR during module loading:');
    console.error('[STARTUP] Error:', err.message);
    console.error('[STARTUP] Stack:', err.stack);
    process.exit(1);
}

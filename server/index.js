// Wrap everything in try-catch to catch module loading errors
try {
    const { writeStatus, clearStatus, writeError } = require('./utils/statusLogger');

    clearStatus();
    writeStatus('🚀 Server startup initiated');

    writeStatus('Loading environment...');
    const { loadEnv } = require('./utils/load-env');

    const loadedFrom = loadEnv();
    if (loadedFrom) {
        writeStatus(`✅ Loaded environment from: ${loadedFrom}`);
    } else {
        writeStatus('✅ Using process environment only (Hostinger mode)');
    }

    if (!process.env.MYSQL_USER) {
        writeStatus('⚠️ WARNING: MYSQL_USER is missing or empty!');
    }

    writeStatus('Loading Express dependencies...');
    const express = require('express');
    const cors = require('cors');
    const path = require('path');

    writeStatus('Loading database module...');
    const db = require('./db');

    writeStatus('Loading migrations module...');
    const { runMigrations } = require('./utils/migrate');

    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    writeStatus('Loading route modules...');
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

    writeStatus('✅ All modules loaded successfully');

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

    writeStatus('Starting server initialization...');

    (async () => {
        try {
            writeStatus('Attempting database connection...');
            await db.pingWithRetry();
            writeStatus('✅ Database connection successful!');

            if ((process.env.AUTO_MIGRATE || 'true').toLowerCase() === 'true') {
                writeStatus('Running database migrations...');
                await runMigrations();
                writeStatus('✅ Migrations completed');
            }
        } catch (err) {
            writeError('Database connection/migration failed', err);
            console.error('[STARTUP] ❌ Database connection failed. server will exit.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            writeStatus(`✅ Server running on port ${PORT}`);
            writeStatus('🎉 STARTUP COMPLETE - Server is ready!');
        });
    })();

} catch (err) {
    // This catch block handles errors during module loading
    const { writeError } = require('./utils/statusLogger');
    writeError('CRITICAL ERROR during module loading', err);
    console.error('[STARTUP] ❌ CRITICAL ERROR during module loading:');
    console.error('[STARTUP] Error:', err.message);
    console.error('[STARTUP] Stack:', err.stack);
    process.exit(1);
}

// Wrap everything in try-catch to catch module loading errors
try {
    const { writeStatus, clearStatus, writeError } = require('./utils/statusLogger');

    clearStatus();
    writeStatus('🚀 Server startup initiated');

    writeStatus('Loading environment...');
    const { loadEnv, candidateEnvPaths } = require('./utils/load-env');

    const loadedFrom = loadEnv();
    if (loadedFrom) {
        writeStatus(`✅ Loaded environment from: ${loadedFrom}`);
    } else {
        writeStatus('✅ Using process environment only (no .env file loaded)');
    }

    // Debugging: Log available environment variables (security safe)
    writeStatus('DEBUG: Checking Environment Variables...');
    const debugEnv = {
        NODE_ENV: process.env.NODE_ENV,
        mysql_host: process.env.MYSQL_HOST,
        mysql_user: process.env.MYSQL_USER,
        mysql_db: process.env.MYSQL_DATABASE,
        has_password: process.env.MYSQL_PASSWORD ? 'YES (len=' + process.env.MYSQL_PASSWORD.length + ')' : 'NO',
        port: process.env.PORT
    };
    writeStatus(`Env Vars detected: ${JSON.stringify(debugEnv)}`);

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

            app.listen(PORT, () => {
                writeStatus(`✅ Server running on port ${PORT}`);
                writeStatus('🎉 STARTUP COMPLETE - Server is ready!');
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

            writeError('Database connection failed', err);
            writeStatus(`Debug info: ${JSON.stringify(debugInfo, null, 2)}`);
            console.error('[STARTUP] ❌ Database connection failed:', JSON.stringify(errorDetails, null, 2));
            process.exit(1);
        }
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

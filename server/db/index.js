const mysql = require('mysql2/promise');
// dotenv is handled by server/index.js using load-env.js

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPoolConfig() {
    const config = process.env.MYSQL_URL ? process.env.MYSQL_URL : {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'the_jewel_room',
        waitForConnections: true,
        connectionLimit: 10
    };

    // Log the config being used (masking password)
    try {
        const { writeStatus } = require('../utils/statusLogger');
        const debugConfig = typeof config === 'string' ? { url: 'HIDDEN' } : { ...config, password: config.password ? '***' : 'EMPTY' };
        writeStatus(`DB Config: ${JSON.stringify(debugConfig)}`);
    } catch (e) {
        console.log('DB Config:', config.user, 'REDACTED');
    }

    return config;
}

function getDbDebugInfo() {
    // Never log secrets. This is safe to print in shared-host logs.
    return {
        usingUrl: Boolean(process.env.MYSQL_URL),
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER || 'root',
        database: process.env.MYSQL_DATABASE || 'the_jewel_room',
        hasPassword: Boolean(process.env.MYSQL_PASSWORD && process.env.MYSQL_PASSWORD.length > 0)
    };
}

let pool;
try {
    pool = mysql.createPool(buildPoolConfig());
} catch (err) {
    try {
        const { writeError } = require('../utils/statusLogger');
        writeError('Failed to create DB pool', err);
    } catch (e) { }
    throw err;
}

function isTransientDbError(err) {
    // Retry only on connection-ish failures, not on auth/schema problems.
    const transientCodes = new Set([
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ENOTFOUND',
        'PROTOCOL_CONNECTION_LOST',
        'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
        'PROTOCOL_ENQUEUE_HANDSHAKE_TWICE'
    ]);

    return Boolean(err && transientCodes.has(err.code));
}

async function executeWithRetry(fn, { attempts, baseDelayMs } = {}) {
    const maxAttempts = attempts ?? Number(process.env.DB_RETRY_ATTEMPTS || 10);
    const initialDelay = baseDelayMs ?? Number(process.env.DB_RETRY_DELAY_MS || 500);

    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (!isTransientDbError(err) || attempt === maxAttempts) {
                throw err;
            }

            // Exponential backoff with a small cap; keeps shared hosting happy on cold starts.
            const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), 8000);
            await sleep(delay);
        }
    }

    // Unreachable, but keeps linters happy.
    throw lastErr;
}

async function pingWithRetry() {
    await executeWithRetry(() => pool.execute('SELECT 1'));
}

module.exports = {
    query: async (text, params) => {
        const [rows] = await executeWithRetry(() => pool.execute(text, params));
        return { rows };
    },
    pingWithRetry,
    getDbDebugInfo,
    pool
};

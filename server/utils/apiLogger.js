/**
 * API Logger Utility
 * Provides comprehensive logging for API requests and responses
 */

const logRequest = (routeName, method, params = {}, body = {}) => {
    const timestamp = new Date().toISOString();
    console.log('\n======================================');
    console.log(`[${timestamp}] ${method} ${routeName}`);
    console.log('======================================');

    if (Object.keys(params).length > 0) {
        console.log('Params:', JSON.stringify(params, null, 2));
    }

    if (Object.keys(body).length > 0) {
        // Sanitize sensitive data
        const sanitizedBody = { ...body };
        if (sanitizedBody.password) sanitizedBody.password = '***REDACTED***';
        console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
    }
};

const logDbQuery = (query, params = []) => {
    console.log('DB Query:', query.replace(/\s+/g, ' ').trim());
    console.log('DB Params:', JSON.stringify(params, null, 2));

    // Check for undefined values
    const undefinedIndices = [];
    params.forEach((param, index) => {
        if (param === undefined) {
            undefinedIndices.push(index);
        }
    });

    if (undefinedIndices.length > 0) {
        console.error('⚠️  WARNING: DB params contain undefined values at indices:', undefinedIndices);
        console.error('⚠️  This will cause MySQL2 bind parameter errors!');
    }
};

const logError = (routeName, error, context = {}) => {
    const timestamp = new Date().toISOString();
    console.error('\n❌ ================== ERROR ==================');
    console.error(`[${timestamp}] Error in ${routeName}`);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    if (Object.keys(context).length > 0) {
        console.error('Context:', JSON.stringify(context, null, 2));
    }
    console.error('============================================\n');
};

const logSuccess = (routeName, message = 'Success') => {
    console.log(`✅ ${routeName}: ${message}`);
    console.log('======================================\n');
};

/**
 * Sanitize undefined values to null for MySQL2 compatibility
 * @param {Object} obj - Object with potential undefined values
 * @returns {Object} - Object with undefined values converted to null
 */
const sanitizeForDb = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = value === undefined ? null : value;
    }
    return sanitized;
};

/**
 * Convert array of values, replacing undefined with null
 * @param {Array} arr - Array with potential undefined values
 * @returns {Array} - Array with undefined values converted to null
 */
const sanitizeArrayForDb = (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map(item => item === undefined ? null : item);
};

module.exports = {
    logRequest,
    logDbQuery,
    logError,
    logSuccess,
    sanitizeForDb,
    sanitizeArrayForDb
};

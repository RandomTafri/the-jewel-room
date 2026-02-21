const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
let logStream = null;
let errorStream = null;

try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, 'app.log');
    const errorFile = path.join(logsDir, 'error.log');

    // Create write streams
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    errorStream = fs.createWriteStream(errorFile, { flags: 'a' });
} catch (err) {
    console.error('Failed to initialize file logging (will use console only):', err.message);
}

function formatLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    if (data) {
        logMessage += ` ${JSON.stringify(data)}`;
    }
    return logMessage + '\n';
}

function log(message, data = null) {
    const formatted = formatLog('INFO', message, data);
    console.log(formatted.trim());
    if (logStream) {
        try {
            logStream.write(formatted);
        } catch (err) {
            // Silently fail - at least console logging works
        }
    }
}

function error(message, err = null) {
    const data = err ? {
        message: err.message,
        stack: err.stack,
        code: err.code,
        errno: err.errno
    } : null;

    const formatted = formatLog('ERROR', message, data);
    console.error(formatted.trim());
    if (errorStream) {
        try {
            errorStream.write(formatted);
        } catch (writeErr) {
            // Silently fail - at least console logging works
        }
    }
}

function warn(message, data = null) {
    const formatted = formatLog('WARN', message, data);
    console.warn(formatted.trim());
    if (logStream) {
        try {
            logStream.write(formatted);
        } catch (err) {
            // Silently fail - at least console logging works
        }
    }
}

module.exports = { log, error, warn };

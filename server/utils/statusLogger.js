const fs = require('fs');
const path = require('path');

const statusFile = path.join(__dirname, '../../public/startup-status.txt');

function writeStatus(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    try {
        // Append to file
        fs.appendFileSync(statusFile, logLine);
        console.log(logLine.trim());
    } catch (err) {
        // If file write fails, at least log to console
        console.log(logLine.trim());
        console.error('Failed to write to status file:', err.message);
    }
}

function clearStatus() {
    try {
        // Clear the file at startup
        fs.writeFileSync(statusFile, `Server Startup Log - ${new Date().toISOString()}\n${'='.repeat(60)}\n`);
    } catch (err) {
        console.error('Failed to clear status file:', err.message);
    }
}

function writeError(message, error) {
    const timestamp = new Date().toISOString();
    const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack
    };
    const logLine = `[${timestamp}] ❌ ERROR: ${message}\n${JSON.stringify(errorDetails, null, 2)}\n`;

    try {
        fs.appendFileSync(statusFile, logLine);
        console.error(logLine);
    } catch (err) {
        console.error(logLine);
    }
}

module.exports = { writeStatus, clearStatus, writeError };

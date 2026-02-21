const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
}

function candidateEnvPaths() {
    // Order matters: explicit ENV_FILE first, then local .env, then a stable shared-host fallback.
    const candidates = [];
    if (process.env.ENV_FILE) candidates.push(process.env.ENV_FILE);
    candidates.push(path.join(process.cwd(), '.env'));
    // Look in parent directory (useful for shared hosting persistence)
    candidates.push(path.join(process.cwd(), '../.env'));
    if (process.env.USER) candidates.push(`/home/${process.env.USER}/secrets/jewelroom.env`);
    return uniq(candidates);
}

function loadEnv() {
    // If we already have critical env vars, don't load .env
    // This prevents empty/local .env files from overriding Hostinger variables
    if (process.env.MYSQL_HOST) {
        console.log('Environment variables already present (MYSQL_HOST detected). Skipping .env loading.');
        // Return null to indicate no file was loaded, but we are good.
        return null;
    }

    // Checking for production mode alone is risky if Hostinger didn't inject vars yet.
    // If we reached here, MYSQL_HOST is missing, so we SHOULD try to load from .env even in production.
    console.log('MYSQL_HOST not detected in process.env. Attempting to load from .env file...');


    const candidates = candidateEnvPaths();
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                dotenv.config({ path: p });
                return p;
            }
        } catch (e) {
            // Ignore and try next candidate.
        }
    }
    return null;
}

module.exports = { loadEnv, candidateEnvPaths };


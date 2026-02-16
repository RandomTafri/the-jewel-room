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
    if (process.env.USER) candidates.push(`/home/${process.env.USER}/secrets/jewelroom.env`);
    return uniq(candidates);
}

function loadEnv() {
    // If we already have critical env vars, don't load .env
    // This prevents empty/local .env files from overriding Hostinger variables
    if (process.env.MYSQL_HOST) {
        console.log('Environment variables already present (MYSQL_HOST detected). Skipping .env loading.');
        return null;
    }

    // In production, skip .env files and use native environment variables from the hosting platform
    if (process.env.NODE_ENV === 'production') {
        console.log('Production mode detected - using native environment variables (no .env file loaded)');
        return null;
    }

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


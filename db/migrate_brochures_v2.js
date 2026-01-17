const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const schema = `
ALTER TABLE brochures 
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_data BYTEA,
ADD COLUMN IF NOT EXISTS thumbnail_mime_type VARCHAR(50),
ALTER COLUMN file_data DROP NOT NULL,
ALTER COLUMN mime_type DROP NOT NULL;
`;

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Migrating brochures table...');
        await client.query(schema);
        console.log('Brochures table migrated successfully.');
    } catch (err) {
        console.error('Error migrating brochures table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

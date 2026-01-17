const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const schema = `
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_session ON wishlist(session_id);
`;

async function addWishlist() {
    const client = await pool.connect();
    try {
        console.log('Creating wishlist table...');
        await client.query(schema);
        console.log('Wishlist table created successfully.');
    } catch (err) {
        console.error('Error creating wishlist table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

addWishlist();

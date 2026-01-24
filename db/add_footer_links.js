const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const schema = `
CREATE TABLE IF NOT EXISTS footer_links (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default footer links
INSERT INTO footer_links (title, url, display_order) VALUES
('About Us', '/about.html', 1),
('Privacy Policy', '/privacy.html', 2),
('Shipping & Returns', '/shipping.html', 3),
('Contact', '/contact.html', 4),
('FAQ', '/faq.html', 5)
ON CONFLICT DO NOTHING;
`;

async function addFooterLinks() {
    const client = await pool.connect();
    try {
        console.log('Creating footer_links table...');
        await client.query(schema);
        console.log('Footer links table created successfully.');
    } catch (err) {
        console.error('Error creating footer_links table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

addFooterLinks();

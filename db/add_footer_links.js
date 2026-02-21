const mysql = require('mysql2/promise');
require('../server/utils/load-env').loadEnv();

function buildPoolConfig() {
    if (process.env.MYSQL_URL) {
        return process.env.MYSQL_URL;
    }

    return {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'the_jewel_room'
    };
}

async function addFooterLinks() {
    const pool = mysql.createPool(buildPoolConfig());
    try {
        console.log('Creating footer_links table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS footer_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                display_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);
        await pool.execute(`
            INSERT INTO footer_links (title, url, display_order) VALUES
            ('About Us', '/about.html', 1),
            ('Privacy Policy', '/privacy.html', 2),
            ('Shipping & Returns', '/shipping.html', 3),
            ('Contact', '/contact.html', 4),
            ('FAQ', '/faq.html', 5)
        `);
        console.log('Footer links table created successfully.');
    } catch (err) {
        console.error('Error creating footer_links table:', err);
    } finally {
        await pool.end();
    }
}

addFooterLinks();

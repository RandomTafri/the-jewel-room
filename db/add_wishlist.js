const mysql = require('mysql2/promise');
require('dotenv').config();

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

async function addWishlist() {
    const pool = mysql.createPool(buildPoolConfig());
    try {
        console.log('Creating wishlist table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS wishlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                session_id VARCHAR(255),
                product_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
        try {
            await pool.execute('CREATE INDEX idx_wishlist_user ON wishlist(user_id)');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }
        try {
            await pool.execute('CREATE INDEX idx_wishlist_session ON wishlist(session_id)');
        } catch (err) {
            if (err.code !== 'ER_DUP_KEYNAME') throw err;
        }
        console.log('Wishlist table created successfully.');
    } catch (err) {
        console.error('Error creating wishlist table:', err);
    } finally {
        await pool.end();
    }
}

addWishlist();

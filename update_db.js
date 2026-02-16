const db = require('./server/db');

async function updateDB() {
    try {
        console.log('Adding is_trending to products...');
        try {
            await db.query('ALTER TABLE products ADD COLUMN is_trending BOOLEAN DEFAULT FALSE');
            console.log('Added is_trending column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('is_trending column already exists.');
            } else {
                console.error('Error adding column:', e);
            }
        }

        console.log('Creating instagram_feed table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS instagram_feed (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_url VARCHAR(255) NOT NULL,
                caption VARCHAR(255),
                post_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('instagram_feed table created/verified.');

        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

updateDB();

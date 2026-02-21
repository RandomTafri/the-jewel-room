const db = require('../db');

async function ensureReviewsTable() {
    // Safe, additive-only migration. No drops/truncates.
    await db.query(
        `CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            author_name VARCHAR(255) NOT NULL,
            rating TINYINT,
            content TEXT NOT NULL,
            source VARCHAR(50) DEFAULT 'website',
            is_approved BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            featured_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`,
        []
    );

    // MySQL doesn't support IF NOT EXISTS for indexes in all versions; ignore duplicate index name errors.
    try {
        await db.query('CREATE INDEX idx_reviews_featured ON reviews(is_featured, featured_order)', []);
    } catch (err) {
        if (err && err.code !== 'ER_DUP_KEYNAME') throw err;
    }

    try {
        await db.query('CREATE INDEX idx_reviews_approved ON reviews(is_approved, created_at)', []);
    } catch (err) {
        if (err && err.code !== 'ER_DUP_KEYNAME') throw err;
    }
}

async function runMigrations() {
    await ensureReviewsTable();
}

module.exports = { runMigrations };


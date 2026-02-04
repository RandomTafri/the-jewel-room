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

async function migrate() {
    const pool = mysql.createPool(buildPoolConfig());
    try {
        console.log('Migrating brochures table...');
        const [columns] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'brochures'`
        );
        const existing = new Set(columns.map((c) => c.COLUMN_NAME));

        if (!existing.has('link')) {
            await pool.execute('ALTER TABLE brochures ADD COLUMN link TEXT');
        }
        if (!existing.has('thumbnail_url')) {
            await pool.execute('ALTER TABLE brochures ADD COLUMN thumbnail_url TEXT');
        }
        console.log('Brochures table migrated successfully.');
    } catch (err) {
        console.error('Error migrating brochures table:', err);
    } finally {
        await pool.end();
    }
}

migrate();

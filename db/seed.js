const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('Seeding...');

        // 1. Create Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await client.query(`
            INSERT INTO users (name, email, password_hash, role, phone) 
            VALUES ('Admin User', 'admin@thejewelroom.com', $1, 'admin', '9999999999')
            ON CONFLICT (email) DO NOTHING
        `, [hashedPassword]);

        // 2. Products
        const products = [
            {
                name: "Gold Plated Chandbali",
                description: "Traditional gold plated chandbali earrings with pearl drops.",
                price: 1200,
                category: "Earrings",
                image_url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80",
                stock: 10
            },
            {
                name: "Emerald Choker Necklace",
                description: "Stunning emerald like stone choker with adjustable thread.",
                price: 2500,
                category: "Necklaces",
                image_url: "https://images.unsplash.com/photo-1599643477877-5313557d7d89?auto=format&fit=crop&w=800&q=80",
                stock: 5
            },
            {
                name: "Kundan Bangle Set",
                description: "Set of 4 kundan worked bangles.",
                price: 1800,
                category: "Bangles",
                image_url: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?auto=format&fit=crop&w=800&q=80",
                stock: 15
            },
            {
                name: "Oxidized Silver Jhumka",
                description: "Handcrafted oxidized silver jhumkas for daily wear.",
                price: 450,
                category: "Earrings",
                image_url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=80",
                stock: 20
            }
        ];

        for (const p of products) {
            await client.query(`
                INSERT INTO products (name, description, price, category, image_url, stock)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [p.name, p.description, p.price, p.category, p.image_url, p.stock]);
        }

        // 3. Discounts
        await client.query(`
            INSERT INTO discounts (code, type, value, min_order_value, is_active)
            VALUES ('WELCOME10', 'PERCENTAGE', 10, 500, true)
            ON CONFLICT (code) DO NOTHING
        `);

        console.log('Seeding Complete.');
    } catch (err) {
        console.error('Seeding error', err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();

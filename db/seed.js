const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
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

async function seed() {
    const pool = mysql.createPool(buildPoolConfig());
    try {
        console.log('Seeding...');

        // 1. Create Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.execute(
            `INSERT INTO users (name, email, password_hash, role, phone) 
             VALUES ('Admin User', 'admin@thejewelroom.com', ?, 'admin', '9999999999')
             ON DUPLICATE KEY UPDATE email = email`,
            [hashedPassword]
        );

        // 2. Products
        const [productCountRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM products');
        const productCnt = productCountRows && productCountRows[0] ? Number(productCountRows[0].cnt) : 0;
        if (productCnt === 0) {
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
                await pool.execute(
                    `INSERT INTO products (name, description, price, category, image_url, stock)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [p.name, p.description, p.price, p.category, p.image_url, p.stock]
                );
            }
        }

        // 3. Discounts
        await pool.execute(
            `INSERT INTO discounts (code, type, value, min_order_value, usage_limit_per_user, first_order_only, is_active)
             VALUES ('WELCOME10', 'PERCENTAGE', 10, 500, NULL, FALSE, true)
             ON DUPLICATE KEY UPDATE code = code`
        );

        // 4. Default Reviews (only if empty)
        try {
            const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM reviews');
            const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;
            if (cnt === 0) {
                await pool.execute(
                    `INSERT INTO reviews (author_name, rating, content, source, is_approved, is_featured, featured_order)
                     VALUES
                     ('Priya S.', 5, 'Absolutely stunning designs! I wore the Kundan set for a wedding and got so many compliments.', 'seed', true, true, 1),
                     ('Anjali M.', 5, 'Great quality and fast delivery. The packing was also very secure. Will order again!', 'seed', true, true, 2),
                     ('Sneha R.', 5, 'Loved the earrings. They look just like real gold. Highly recommended.', 'seed', true, true, 3)`
                );
            }
        } catch (e) {
            // ignore if reviews table doesn't exist yet
        }

        console.log('Seeding Complete.');
    } catch (err) {
        console.error('Seeding error', err);
    } finally {
        await pool.end();
    }
}

seed();

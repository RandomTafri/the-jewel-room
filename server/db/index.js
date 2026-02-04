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
        database: process.env.MYSQL_DATABASE || 'the_jewel_room',
        waitForConnections: true,
        connectionLimit: 10
    };
}

const pool = mysql.createPool(buildPoolConfig());

module.exports = {
    query: async (text, params) => {
        const [rows] = await pool.execute(text, params);
        return { rows };
    },
    pool
};

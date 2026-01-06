import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool configuration
const poolConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Enable named placeholders for easier query writing
    namedPlaceholders: true,
    // Required for Vercel -> External DB (Hostinger, etc.) communication
    ssl: {
        rejectUnauthorized: false
    }
};

export const pool = mysql.createPool(poolConfig);

/**
 * Execute a query with parameters
 */
export const query = async (sql: string, params?: any) => {
    const [results] = await pool.execute(sql, params);
    return results;
};

export default pool;

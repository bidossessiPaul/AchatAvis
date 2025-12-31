import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool configuration
const poolConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'u262725529_achatavis',
    password: process.env.MYSQL_PASSWORD || 'Achatavis@0815',
    database: process.env.MYSQL_DATABASE || 'u262725529_achatavis',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Enable named placeholders for easier query writing
    namedPlaceholders: true
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

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool configuration
// connectionLimit is overridable via env for different hosting plans.
// Default 10 is safe for Hostinger shared (usually allows 25 concurrent).
const poolConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_LIMIT) || 10,
    queueLimit: 0,
    // Fail fast instead of hanging forever when pool is saturated
    connectTimeout: 10_000,
    // Drop idle connections after 60s so we don't hold sockets open against Hostinger caps
    idleTimeout: 60_000,
    // Keep TCP connections alive to avoid silent drops on long-lived pools
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
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
export const query = async (sql: string, params?: any): Promise<any> => {
    const [results] = await pool.execute(sql, params);
    return results as any;
};

export default pool;

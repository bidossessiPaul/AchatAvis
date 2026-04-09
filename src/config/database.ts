import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool configuration
// connectionLimit is overridable via env for different hosting plans.
// Default 10 is safe for Hostinger shared (usually allows 25 concurrent).
// SSL is enabled by default for production -> external DB (Hostinger, etc.) but
// can be disabled (e.g. Railway TCP proxy in local dev) by setting MYSQL_SSL=false.
const sslEnabled = (process.env.MYSQL_SSL ?? 'true').toLowerCase() !== 'false';

const poolConfig: mysql.PoolOptions = {
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
    ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {})
};

export const pool = mysql.createPool(poolConfig);

// Transient connection errors caused by an idle TCP socket that the upstream
// (Hostinger / Railway) silently dropped. The pool hands us back the dead
// connection, the first query fails, but a second attempt grabs a fresh one.
const TRANSIENT_DB_ERROR_CODES = new Set([
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'ECONNRESET',
    'EPIPE',
    'ER_CLIENT_INTERACTION_TIMEOUT',
]);

const isTransientDbError = (err: any): boolean => {
    if (!err) return false;
    if (TRANSIENT_DB_ERROR_CODES.has(err.code)) return true;
    // mysql2 sometimes wraps the error: check the message too
    const msg = String(err.message || '');
    return msg.includes('ETIMEDOUT') || msg.includes('PROTOCOL_CONNECTION_LOST');
};

/**
 * Execute a query with parameters. Retries once on transient connection errors
 * (idle TCP socket killed upstream) so callers don't see noisy 500s.
 */
export const query = async (sql: string, params?: any): Promise<any> => {
    try {
        const [results] = await pool.execute(sql, params);
        return results as any;
    } catch (err: any) {
        if (!isTransientDbError(err)) throw err;
        // One retry — pool.execute() will pick a fresh connection
        const [results] = await pool.execute(sql, params);
        return results as any;
    }
};

export default pool;

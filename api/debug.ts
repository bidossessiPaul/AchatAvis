import { pool } from '../src/config/database';

export default async function handler(req: any, res: any) {
    try {
        // 1. Basic check
        const status = {
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV,
            root_dir: process.cwd(),
            message: "Debug handler is alive"
        };

        // 2. DB check
        let dbStatus = "Checking...";
        try {
            const [rows]: any = await pool.query('SELECT 1 as connection');
            dbStatus = rows[0].connection === 1 ? "Connected" : "Unexpected response";
        } catch (dbErr: any) {
            dbStatus = "Error: " + dbErr.message;
        }

        res.status(200).json({
            status,
            dbStatus,
            allowedOrigins: process.env.ALLOWED_ORIGINS
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

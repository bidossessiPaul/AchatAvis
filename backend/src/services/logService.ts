import pool from '../app';
import { AdminLog } from '../models/types';
import { RowDataPacket } from 'mysql2';

export class LogService {

    /**
     * Create a new audit log entry
     */
    static async logAction(
        adminId: number,
        action: string,
        targetType: string,
        targetId?: number,
        details?: any,
        ipAddress?: string
    ): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [adminId, action, targetType, targetId, JSON.stringify(details || {}), ipAddress]
            );
        } catch (error) {
            console.error('Error creating audit log:', error);
            // Don't throw, logging failure shouldn't crash the main action
        }
    }

    /**
     * Get paginated logs with admin details
     */
    static async getLogs(limit: number = 50, offset: number = 0): Promise<{ logs: AdminLog[], total: number }> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT l.*, u.full_name as admin_name, u.email as admin_email 
             FROM admin_logs l
             LEFT JOIN users u ON l.admin_id = u.id
             ORDER BY l.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM admin_logs'
        );

        return {
            logs: rows as AdminLog[],
            total: countResult[0].total
        };
    }
}

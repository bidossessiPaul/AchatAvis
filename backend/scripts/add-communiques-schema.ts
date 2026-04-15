/**
 * Migration: create communiques table for admin-managed announcements.
 *
 * Usage: npx tsx scripts/add-communiques-schema.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

async function main() {
    const connection = await pool.getConnection();
    try {
        console.log('Creating communiques table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS communiques (
                id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(500) NULL,
                date_label VARCHAR(100) NULL,
                icon VARCHAR(50) DEFAULT 'Megaphone',
                accent_color VARCHAR(20) DEFAULT '#0369a1',
                content MEDIUMTEXT NOT NULL,
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 0,
                created_by VARCHAR(36) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_published_sort (is_published, sort_order, created_at)
            )
        `);
        console.log('  ✓ communiques table ready');

        console.log('\n✅ Migration completed');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();

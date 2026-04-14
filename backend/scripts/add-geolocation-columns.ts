/**
 * Migration: Add geolocation tracking columns to users table
 *
 * Usage: npx ts-node scripts/add-geolocation-columns.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

async function main() {
    const connection = await pool.getConnection();
    try {
        console.log('Adding geolocation columns to users table...');

        const columns = [
            { name: 'detected_ip', def: 'VARCHAR(45) NULL' },
            { name: 'detected_country', def: 'VARCHAR(100) NULL' },
            { name: 'detected_country_code', def: 'VARCHAR(5) NULL' },
            { name: 'detected_city', def: 'VARCHAR(100) NULL' },
            { name: 'detected_region', def: 'VARCHAR(100) NULL' },
            { name: 'detected_isp', def: 'VARCHAR(200) NULL' },
            { name: 'detected_is_vpn', def: 'TINYINT(1) DEFAULT 0' },
            { name: 'detected_at', def: 'TIMESTAMP NULL' },
        ];

        for (const col of columns) {
            // Check if column already exists
            const [existing]: any = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?
            `, [col.name]);

            if (existing.length > 0) {
                console.log(`  - ${col.name}: already exists, skipping`);
                continue;
            }

            await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
            console.log(`  ✓ ${col.name} added`);
        }

        console.log('\n✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();

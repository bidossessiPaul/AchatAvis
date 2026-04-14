/**
 * Migration: Add schema for identity verification flow
 *   - users.suspension_reason VARCHAR(50)
 *   - Create table identity_verifications
 *
 * Usage: npx tsx scripts/add-identity-verification-schema.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

async function main() {
    const connection = await pool.getConnection();
    try {
        console.log('Step 1/2: Adding suspension_reason column to users...');
        const [col]: any = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'suspension_reason'
        `);
        if (col.length === 0) {
            await connection.query(`ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(50) NULL`);
            console.log('  ✓ users.suspension_reason added');
        } else {
            console.log('  - already exists, skipping');
        }

        console.log('\nStep 2/2: Creating identity_verifications table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS identity_verifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                document_url VARCHAR(500) NOT NULL,
                document_public_id VARCHAR(255) NULL,
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_by VARCHAR(36) NULL,
                reviewed_at TIMESTAMP NULL,
                rejection_reason TEXT NULL,
                INDEX idx_user_status (user_id, status),
                INDEX idx_status (status),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('  ✓ identity_verifications table ready');

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

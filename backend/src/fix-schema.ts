import { query } from './config/database';

async function fixSchema() {
    console.log('🔍 Checking schema for admin_logs...');
    try {
        // Check admin_logs
        await query(`
            ALTER TABLE admin_logs 
            MODIFY COLUMN admin_id VARCHAR(36),
            MODIFY COLUMN target_id VARCHAR(36);
        `);
        console.log('✅ admin_logs updated to support UUIDs.');

        // Verify users table ID type
        const columns: any = await query('SHOW COLUMNS FROM users LIKE "id"');
        console.log('Users ID Type:', columns[0]?.Type);

    } catch (error) {
        console.error('❌ Schema Fix Failed:', error);
    }
    process.exit();
}

fixSchema();

import { query } from './config/database';

async function checkSchema() {
    console.log('🔍 Verifying remote schema for admin_logs...');
    try {
        const columns: any = await query('SHOW COLUMNS FROM admin_logs');
        console.table(columns.map((c: any) => ({ Field: c.Field, Type: c.Type })));

        const userCols: any = await query('SHOW COLUMNS FROM users');
        console.table(userCols.map((c: any) => ({ Field: c.Field, Type: c.Type })));
    } catch (error) {
        console.error('❌ Check Failed:', error);
    }
    process.exit();
}

checkSchema();

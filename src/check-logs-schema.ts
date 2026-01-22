import { query } from './config/database';

async function checkLogsSchema() {
    console.log('🔍 Checking admin_logs table structure...');
    try {
        const columns: any = await query('SHOW COLUMNS FROM admin_logs');
        console.table(columns.map((c: any) => ({ Field: c.Field, Type: c.Type })));
    } catch (error) {
        console.error('❌ Check Failed:', error);
    }
    process.exit();
}

checkLogsSchema();

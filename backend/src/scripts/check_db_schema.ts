import { query } from '../config/database';

async function checkSchema() {
    console.log('🔍 Checking Database Schema...');

    try {
        const tables: any = await query('SHOW TABLES');
        console.log('\n--- TABLES ---');
        console.table(tables);

        const tablesToInspect = ['users', 'artisans_profiles', 'admins_profiles', 'reviews_submissions', 'reviews_orders', 'payments'];

        for (const table of tablesToInspect) {
            try {
                // Get table name correctly from the object (might vary by DB/driver)
                const tableName = Object.values(tables.find((t: any) => Object.values(t).includes(table)) || {})[0] as string;

                if (tableName) {
                    console.log(`\n--- COLUMNS IN ${tableName} ---`);
                    const columns: any = await query(`DESCRIBE ${tableName}`);
                    console.table(columns);
                } else {
                    console.log(`\n⚠️ Table ${table} NOT FOUND`);
                }
            } catch (err: any) {
                console.log(`\n❌ Error inspecting table ${table}:`, err.message);
            }
        }

    } catch (error: any) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        process.exit();
    }
}

checkSchema();

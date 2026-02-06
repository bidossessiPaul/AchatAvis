import { query } from './src/config/database';

async function checkTable() {
    try {
        console.log('Checking anti_detection_rules table...');
        const result = await query('SHOW TABLES LIKE "anti_detection_rules"');
        console.log('Result:', result);

        if ((result as any).length === 0) {
            console.log('❌ Table anti_detection_rules does NOT exist!');
        } else {
            console.log('✅ Table anti_detection_rules exists');
            const count = await query('SELECT COUNT(*) as count FROM anti_detection_rules');
            console.log('Rows in table:', (count as any)[0].count);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTable();

import { query } from './src/config/database.js';

async function checkUserTable() {
    try {
        console.log('🔍 Checking users table structure...');
        const result = await query('DESCRIBE users');
        console.log('Users table columns:');
        result.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        console.log('\n🔍 Checking if failed_login_attempts exists...');
        const hasColumn = result.some(col => col.Field === 'failed_login_attempts');
        console.log(`failed_login_attempts exists: ${hasColumn}`);

        const hasLocked = result.some(col => col.Field === 'account_locked_until');
        console.log(`account_locked_until exists: ${hasLocked}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUserTable();

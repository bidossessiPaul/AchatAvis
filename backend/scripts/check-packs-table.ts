import { query } from './src/config/database';

async function checkPacksTable() {
    try {
        console.log('Checking subscription_packs table structure...');

        const columns = await query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'subscription_packs'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 Subscription Packs Table Columns:');
        console.table(columns);

        console.log('\n📦 Current Packs:');
        const packs = await query('SELECT * FROM subscription_packs');
        console.table(packs);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPacksTable();

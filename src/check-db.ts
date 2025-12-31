import { query } from './config/database';

async function checkSchema() {
    try {
        console.log('--- Checking artisans_profiles Table ---');
        const columns: any = await query('DESCRIBE artisans_profiles');
        console.table(columns);

        console.log('\n--- Checking User Profiles count ---');
        const count: any = await query('SELECT COUNT(*) as count FROM artisans_profiles');
        console.log('Total profile records:', count[0].count);

        process.exit(0);
    } catch (error) {
        console.error('❌ Schema check failed:', error);
        process.exit(1);
    }
}

checkSchema();

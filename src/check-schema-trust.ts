import { query } from './config/database';

async function checkSchema() {
    try {
        console.log('--- Checking guides_profiles columns ---');
        const columns: any = await query('SHOW COLUMNS FROM guides_profiles');
        console.log(JSON.stringify(columns.map((c: any) => c.Field), null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();

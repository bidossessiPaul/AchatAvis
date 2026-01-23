
import { query } from './src/config/database';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkDB() {
    try {
        console.log('--- Checking tables ---');
        const tables: any = await query('SHOW TABLES');
        console.log('Tables:', tables.map((t: any) => Object.values(t)[0]));

        console.log('\n--- Checking suspension_levels ---');
        const levels: any = await query('SELECT * FROM suspension_levels');
        console.log('Suspension levels count:', levels.length);
        console.log('Levels:', JSON.stringify(levels, null, 2));

        console.log('\n--- Checking users columns ---');
        const columns: any = await query('SHOW COLUMNS FROM users');
        console.log('Users columns:', columns.map((c: any) => c.Field));

        console.log('\n--- Checking artisans_profiles columns ---');
        const apColumns: any = await query('SHOW COLUMNS FROM artisans_profiles');
        console.log('Artisans_profiles columns:', apColumns.map((c: any) => c.Field));

        process.exit(0);
    } catch (error) {
        console.error('DB Check failed:', error);
        process.exit(1);
    }
}

checkDB();

import { query } from './src/config/database';

async function check() {
    try {
        console.log('🔍 Checking artisans_profiles table structure...');
        const result: any = await query('DESCRIBE artisans_profiles');
        console.log('Columns:');
        result.forEach((col: any) => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

check();

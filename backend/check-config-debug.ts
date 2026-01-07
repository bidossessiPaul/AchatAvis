import { query } from './src/config/database';

async function checkConfig() {
    try {
        const result: any = await query('SELECT exempted_user_ids FROM suspension_config LIMIT 1');
        console.log('CURRENT EXEMPTED USER IDS:', result[0]?.exempted_user_ids);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkConfig();

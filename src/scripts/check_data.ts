
import { query } from '../config/database';

async function checkData() {
    try {
        const users = await query('SELECT id, email, role, status FROM users');
        console.log('--- USERS ---');
        users.forEach((u: any) => console.log(`${u.email}: ${u.status} (${u.role})`));

        //        const config = await query('SELECT is_enabled, auto_suspend_enabled FROM suspension_config');
        //        console.log('--- SUSPENSION CONFIG ---');
        //        console.table(config);
    } catch (e: any) {
        console.error('❌ DB Check failed:', e.message);
    } finally {
        process.exit();
    }
}

checkData();

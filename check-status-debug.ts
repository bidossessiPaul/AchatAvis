import { query } from './src/config/database';

async function check() {
    try {
        const rows: any = await query('SELECT email, status FROM users WHERE email = ?', ['Gtr@gmail.com']);
        console.log('User Status Check:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Check failed:', err);
    }
}

check();


const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    const config = {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        ssl: { rejectUnauthorized: false }
    };

    console.log('Connecting to:', config.host, config.database);
    const connection = await mysql.createConnection(config);

    try {
        const [users] = await connection.execute('SELECT id, email, role, status FROM users');
        console.log('--- USERS ---');
        console.table(users);

        const [susp] = await connection.execute('SELECT * FROM suspension_config');
        console.log('--- SUSPENSION CONFIG ---');
        console.table(susp);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

check();

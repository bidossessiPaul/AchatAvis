import { Client } from 'pg';
import 'dotenv/config';

async function testConnection() {
    console.log('Testing connection with individual params...');
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        database: 'achatavis',
        password: ''
    });

    try {
        await client.connect();
        console.log('✓ Successfully connected!');
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        await client.end();
    } catch (err: any) {
        console.error('❌ Connection failed:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

testConnection();

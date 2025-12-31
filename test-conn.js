const { Client } = require('pg');

async function test() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        database: 'achatavis',
        password: ''
    });

    try {
        console.log('Connecting with empty string password...');
        await client.connect();
        console.log('Connected!');
        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

test();

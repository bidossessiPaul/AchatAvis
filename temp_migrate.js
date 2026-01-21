const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'u262725529_achatavis',
        password: process.env.MYSQL_PASSWORD || 'Achatavis@0815',
        database: process.env.MYSQL_DATABASE || 'u262725529_achatavis'
    });

    console.log('Connected to DB...');

    try {
        console.log('Adding payment_id to reviews_orders...');
        await connection.query('ALTER TABLE reviews_orders ADD COLUMN payment_id VARCHAR(36)');
    } catch (e) { console.log('payment_id might already exist'); }

    try {
        console.log('Adding fiches_quota to payments...');
        await connection.query('ALTER TABLE payments ADD COLUMN fiches_quota INT DEFAULT 0');
    } catch (e) { console.log('fiches_quota might already exist'); }

    try {
        console.log('Adding fiches_used to payments...');
        await connection.query('ALTER TABLE payments ADD COLUMN fiches_used INT DEFAULT 0');
    } catch (e) { console.log('fiches_used might already exist'); }

    try {
        console.log('Adding fk_order_payment constraint...');
        await connection.query('ALTER TABLE reviews_orders ADD CONSTRAINT fk_order_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL');
    } catch (e) { console.log('Constraint might already exist'); }

    console.log('Migration finished!');
    await connection.end();
}

migrate().catch(console.error);

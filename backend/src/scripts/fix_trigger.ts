import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });
    await conn.query('DROP TRIGGER IF EXISTS prevent_duplicate_submission');
    await conn.query(`
CREATE TRIGGER prevent_duplicate_submission
BEFORE INSERT ON reviews_submissions
FOR EACH ROW
BEGIN
    IF NEW.proposal_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM reviews_submissions
        WHERE proposal_id = NEW.proposal_id
          AND status != 'rejected'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'DUPLICATE_SUBMISSION';
    END IF;
END
`);
    console.log('Trigger recréé sans deleted_at — OK');
    await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });

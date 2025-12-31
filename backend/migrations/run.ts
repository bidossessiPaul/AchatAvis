import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';

async function runMigrations() {
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files.`);

    // Connect to the database
    const connection = await pool.getConnection();

    try {
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}`);

            // Split SQL file into individual statements
            // MySQL's execute() only supports one statement at a time
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const statement of statements) {
                try {
                    await connection.query(statement);
                } catch (err: any) {
                    // Ignore "already exists" errors for index/table if re-running
                    if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
                        console.error(`Error in statement: ${statement}`);
                        console.error(`Error message: ${err.message}`);
                        // throw err; // Optional: stop on error
                    }
                }
            }

            console.log(`Successfully completed: ${file}`);
        }

        console.log('All migrations completed!');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    } finally {
        connection.release();
        await pool.end();
        process.exit(0);
    }
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

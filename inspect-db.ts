import { pool } from './src/config/database';

async function inspect() {
    try {
        const [rows] = await pool.execute('DESCRIBE artisans_profiles');
        console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error inspecting database:', error);
    } finally {
        process.exit(0);
    }
}

inspect();

import { v4 as uuidv4 } from 'uuid';
import { query, pool } from './src/config/database';
import { hashPassword } from './src/utils/password';

async function createAdmin() {
    const email = 'dossoumaxime888@gmail.com';
    const password = 'Paul@0815';
    const fullName = 'Maxime Dossou';

    try {
        console.log(`Creating admin user: ${email}...`);

        const hashedPassword = await hashPassword(password);
        const userId = uuidv4();

        await query(
            `INSERT INTO users (id, email, full_name, password_hash, role, status, email_verified)
             VALUES (?, ?, ?, ?, 'admin', 'active', TRUE)`,
            [userId, email, fullName, hashedPassword]
        );

        console.log('✅ Admin user created successfully!');
        process.exit(0);
    } catch (error: any) {
        if (error.errno === 1062) {
            console.error('❌ Error: This email is already registered.');
        } else {
            console.error('❌ Error creating admin user:', error);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createAdmin();

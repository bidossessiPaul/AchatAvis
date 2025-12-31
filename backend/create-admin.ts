
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './src/utils/password';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const createAdmin = async () => {
    let connection;
    try {
        console.log('Connecting to database...');

        const dbConfig = {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'u262725529_achatavis',
            password: process.env.MYSQL_PASSWORD || 'Achatavis@0815',
            database: process.env.MYSQL_DATABASE || 'u262725529_achatavis',
            port: parseInt(process.env.DB_PORT || '3306'),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };

        // If password is explicitly empty string in env, use it
        if (process.env.MYSQL_PASSWORD === '') {
            dbConfig.password = '';
        }

        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        const email = 'antoine@lannkin.com';
        const rawPassword = 'Paul@0815';

        console.log(`Creating admin user: ${email}`);

        // Hash password
        const hashedPassword = await hashPassword(rawPassword);
        const userId = uuidv4();
        const adminId = uuidv4();

        // Check if user exists
        const [existingUsers]: any = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            console.log('User already exists!');
            process.exit(1);
        }

        // Begin transaction
        await connection.beginTransaction();

        try {
            // Insert into users
            await connection.execute(
                'INSERT INTO users (id, email, password_hash, role, status, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [userId, email, hashedPassword, 'admin', 'active', true]
            );

            // Insert into admins_profiles
            // Note: permissions is JSON, can be a simple array of strings or object
            const initialPermissions = JSON.stringify(['all']);

            await connection.execute(
                'INSERT INTO admins_profiles (id, user_id, full_name, permissions, created_at) VALUES (?, ?, ?, ?, NOW())',
                [adminId, userId, 'Antoine Lannkin', initialPermissions]
            );

            await connection.commit();
            console.log('Admin user created successfully!');
            console.log(`Email: ${email}`);
            console.log(`Password: ${rawPassword}`);

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit();
    }
};

createAdmin();

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

console.log('--- Environment Check ---');
console.log('CWD:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
if (process.env.JWT_SECRET) {
    console.log('JWT_SECRET (first 3 chars):', process.env.JWT_SECRET.substring(0, 3) + '...');
} else {
    console.log('JWT_SECRET is MISSING in .env');
}

console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
if (process.env.JWT_REFRESH_SECRET) {
    console.log('JWT_REFRESH_SECRET (first 3 chars):', process.env.JWT_REFRESH_SECRET.substring(0, 3) + '...');
} else {
    console.log('JWT_REFRESH_SECRET is MISSING in .env');
}

console.log('MYSQL_HOST exists:', !!process.env.MYSQL_HOST);
console.log('MYSQL_USER exists:', !!process.env.MYSQL_USER);
console.log('-------------------------');

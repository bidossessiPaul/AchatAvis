import { login } from './src/services/authService';

async function testLogin() {
    try {
        console.log('Testing login with a test account...');
        // Try with any email/password to see the actual error
        await login('test@example.com', 'password123');
        console.log('Login succeeded (unexpected)');
    } catch (e: any) {
        console.error('Login error:', e.message);
        console.error('Stack:', e.stack);
    } finally {
        process.exit(0);
    }
}

testLogin();

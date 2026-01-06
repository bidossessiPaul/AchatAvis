import { suspensionService } from './src/services/suspensionService';
import { query } from './src/config/database';

async function testDoubleSuspension() {
    const testUserId = 'test-user-double-suspension';
    const levelId = 1;
    const category = 'Test';
    const details = 'Test details';

    try {
        // 1. Ensure test user exists and is active
        await query("INSERT INTO users (id, email, role, status) VALUES (?, 'double@test.com', 'artisan', 'active') ON DUPLICATE KEY UPDATE status='active'", [testUserId]);

        // 2. Clear previous suspensions for this user
        await query("DELETE FROM user_suspensions WHERE user_id = ?", [testUserId]);

        console.log('Step 1: Creating first suspension...');
        await suspensionService.createSuspension(testUserId, levelId, category, details);
        console.log('First suspension created successfully.');

        console.log('Step 2: Attempting second suspension...');
        try {
            await suspensionService.createSuspension(testUserId, levelId, category, details);
            console.log('FAIL: Second suspension should have been blocked');
        } catch (e: any) {
            if (e.message.includes('déjà suspendu')) {
                console.log('SUCCESS: Second suspension blocked as expected:', e.message);
            } else {
                console.log('FAILED: Unexpected error message:', e.message);
            }
        }
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        // Cleanup
        await query("DELETE FROM user_suspensions WHERE user_id = ?", [testUserId]);
        await query("DELETE FROM users WHERE id = ?", [testUserId]);
        process.exit(0);
    }
}

testDoubleSuspension();

import { query } from './src/config/database';

(async () => {
    try {
        console.log('🔄 Checking for users who should be suspended but are active...');

        // Find inconsistencies
        const inconsistentUsers: any = await query(`
            SELECT id, email, full_name, warning_count, status
            FROM users
            WHERE warning_count >= 3 AND status != 'suspended'
        `);

        console.log(`📊 Found ${inconsistentUsers.length} inconsistent users.`);

        if (inconsistentUsers.length > 0) {
            console.log(JSON.stringify(inconsistentUsers, null, 2));

            // Fix them
            const result: any = await query(`
                UPDATE users 
                SET status = 'suspended', last_suspended_at = NOW() 
                WHERE warning_count >= 3 AND status != 'suspended'
            `);

            console.log(`✅ Fixed ${result.affectedRows} users. set to 'suspended'.`);
        } else {
            console.log('✅ No inconsistencies found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

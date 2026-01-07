import { query } from './src/config/database';

(async () => {
    try {
        // Find user with 3 warnings
        const users: any = await query(`
            SELECT id, email, full_name, warning_count, status 
            FROM users 
            WHERE warning_count = 3
            LIMIT 1
        `);

        if (!users || users.length === 0) {
            console.log('❌ No user with 3 warnings found');
            process.exit(1);
        }

        const user = users[0];
        console.log('\n📊 USER WITH 3 WARNINGS:');
        console.log(JSON.stringify(user, null, 2));

        // Check if they have an active suspension
        const suspensions: any = await query(`
            SELECT id, reason_category, reason_details, started_at, is_active
            FROM user_suspensions
            WHERE user_id = ? AND is_active = 1
        `, [user.id]);

        console.log('\n🚫 ACTIVE SUSPENSIONS:');
        console.log(JSON.stringify(suspensions, null, 2));

        if (suspensions.length === 0) {
            console.log('\n⚠️  WARNING: User has 3 warnings but NO active suspension!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

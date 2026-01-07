import { query } from './src/config/database';

(async () => {
    try {
        // Get recently suspended users
        const suspendedUsers: any = await query(`
            SELECT u.id, u.email, u.full_name, u.warning_count, u.status, u.last_suspended_at
            FROM users u
            WHERE u.status = 'suspended'
            ORDER BY u.last_suspended_at DESC
            LIMIT 5
        `);

        console.log('\n🚫 RECENTLY SUSPENDED USERS:');
        console.log(JSON.stringify(suspendedUsers, null, 2));

        if (suspendedUsers && suspendedUsers.length > 0) {
            const userId = suspendedUsers[0].id;

            // Get warnings for most recent suspended user
            const warnings: any = await query(`
                SELECT id, warning_type, warning_message, created_at
                FROM suspension_warnings 
                WHERE user_id = ?
                ORDER BY created_at ASC
            `, [userId]);

            console.log(`\n⚠️  WARNINGS FOR ${suspendedUsers[0].email}:`);
            console.log(JSON.stringify(warnings, null, 2));
            console.log(`\nTotal warnings in DB: ${warnings.length}`);
            console.log(`warning_count field: ${suspendedUsers[0].warning_count}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

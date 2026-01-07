import { query } from './src/config/database';

async function checkUserSuspension() {
    try {
        const email = 'Gtr@gmail.com';

        console.log(`🔍 Checking suspension status for ${email}...`);

        // Check user status
        const users: any = await query(
            'SELECT id, email, full_name, status FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('❌ User not found');
            process.exit(1);
        }

        const user = users[0];
        console.log('\n👤 User Info:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Status: ${user.status}`);

        // Check active suspensions
        const suspensions: any = await query(
            `SELECT us.*, sl.level_name, sl.level_number 
       FROM user_suspensions us
       JOIN suspension_levels sl ON us.suspension_level_id = sl.id
       WHERE us.user_id = ? AND us.is_active = true`,
            [user.id]
        );

        if (suspensions.length > 0) {
            console.log('\n⚠️  Active Suspensions:');
            suspensions.forEach((s: any) => {
                console.log(`   - Level ${s.level_number}: ${s.level_name}`);
                console.log(`     Reason: ${s.reason_category}`);
                console.log(`     Details: ${s.reason_details}`);
                console.log(`     Started: ${s.started_at}`);
                console.log(`     Ends: ${s.ends_at}`);
            });
        } else {
            console.log('\n✅ No active suspensions found');
        }

        // Provide fix command
        if (user.status === 'suspended') {
            console.log('\n💡 To fix this issue, run:');
            console.log(`   UPDATE users SET status = 'active' WHERE email = '${email}';`);
            console.log(`   UPDATE user_suspensions SET is_active = false WHERE user_id = '${user.id}';`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUserSuspension();

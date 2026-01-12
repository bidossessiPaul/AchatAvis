
import { query } from '../src/config/database';

async function runFix() {
    console.log('🚀 Starting Data Correction: Missions vs Reviews');

    try {
        // 1. Identify users with subscription payments
        const users: any = await query('SELECT DISTINCT user_id FROM payments WHERE type = "subscription"');
        console.log(`Found ${users.length} users with subscriptions.`);

        for (const { user_id } of users) {
            console.log(`\nProcessing User: ${user_id}`);

            // 2. Fix payments for this user
            // Set missions_quota to 1 (all current packs are 1 mission)
            // Move the old missions_quota (which was reviews) to review_credits if review_credits is 0
            await query(`
                UPDATE payments 
                SET 
                    review_credits = CASE WHEN review_credits = 0 OR review_credits IS NULL THEN missions_quota ELSE review_credits END,
                    missions_quota = 1
                WHERE user_id = ? AND type = 'subscription' AND status = 'completed'
            `, [user_id]);

            // 3. Recalculate missions_allowed for the profile
            const [stats]: any = await query(`
                SELECT SUM(missions_quota) as total_packs
                FROM payments
                WHERE user_id = ? AND type = 'subscription' AND status = 'completed'
            `, [user_id]);

            const totalMissionsAllowed = stats.total_packs || 0;

            await query(`
                UPDATE artisans_profiles 
                SET missions_allowed = ?
                WHERE user_id = ?
            `, [totalMissionsAllowed, user_id]);

            console.log(`✅ User ${user_id}: missions_allowed reset to ${totalMissionsAllowed}`);
        }

        console.log('\n✨ Data correction complete!');
    } catch (error) {
        console.error('❌ Fix failed:', error);
    }
}

runFix().then(() => process.exit(0));

import { query, pool } from '../src/config/database';

async function cleanupUserData(email: string) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get user ID
        const [users]: any = await connection.query('SELECT id, full_name FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log(`❌ User ${email} not found`);
            return;
        }

        const userId = users[0].id;
        const userName = users[0].full_name;

        console.log(`🔍 Found user: ${userName} (${userId})`);

        // 2. Delete review proposals linked to orders
        const [proposals]: any = await connection.query(
            'DELETE FROM review_proposals WHERE order_id IN (SELECT id FROM reviews_orders WHERE artisan_id = ?)',
            [userId]
        );
        console.log(`🗑️  Deleted ${proposals.affectedRows} review proposals`);

        // 3. Delete submissions
        const [submissions]: any = await connection.query('DELETE FROM reviews_submissions WHERE artisan_id = ?', [userId]);
        console.log(`🗑️  Deleted ${submissions.affectedRows} submissions`);

        // 4. Delete all missions
        const [orders]: any = await connection.query('DELETE FROM reviews_orders WHERE artisan_id = ?', [userId]);
        console.log(`🗑️  Deleted ${orders.affectedRows} missions`);

        // 5. Delete all payments/packs
        const [payments]: any = await connection.query('DELETE FROM payments WHERE user_id = ?', [userId]);
        console.log(`🗑️  Deleted ${payments.affectedRows} payments/packs`);

        // 6. Delete establishments
        const [establishments]: any = await connection.query('DELETE FROM establishments WHERE user_id = ?', [userId]);
        console.log(`🗑️  Deleted ${establishments.affectedRows} establishments`);

        // 7. Reset artisan profile
        await connection.query(`
            UPDATE artisans_profiles SET 
                subscription_status = 'none',
                missions_allowed = 0,
                monthly_reviews_quota = 0,
                current_month_reviews = 0,
                subscription_start_date = NULL,
                subscription_end_date = NULL,
                stripe_customer_id = NULL,
                stripe_subscription_id = NULL
            WHERE user_id = ?
        `, [userId]);
        console.log(`✅ Profile reset`);

        await connection.commit();
        console.log(`\n✅ Cleanup completed for ${email}`);

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Execute
cleanupUserData('antoine@lannkin.com')
    .then(() => {
        console.log('Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

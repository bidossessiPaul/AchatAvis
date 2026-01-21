
import dotenv from 'dotenv';
import { query } from '../config/database';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const debugUsage = async () => {
    try {
        console.log('--- DEBUGGING USAGE STATS ---');

        // 1. Find the user "Alex Elisé MONTCHO" or "Turebeau ménage"
        // Based on screenshot, let's search by name
        const users: any = await query(`
            SELECT id, full_name, email FROM users 
            WHERE full_name LIKE '%Alex Elisé%' 
            OR email LIKE '%Alex Elisé%'
        `);

        if (users.length === 0) {
            console.log("User not found!");
            return;
        }

        const user = users[0];
        console.log(`Found User: ${user.full_name} (${user.id})`);

        // 2. Get Payments for this user
        // (Keep payment logic, but add global scan)

        console.log(`\n--- GLOBAL SCAN FOR USER ${user.id} ---`);

        // Check ALL submissions where artisan_id = user.id
        const allSubmissions: any = await query(`
            SELECT id, status, artisan_id, guide_id, earnings, proposal_id 
            FROM reviews_submissions 
            WHERE artisan_id = ?
        `, [user.id]);

        console.log(`Found ${allSubmissions.length} TOTAL submissions in DB for this artisan:`);
        console.table(allSubmissions);

        // Check ALL proposals where order_id IN (User's Orders)
        const userOrders: any = await query(`SELECT id FROM reviews_orders WHERE artisan_id = ?`, [user.id]);
        const orderIds = userOrders.map((o: any) => o.id);

        if (orderIds.length > 0) {
            console.log(`\nUser has orders: ${orderIds.join(', ')}`);
            for (const oid of orderIds) {
                const proposals: any = await query(`
                    SELECT id, order_id, status 
                    FROM review_proposals 
                    WHERE order_id = ?
                `, [oid]);
                console.log(`  -> Order [${oid}]: Found ${proposals.length} proposals.`);
                if (proposals.length > 0) console.table(proposals);
            }
        } else {
            console.log("No orders found for this user.");
        }

        // Check for duplicate users
        console.log('\n--- DUPLICATE USER CHECK ---');
        const duplicates: any = await query(`SELECT id, full_name, email, role FROM users WHERE full_name LIKE '%Alex Elisé%'`);
        console.table(duplicates);

        // Check Artisan Profile Stats
        console.log('\n--- ARTISAN PROFILE STATS ---');
        const profile: any = await query(`
            SELECT current_month_reviews, total_reviews_received, fiches_allowed 
            FROM artisans_profiles 
            WHERE user_id = ?
        `, [user.id]);
        console.table(profile);

    } catch (error) {
        console.error('Debug script error:', error);
    } finally {
        process.exit(0);
    }
};

debugUsage();

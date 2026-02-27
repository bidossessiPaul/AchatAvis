import { pool } from '../src/config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const unblockGmailAccounts = async () => {
    console.log('🔍 Starting Gmail account unblocking process (Total Unblock)...');

    try {
        // 1. Get all blocked accounts
        const [blockedAccounts]: any[] = await pool.query(
            'SELECT id, email, maps_profile_url FROM guide_gmail_accounts WHERE is_blocked = 1'
        );

        console.log(`📋 Found ${blockedAccounts.length} blocked accounts.`);

        let unblockedCount = 0;

        for (const account of blockedAccounts) {
            // Unblock EVERY account that is currently blocked, as per user's request to handle verification manually
            await pool.query(
                'UPDATE guide_gmail_accounts SET is_blocked = 0 WHERE id = ?',
                [account.id]
            );
            console.log(`✅ Unblocked account ${account.email} (ID: ${account.id})`);
            unblockedCount++;
        }

        console.log(`🎉 Finished! Unblocked ${unblockedCount} accounts.`);

    } catch (error) {
        console.error('❌ Error unblocking accounts:', error);
    } finally {
        await pool.end();
        process.exit();
    }
};

unblockGmailAccounts();

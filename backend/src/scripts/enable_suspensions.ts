
import { query } from '../config/database';

async function run() {
    console.log('🚀 Enabling suspensions configuration...');
    try {
        // Ensure config exists
        const result: any = await query('SELECT * FROM suspension_config LIMIT 1');

        if (!result || result.length === 0) {
            console.log('Creating default configuration...');
            await query('INSERT INTO suspension_config (is_enabled, auto_suspend_enabled, manual_suspend_only, max_warnings_before_suspend, exempted_countries, exempted_user_ids, blocked_countries) VALUES (true, true, false, 3, "[]", "[]", "[]")');
        } else {
            console.log('Updating existing configuration to ENABLED...');
            await query('UPDATE suspension_config SET is_enabled = true');
        }

        // Add FR to blocked
        const configResult: any = await query('SELECT * FROM suspension_config LIMIT 1');
        const config = configResult[0];

        let blocked: string[] = [];
        try {
            blocked = typeof config.blocked_countries === 'string' ? JSON.parse(config.blocked_countries) : (config.blocked_countries || []);
        } catch (e) {
            blocked = [];
        }

        if (!blocked.includes("FR")) {
            blocked.push("FR");
            await query('UPDATE suspension_config SET blocked_countries = ?', [JSON.stringify(blocked)] as any);
            console.log("✅ Blocked 'FR' (France) for local testing.");
        } else {
            console.log("ℹ️ 'FR' is already blocked.");
        }

        console.log("✅ Suspension system is now ACTIVE and blocking 'FR'.");
    } catch (error) {
        console.error("❌ Error enabling suspensions:", error);
    }

    process.exit(0);
}

run();

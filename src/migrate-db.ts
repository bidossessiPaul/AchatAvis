import { query } from './config/database';

async function migrate() {
    try {
        console.log('--- Migrating Database ---');
        await query('ALTER TABLE artisans_profiles ADD COLUMN missions_allowed INT DEFAULT 0');
        console.log('✓ Column missions_allowed added successfully');
        
        await query("UPDATE artisans_profiles SET missions_allowed = 1 WHERE subscription_status = 'active'");
        console.log('✓ Updated existing active artisans with 1 mission slot');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();

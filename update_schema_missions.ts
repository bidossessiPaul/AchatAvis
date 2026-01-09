import { query } from './src/config/database';

async function updateSchema() {
    console.log('🚀 Starting schema update...');
    try {
        // Update establishments table
        console.log('Updating establishments table...');
        try {
            await query("ALTER TABLE establishments ADD COLUMN company_context TEXT;");
            console.log('✅ Added company_context to establishments');
        } catch (e: any) {
            if (e.message.includes('Duplicate column name')) {
                console.log('ℹ️ company_context already exists in establishments');
            } else {
                console.error('❌ Error adding company_context to establishments:', e.message);
            }
        }

        // Update reviews_orders table
        console.log('Updating reviews_orders table...');
        const columns = [
            { name: 'company_context', type: 'TEXT' },
            { name: 'sector_slug', type: 'VARCHAR(255)' },
            { name: 'sector_difficulty', type: 'VARCHAR(50)' },
            { name: 'city', type: 'VARCHAR(255)' }
        ];

        for (const col of columns) {
            try {
                await query(`ALTER TABLE reviews_orders ADD COLUMN ${col.name} ${col.type};`);
                console.log(`✅ Added ${col.name} to reviews_orders`);
            } catch (e: any) {
                if (e.message.includes('Duplicate column name')) {
                    console.log(`ℹ️ ${col.name} already exists in reviews_orders`);
                } else {
                    console.error(`❌ Error adding ${col.name} to reviews_orders:`, e.message);
                }
            }
        }

        console.log('✨ Schema update completed!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error during schema update:', error);
        process.exit(1);
    }
}

updateSchema();

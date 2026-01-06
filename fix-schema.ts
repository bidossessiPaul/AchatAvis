import { pool, query } from './src/config/database';

async function fixSchema() {
    console.log('--- Starting Robust Schema Fix ---');

    const requiredColumns = [
        { name: 'stripe_customer_id', definition: 'VARCHAR(255)' },
        { name: 'stripe_subscription_id', definition: 'VARCHAR(255)' },
        { name: 'subscription_product_id', definition: 'VARCHAR(255)' },
        { name: 'subscription_start_date', definition: 'DATETIME' },
        { name: 'subscription_end_date', definition: 'DATETIME' },
        { name: 'last_payment_date', definition: 'DATETIME' }
    ];

    try {
        // 1. Check existing columns
        const columns: any = await query('DESCRIBE artisans_profiles');
        const existingColumnNames = columns.map((c: any) => c.Field);

        for (const col of requiredColumns) {
            if (existingColumnNames.includes(col.name)) {
                console.log(`✅ Column '${col.name}' already exists.`);
            } else {
                console.log(`➕ Adding column '${col.name}'...`);
                try {
                    await query(`ALTER TABLE artisans_profiles ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`   Successfully added ${col.name}.`);
                } catch (err: any) {
                    console.error(`   ❌ Failed to add ${col.name}:`, err.message);
                }
            }
        }

        console.log('--- Schema Fix Completed ---');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Critical error during schema fix:', error.message);
        process.exit(1);
    }
}

fixSchema();

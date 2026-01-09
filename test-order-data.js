const { query } = require('./src/config/database');

async function testQuery() {
    try {
        const results = await query(
            `SELECT id, company_name, sector, sector_id, sector_slug, city, establishment_id 
             FROM reviews_orders 
             WHERE id = ?`,
            ['703189f1-81bd-42ab-85f1-d4a8c04af26a']
        );

        console.log('\n=== REVIEWS_ORDERS DATA ===');
        console.log(JSON.stringify(results, null, 2));

        if (results.length > 0 && results[0].establishment_id) {
            const estResults = await query(
                `SELECT id, name, sector_name, sector_id, sector_slug, sector_difficulty, city 
                 FROM establishments 
                 WHERE id = ?`,
                [results[0].establishment_id]
            );

            console.log('\n=== ESTABLISHMENT DATA ===');
            console.log(JSON.stringify(estResults, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testQuery();

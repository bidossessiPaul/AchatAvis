import { query } from './src/config/database';

/**
 * This script syncs establishment data to orders that have an establishment_id
 * but missing sector/city information
 */
async function syncEstablishmentDataToOrders() {
    try {
        console.log('\n🔄 Synchronisation des données établissement vers les ordres...\n');

        // Find orders with establishment_id but missing data
        const ordersToSync = await query(`
            SELECT ro.id, ro.establishment_id, ro.sector, ro.city, ro.company_name
            FROM reviews_orders ro
            WHERE ro.establishment_id IS NOT NULL
            AND (ro.sector IS NULL OR ro.city IS NULL OR ro.sector_slug IS NULL)
        `);

        console.log(`📊 Ordres à synchroniser: ${ordersToSync.length}\n`);

        if (ordersToSync.length === 0) {
            console.log('✅ Aucun ordre à synchroniser, tout est déjà à jour!\n');
            process.exit(0);
        }

        let successCount = 0;
        let errorCount = 0;

        for (const order of ordersToSync) {
            try {
                // Get establishment data
                const establishments = await query(
                    'SELECT sector_id, sector_name, sector_slug, sector_difficulty, city FROM establishments WHERE id = ?',
                    [order.establishment_id]
                );

                if (establishments.length === 0) {
                    console.log(`⚠️  Établissement ${order.establishment_id} non trouvé pour ordre ${order.id}`);
                    errorCount++;
                    continue;
                }

                const est = establishments[0];

                // Update order with establishment data
                await query(`
                    UPDATE reviews_orders 
                    SET 
                        sector = ?,
                        sector_id = ?,
                        sector_slug = ?,
                        sector_difficulty = ?,
                        city = ?
                    WHERE id = ?
                `, [
                    est.sector_name,
                    est.sector_id,
                    est.sector_slug,
                    est.sector_difficulty,
                    est.city,
                    order.id
                ]);

                console.log(`✅ Ordre ${order.company_name} (${order.id.substring(0, 8)}...)`);
                console.log(`   └─ Secteur: ${est.sector_name || 'N/A'}`);
                console.log(`   └─ Ville: ${est.city || 'N/A'}`);
                console.log('');

                successCount++;

            } catch (err) {
                console.error(`❌ Erreur pour ordre ${order.id}:`, err);
                errorCount++;
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 RÉSUMÉ:');
        console.log(`  • Réussis: ${successCount}`);
        console.log(`  • Erreurs: ${errorCount}`);
        console.log(`  • Total: ${ordersToSync.length}`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

syncEstablishmentDataToOrders();

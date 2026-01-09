import { query } from './src/config/database';

async function showOrderData() {
    try {
        const orderId = '703189f1-81bd-42ab-85f1-d4a8c04af26a';

        // Get order data
        const orderResults = await query(
            'SELECT * FROM reviews_orders WHERE id = ?',
            [orderId]
        );

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📋 DONNÉES DE LA COMMANDE');
        console.log('═══════════════════════════════════════════════════════════════\n');

        if (orderResults.length === 0) {
            console.log('❌ Commande non trouvée!');
            process.exit(1);
        }

        const order = orderResults[0];

        console.log('🆔 IDENTIFIANTS:');
        console.log(`  • Order ID: ${order.id}`);
        console.log(`  • Artisan ID: ${order.artisan_id}`);
        console.log(`  • Establishment ID: ${order.establishment_id || 'N/A'}`);
        console.log(`  • Payment ID: ${order.payment_id}`);
        console.log('');

        console.log('🏢 INFORMATIONS ENTREPRISE:');
        console.log(`  • Nom: ${order.company_name}`);
        console.log(`  • Contexte: ${order.company_context || 'N/A'}`);
        console.log(`  • Google URL: ${order.google_business_url || 'N/A'}`);
        console.log('');

        console.log('🏭 SECTEUR (depuis l\'ordre):');
        console.log(`  • Secteur: ${order.sector || 'N/A'}`);
        console.log(`  • Secteur ID: ${order.sector_id || 'N/A'}`);
        console.log(`  • Secteur Slug: ${order.sector_slug || 'N/A'}`);
        console.log(`  • Difficulté: ${order.sector_difficulty || 'N/A'}`);
        console.log('');

        console.log('📍 LOCALISATION (depuis l\'ordre):');
        console.log(`  • Ville: ${order.city || 'N/A'}`);
        console.log(`  • Zones: ${order.zones || 'N/A'}`);
        console.log('');

        // If there's an establishment, get its data for comparison
        if (order.establishment_id) {
            const estResults = await query(
                'SELECT * FROM establishments WHERE id = ?',
                [order.establishment_id]
            );

            if (estResults.length > 0) {
                const est = estResults[0];
                console.log('🏢 DONNÉES DE L\'ÉTABLISSEMENT (pour comparaison):');
                console.log(`  • Nom: ${est.name}`);
                console.log(`  • Ville: ${est.city || 'N/A'}`);
                console.log(`  • Secteur: ${est.sector_name || 'N/A'}`);
                console.log(`  • Secteur ID: ${est.sector_id || 'N/A'}`);
                console.log(`  • Secteur Slug: ${est.sector_slug || 'N/A'}`);
                console.log(`  • Difficulté: ${est.sector_difficulty || 'N/A'}`);
                console.log('');

                console.log('🔍 COMPARAISON:');
                console.log(`  • Ville ordre vs établissement: ${order.city || 'NULL'} vs ${est.city || 'NULL'}`);
                console.log(`  • Secteur ordre vs établissement: ${order.sector || 'NULL'} vs ${est.sector_name || 'NULL'}`);
                console.log(`  • Secteur ID ordre vs établissement: ${order.sector_id || 'NULL'} vs ${est.sector_id || 'NULL'}`);
                console.log(`  • Secteur Slug ordre vs établissement: ${order.sector_slug || 'NULL'} vs ${est.sector_slug || 'NULL'}`);

                if (order.city !== est.city ||
                    order.sector !== est.sector_name ||
                    order.sector_id !== est.sector_id ||
                    order.sector_slug !== est.sector_slug) {
                    console.log('\n⚠️  ATTENTION: Les données de l\'ordre ne correspondent PAS à celles de l\'établissement!');
                } else {
                    console.log('\n✅ Les données de l\'ordre correspondent à celles de l\'établissement');
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

showOrderData();

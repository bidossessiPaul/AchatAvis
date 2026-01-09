const mysql = require('mysql2/promise');

async function showEstablishments() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Ooooooo91!',
        database: 'achatavi_platform'
    });

    try {
        const [rows] = await connection.execute('SELECT * FROM establishments');

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`📊 TOTAL ÉTABLISSEMENTS: ${rows.length}`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        rows.forEach((est, index) => {
            console.log(`\n🏢 ÉTABLISSEMENT #${index + 1}`);
            console.log('─────────────────────────────────────────────────────────────');
            console.log(`ID: ${est.id}`);
            console.log(`Nom: ${est.name}`);
            console.log(`Slug: ${est.slug}`);
            console.log(`User ID: ${est.user_id}`);
            console.log('');
            console.log('📍 ADRESSE:');
            console.log(`  • Adresse 1: ${est.address_line1 || 'N/A'}`);
            console.log(`  • Adresse 2: ${est.address_line2 || 'N/A'}`);
            console.log(`  • Ville: ${est.city || 'N/A'}`);
            console.log(`  • Code postal: ${est.postal_code || 'N/A'}`);
            console.log(`  • Région: ${est.region || 'N/A'}`);
            console.log(`  • Pays: ${est.country || 'N/A'}`);
            console.log(`  • Coordonnées: ${est.latitude}, ${est.longitude}`);
            console.log('');
            console.log('🏭 SECTEUR:');
            console.log(`  • Secteur ID: ${est.sector_id || 'N/A'}`);
            console.log(`  • Secteur Name: ${est.sector_name || 'N/A'}`);
            console.log(`  • Secteur Slug: ${est.sector_slug || 'N/A'}`);
            console.log(`  • Difficulté: ${est.sector_difficulty || 'N/A'}`);
            console.log('');
            console.log('📞 CONTACT:');
            console.log(`  • Téléphone: ${est.phone || 'N/A'}`);
            console.log(`  • Email: ${est.email || 'N/A'}`);
            console.log(`  • Site web: ${est.website || 'N/A'}`);
            console.log('');
            console.log('🔗 PLATEFORMES:');
            console.log(`  • Platform Links: ${est.platform_links || 'N/A'}`);
            console.log('');
            console.log('✅ VALIDATION:');
            console.log(`  • Source: ${est.source_type}`);
            console.log(`  • Google Place ID: ${est.google_place_id || 'N/A'}`);
            console.log(`  • Status: ${est.verification_status}`);
            console.log(`  • Rejet: ${est.rejection_reason || 'N/A'}`);
            console.log(`  • Vérifié le: ${est.verified_at || 'N/A'}`);
            console.log(`  • Vérifié par: ${est.verified_by || 'N/A'}`);
            console.log('');
            console.log('📅 DATES:');
            console.log(`  • Créé le: ${est.created_at}`);
            console.log(`  • Mis à jour: ${est.updated_at}`);
            console.log(`  • Dernière sync Google: ${est.last_sync_google || 'N/A'}`);
            console.log('─────────────────────────────────────────────────────────────');
        });

        console.log('\n═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await connection.end();
    }
}

showEstablishments();

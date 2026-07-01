import { query } from './config/database';

// Migration : ajout de la colonne screenshot_url sur geo_submissions
// Permet aux guides de joindre une capture d'écran comme preuve de citation
async function migrate() {
    try {
        console.log('--- Migration GEO : ajout screenshot_url ---');

        // Vérifie si la colonne existe déjà avant d'ALTER TABLE
        const cols: any[] = await query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'geo_submissions'
              AND COLUMN_NAME  = 'screenshot_url'
        `, {});

        if (cols.length === 0) {
            await query(`
                ALTER TABLE geo_submissions
                ADD COLUMN screenshot_url VARCHAR(1000) DEFAULT NULL
                    AFTER submission_url
            `, {});
            console.log('✓ Colonne screenshot_url ajoutée à geo_submissions');
        } else {
            console.log('⚠ Colonne screenshot_url déjà présente, skip');
        }

        console.log('\n✅ Migration screenshot_url terminée');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration échouée:', error.message);
        process.exit(1);
    }
}

migrate();

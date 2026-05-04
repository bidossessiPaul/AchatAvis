// Tâches planifiées (cron interne, sans dépendance externe).
// Actuellement : auto-régénération des avis rejetés depuis 48h sans action artisan.

import { query } from '../config/database';
import { regenerateProposal, recycleRejectedSubmissions } from './adminService';

const INTERVAL_MS = 60 * 60 * 1000; // toutes les heures

export const startCronJobs = () => {
    // Premier passage au démarrage, puis toutes les heures
    autoRegenerateRejectedReviews();
    setInterval(autoRegenerateRejectedReviews, INTERVAL_MS);
};

/**
 * Cherche les avis rejetés depuis plus de 48h sans relance artisan ni action admin.
 * Pour chacun : régénère le contenu IA puis recycle la soumission (libère le slot).
 * Traite les plus anciens en premier.
 */
const autoRegenerateRejectedReviews = async () => {
    try {
        const rows: any = await query(`
            SELECT rs.id, rs.proposal_id
            FROM reviews_submissions rs
            WHERE rs.status = 'rejected'
              AND rs.recycled_at IS NULL
              AND rs.dismissed_at IS NULL
              AND rs.rejected_at < NOW() - INTERVAL 48 HOUR
            ORDER BY rs.rejected_at ASC
        `);

        if (!rows || rows.length === 0) return;

        console.log(`[CRON] Auto-régénération : ${rows.length} avis rejeté(s) depuis +48h`);

        for (const row of rows) {
            try {
                await regenerateProposal(row.proposal_id);
                await recycleRejectedSubmissions([row.id]);
                console.log(`[CRON] Soumission ${row.id} régénérée et remise en ligne`);
            } catch (e: any) {
                console.error(`[CRON] Échec pour soumission ${row.id} :`, e.message);
            }
        }
    } catch (e: any) {
        console.error('[CRON] Erreur auto-régénération avis rejetés :', e.message);
    }
};

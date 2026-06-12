// Tâches planifiées (cron interne, sans dépendance externe).
// Actuellement : auto-recyclage des avis rejetés depuis 48h sans action artisan.
// Le contenu des avis n'est JAMAIS réécrit — seul le slot est libéré (rotation côté guide).

import { query } from '../config/database';
import { recycleRejectedSubmissions } from './adminService';

const INTERVAL_MS = 60 * 60 * 1000; // toutes les heures

export const startCronJobs = () => {
    // Premier passage au démarrage, puis toutes les heures
    autoRecycleRejectedReviews();
    setInterval(autoRecycleRejectedReviews, INTERVAL_MS);
};

/**
 * Cherche les avis rejetés depuis plus de 48h sans relance artisan ni action admin.
 * Pour chacun : recycle la soumission (libère le slot) — sans toucher au contenu.
 * Traite les plus anciens en premier.
 */
const autoRecycleRejectedReviews = async () => {
    try {
        const rows: any = await query(`
            SELECT rs.id
            FROM reviews_submissions rs
            WHERE rs.status = 'rejected'
              AND rs.recycled_at IS NULL
              AND rs.dismissed_at IS NULL
              AND rs.rejected_at < NOW() - INTERVAL 48 HOUR
            ORDER BY rs.rejected_at ASC
        `);

        if (!rows || rows.length === 0) return;

        console.log(`[CRON] Auto-recyclage : ${rows.length} avis rejeté(s) depuis +48h`);

        for (const row of rows) {
            try {
                await recycleRejectedSubmissions([row.id]);
                console.log(`[CRON] Soumission ${row.id} recyclée (contenu préservé)`);
            } catch (e: any) {
                console.error(`[CRON] Échec pour soumission ${row.id} :`, e.message);
            }
        }
    } catch (e: any) {
        console.error('[CRON] Erreur auto-recyclage avis rejetés :', e.message);
    }
};

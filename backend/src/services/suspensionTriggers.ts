import { query } from '../config/database';
import { suspensionService } from './suspensionService';

class SuspensionTriggers {
    /**
     * TRIGGER 1: Spam Submissions (3+ in 1 hour)
     */
    async checkSpamSubmissions(userId: string, currentProofId: string): Promise<void> {
        const recent: any = await query(
            'SELECT COUNT(*) as count FROM reviews_submissions WHERE guide_id = ? AND submitted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
            [userId]
        );

        if (recent[0].count >= 3) {
            await suspensionService.detectAndSuspend(
                userId,
                'spam_submissions',
                `${recent[0].count} avis soumis en moins d'une heure`,
                currentProofId
            );
        }
    }

    /**
     * TRIGGER 2: Sector Cooldown Violation
     */
    async checkSectorCooldown(userId: string, gmailAccountId: number, sectorSlug: string, currentProofId: string): Promise<void> {
        const sector: any = await query('SELECT min_days_between_reviews FROM sector_difficulty WHERE sector_slug = ?', [sectorSlug]);
        if (!sector || sector.length === 0) return;

        const minDays = sector[0].min_days_between_reviews;

        // Check last activity for this Gmail account on this sector
        const lastActivity: any = await query(
            `SELECT MAX(submitted_at) as last_date 
       FROM reviews_submissions 
       WHERE gmail_account_id = ? AND order_id IN (SELECT id FROM reviews_orders WHERE sector_id = (SELECT id FROM sector_difficulty WHERE sector_slug = ?))`,
            [gmailAccountId, sectorSlug]
        );

        if (lastActivity[0].last_date) {
            const diff = Date.now() - new Date(lastActivity[0].last_date).getTime();
            const days = diff / (1000 * 60 * 60 * 24);

            if (days < minDays) {
                await suspensionService.detectAndSuspend(
                    userId,
                    'sector_cooldown_violation',
                    `Non-respect du délai secteur (${Math.floor(days)}j/${minDays}j)`,
                    currentProofId
                );
            }
        }
    }

    /**
     * TRIGGER 3: Repeated Rejections (3 out of last 5)
     */
    async checkRepeatedRejections(userId: string, currentProofId: string): Promise<void> {
        const lastFive: any = await query(
            'SELECT status FROM reviews_submissions WHERE guide_id = ? ORDER BY submitted_at DESC LIMIT 5',
            [userId]
        );

        if (lastFive.length >= 3) {
            const rejectedCount = lastFive.filter((s: any) => s.status === 'rejected').length;
            if (rejectedCount >= 3) {
                await suspensionService.detectAndSuspend(
                    userId,
                    'invalid_proofs_repeated',
                    `${rejectedCount}/5 dernières preuves rejetées`,
                    currentProofId
                );
            }
        }
    }

    /**
     * TRIGGER 4: Identical Reviews
     */
    async checkIdenticalReviews(userId: string, reviewUrl: string, currentProofId: string): Promise<void> {
        // This is a placeholder for real similarity check. 
        // Usually we would compare review_text if we stored it, but we only have review_url here.
        // Assuming if the SAME URL is used twice by the same user.
        const duplicate: any = await query(
            'SELECT id FROM reviews_submissions WHERE guide_id = ? AND review_url = ? AND id != ?',
            [userId, reviewUrl, currentProofId]
        );

        if (duplicate && duplicate.length > 0) {
            await suspensionService.detectAndSuspend(
                userId,
                'identical_reviews',
                'Tentative de soumission d\'une preuve déjà utilisée',
                currentProofId
            );
        }
    }
}

export const suspensionTriggers = new SuspensionTriggers();
export default suspensionTriggers;

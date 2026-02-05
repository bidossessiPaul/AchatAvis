import { query } from '../config/database';
import { antiDetectionService } from './antiDetectionService';

/**
 * Get Gmail quotas for a specific fiche
 */
export async function getGmailQuotasForFiche(userId: string, ficheId: string) {
    // 1. Get fiche/order info
    const orderInfo: any = await query(`
        SELECT o.id, o.sector_id, sd.sector_name, sd.sector_slug, sd.max_reviews_per_month_per_email, sd.min_days_between_reviews
        FROM reviews_orders o
        LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
        WHERE o.id = ?
    `, [ficheId]);

    if (!orderInfo || orderInfo.length === 0) {
        throw new Error('Fiche not found');
    }

    const order = orderInfo[0];
    const sectorSlug = order.sector_slug || '';
    const sectorMaxPerMonth = order.max_reviews_per_month_per_email || 5;

    // 2. Get all Gmail accounts for this guide
    const gmailAccounts: any = await query(`
        SELECT id, email, trust_level as account_level, sector_activity_log, 
               monthly_reviews_posted, monthly_quota_limit, monthly_reset_date,
               last_review_posted_at, is_verified
        FROM guide_gmail_accounts
        WHERE user_id = ?
        ORDER BY id ASC
    `, [userId]);

    // 3. For each Gmail, calculate quotas and check availability
    const now = new Date();
    const results = await Promise.all(gmailAccounts.map(async (gmail: any) => {
        // Handle monthly reset
        const resetDate = gmail.monthly_reset_date ? new Date(gmail.monthly_reset_date) : null;
        let monthlyUsed = gmail.monthly_reviews_posted || 0;

        if (resetDate && (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear())) {
            monthlyUsed = 0; // Would be reset on next check
        }

        const monthlyLimit = Math.max(20, gmail.monthly_quota_limit || 0);
        const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);

        // Parse sector activity
        let log = {};
        try {
            log = typeof gmail.sector_activity_log === 'string'
                ? JSON.parse(gmail.sector_activity_log)
                : gmail.sector_activity_log || {};
        } catch (e) { }

        const sectorActivity = (log as any)[sectorSlug] || { count_this_month: 0, last_posted: null };

        // Handle monthly reset for sector
        if (sectorActivity.last_posted) {
            const lastDate = new Date(sectorActivity.last_posted);
            if (lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
                sectorActivity.count_this_month = 0;
            }
        }

        const sectorUsed = sectorActivity.count_this_month || 0;
        const sectorRemaining = Math.max(0, sectorMaxPerMonth - sectorUsed);

        // Check compatibility via antiDetectionService
        let canTake = false;
        let reason = '';
        let message = '';

        try {
            const compat = await antiDetectionService.canTakefiche(userId, ficheId, gmail.id);
            canTake = compat.can_take;
            reason = compat.reason || '';
            message = compat.message || '';
        } catch (err: any) {
            canTake = false;
            message = err.message || 'Erreur de vérification';
        }

        // Determine status
        let status = 'available';
        if (monthlyRemaining === 0) status = 'global_quota_exceeded';
        else if (sectorRemaining === 0) status = 'sector_quota_exceeded';
        else if (reason === 'SECTOR_COOLDOWN') status = 'cooldown';
        else if (!canTake) status = 'blocked';

        return {
            id: gmail.id,
            email: gmail.email,
            accountLevel: gmail.account_level,
            isVerified: gmail.is_verified,
            quotaSector: {
                used: sectorUsed,
                max: sectorMaxPerMonth,
                remaining: sectorRemaining
            },
            quotaGlobal: {
                used: monthlyUsed,
                max: monthlyLimit,
                remaining: monthlyRemaining
            },
            lastPosted: gmail.last_review_posted_at,
            status,
            canTake,
            reason,
            message
        };
    }));

    return {
        gmailAccounts: results,
        sector: {
            id: order.sector_id,
            name: order.sector_name,
            slug: sectorSlug,
            maxPerMonth: sectorMaxPerMonth,
            minDaysBetween: order.min_days_between_reviews
        }
    };
}

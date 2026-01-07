import { query } from '../config/database';
import crypto from 'crypto';
import { antiDetectionService } from './antiDetectionService';

export const guideService = {
    /**
     * Get missions available for a specific guide
     * A mission is available if:
     * 1. The order status is not 'draft' or 'cancelled'
     * 2. The order is not yet fully completed (reviews_received < quantity)
     * 3. The guide hasn't already submitted a review for this order
     */
    async getAvailableMissions(guideId: string) {
        return query(`
            SELECT o.*, 
                   (o.quantity - o.reviews_received) as remaining_slots,
                   o.locked_by,
                   o.locked_until,
                   sd.difficulty,
                   sd.icon_emoji as sector_icon,
                   sd.required_gmail_level,
                   (
                       SELECT COUNT(*) 
                       FROM reviews_submissions s 
                       WHERE s.order_id = o.id 
                       AND DATE(s.submitted_at) = CURDATE()
                   ) as daily_submissions_count
            FROM reviews_orders o
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.status IN ('in_progress')
            AND o.reviews_received < o.quantity
            ORDER BY o.created_at DESC
        `, [guideId]);
    },

    async getMissionDetails(order_id: string, guide_id: string) {
        // Fetch order basic info
        const orderResult: any = await query(`
            SELECT o.*, a.company_name as artisan_company, a.city,
                   sd.difficulty, sd.icon_emoji as sector_icon
            FROM reviews_orders o
            JOIN artisans_profiles a ON o.artisan_id = a.user_id
            LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
            WHERE o.id = ?
        `, [order_id]);

        if (!orderResult || orderResult.length === 0) {
            throw new Error('Mission non trouvée');
        }

        const order = orderResult[0];

        // 1. Quota Check (Total)
        if (order.reviews_received >= order.quantity) {
            throw new Error('MISSION_FULL');
        }

        // 2. Daily Quota Check
        const dailyStats: any = await query(`
            SELECT COUNT(*) as count 
            FROM reviews_submissions 
            WHERE order_id = ? AND DATE(submitted_at) = CURDATE()
        `, [order_id]);

        const dailyCount = dailyStats[0].count;
        if (dailyCount >= order.reviews_per_day) {
            throw new Error('DAILY_QUOTA_FULL');
        }

        // 3. Mission Lock Check
        if (order.locked_by && order.locked_by !== guide_id) {
            const lockedUntil = new Date(order.locked_until);
            if (lockedUntil > new Date()) {
                throw new Error('MISSION_LOCKED');
            }
        }

        // 3. Acquire/Refresh Lock (30 minutes)
        await query(`
            UPDATE reviews_orders 
            SET locked_by = ?, 
                locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
            WHERE id = ?
        `, [guide_id, order_id]);

        // Fetch proposals for this order that have NOT been submitted by ANYONE yet
        // OR have been submitted by the CURRENT guide (to show them in "Published" section)
        const proposals = await query(`
            SELECT p.* FROM review_proposals p
            LEFT JOIN reviews_submissions s ON p.id = s.proposal_id
            WHERE p.order_id = ?
            AND (s.id IS NULL OR s.guide_id = ?)
            ORDER BY p.created_at ASC
        `, [order_id, guide_id]);

        // Fetch submissions already made by this guide for this order
        const submissions = await query(`
            SELECT * FROM reviews_submissions
            WHERE order_id = ? AND guide_id = ?
        `, [order_id, guide_id]);

        return {
            ...order,
            proposals,
            submissions
        };
    },

    async releaseMissionLock(order_id: string, guide_id: string) {
        await query(`
            UPDATE reviews_orders 
            SET locked_by = NULL, 
                locked_until = NULL
            WHERE id = ? AND locked_by = ?
        `, [order_id, guide_id]);
        return { success: true };
    },

    async getMySubmissions(guideId: string) {
        return query(`
            SELECT s.*, o.company_name as artisan_company
            FROM reviews_submissions s
            JOIN reviews_orders o ON s.order_id = o.id
            WHERE s.guide_id = ?
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async submitReviewProof(guideId: string, data: {
        orderId: string,
        proposalId: string,
        reviewUrl: string,
        googleEmail: string,
        artisanId: string,
        gmailAccountId?: number
    }) {
        // 0. VÉRIFICATION ANTI-DÉTECTION (si gmailAccountId est fourni)
        let currentSectorSlug = '';
        if (data.gmailAccountId) {
            const compatibility = await antiDetectionService.canTakeMission(guideId, data.orderId, data.gmailAccountId);
            if (!compatibility.can_take) {
                throw new Error(`Anti-Détection: ${compatibility.message}`);
            }

            // Récupérer le slug du secteur pour plus tard
            const campaign: any = await query(`
                SELECT sd.sector_slug FROM reviews_orders o
                LEFT JOIN sector_difficulty sd ON o.sector_id = sd.id
                WHERE o.id = ?
            `, [data.orderId]);
            currentSectorSlug = campaign?.[0]?.sector_slug || '';
        }

        // 1. Check if this guide already submitted for THIS proposal
        const existingProp: any = await query(`
            SELECT id FROM reviews_submissions 
            WHERE guide_id = ? AND proposal_id = ?
        `, [guideId, data.proposalId]);

        if (existingProp && existingProp.length > 0) {
            throw new Error('Vous avez déjà soumis une preuve pour cet avis.');
        }

        // 2. Check if this Google email was already used for this Artisan (business)
        const existingEmail: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE artisan_id = ? AND google_email = ?
        `, [data.artisanId, data.googleEmail]);

        if (existingEmail && existingEmail.length > 0) {
            throw new Error('ce compte mail a déjà été utiliser pour ce projet.');
        }

        const submissionId = crypto.randomUUID();

        // 3. Create submission record
        await query(`
            INSERT INTO reviews_submissions 
            (id, guide_id, artisan_id, order_id, proposal_id, review_url, google_email, gmail_account_id, status, earnings, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 2.00, NOW())
        `, [submissionId, guideId, data.artisanId, data.orderId, data.proposalId, data.reviewUrl, data.googleEmail, data.gmailAccountId || null]);

        // 4. Increment reviews_received in order and update status
        await query(`
            UPDATE reviews_orders 
            SET reviews_received = reviews_received + 1,
                status = IF(reviews_received + 1 >= quantity, 'completed', 'in_progress'),
                locked_by = NULL,
                locked_until = NULL
            WHERE id = ?
        `, [data.orderId]);

        // 5. Mettre à jour les logs d'activité anti-détection
        if (data.gmailAccountId && currentSectorSlug) {
            await antiDetectionService.updateGmailActivity(data.gmailAccountId, currentSectorSlug);
        }

        return { id: submissionId, success: true };
    },

    async getEarningsStats(guideId: string) {
        const stats: any = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'validated' THEN earnings ELSE 0 END), 0) as total_earned
            FROM reviews_submissions
            WHERE guide_id = ?
        `, [guideId]);

        const payouts: any = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'in_revision') THEN amount ELSE 0 END), 0) as total_pending
            FROM payout_requests
            WHERE guide_id = ?
        `, [guideId]);

        const totalEarned = Number(stats[0].total_earned);
        const totalPaid = Number(payouts[0].total_paid);
        const totalPending = Number(payouts[0].total_pending);
        const balance = totalEarned - totalPaid - totalPending;

        return {
            totalEarned,
            totalPaid,
            totalPending,
            balance: Math.max(0, balance)
        };
    },

    async getPayoutHistory(guideId: string) {
        return query(`
            SELECT * FROM payout_requests
            WHERE guide_id = ?
            ORDER BY requested_at DESC
        `, [guideId]);
    },

    async requestPayout(guideId: string) {
        const stats = await this.getEarningsStats(guideId);

        if (stats.balance < 20) {
            throw new Error('Le montant minimum pour un retrait est de 20€.');
        }

        const payoutId = crypto.randomUUID();
        await query(`
            INSERT INTO payout_requests (id, guide_id, amount, status, requested_at)
            VALUES (?, ?, ?, 'pending', NOW())
        `, [payoutId, guideId, stats.balance]);

        return { id: payoutId, amount: stats.balance };
    }
};

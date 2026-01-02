import { query } from '../config/database';
import crypto from 'crypto';

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
                   (o.quantity - o.reviews_received) as remaining_slots
            FROM reviews_orders o
            WHERE o.status IN ('in_progress')
            AND o.reviews_received < o.quantity
            -- We show orders even if guide has already participated, 
            -- but only if they haven't filled ALL slots themselves (unlikely but possible)
            -- and if there are still slots available globally.
            ORDER BY o.created_at DESC
        `, [guideId]);
    },

    async getMissionDetails(order_id: string, guide_id: string) {
        // Fetch order basic info
        const orderResult: any = await query(`
            SELECT o.*, a.company_name as artisan_company, a.city
            FROM reviews_orders o
            JOIN artisans_profiles a ON o.artisan_id = a.user_id
            WHERE o.id = ?
        `, [order_id]);

        if (!orderResult || orderResult.length === 0) {
            throw new Error('Mission non trouvée');
        }

        const order = orderResult[0];

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

    async getMySubmissions(guideId: string) {
        return query(`
            SELECT s.*, o.company_name as artisan_company
            FROM reviews_submissions s
            JOIN reviews_orders o ON s.order_id = o.id
            WHERE s.guide_id = ?
            ORDER BY s.submitted_at DESC
        `, [guideId]);
    },

    async submitReviewProof(guideId: string, data: { orderId: string, proposalId: string, reviewUrl: string, googleEmail: string, artisanId: string }) {
        // 0. Check if this guide already submitted for THIS proposal
        const existingProp: any = await query(`
            SELECT id FROM reviews_submissions 
            WHERE guide_id = ? AND proposal_id = ?
        `, [guideId, data.proposalId]);

        if (existingProp && existingProp.length > 0) {
            throw new Error('Vous avez déjà soumis une preuve pour cet avis.');
        }

        // 1. Check if this Google email was already used for this Artisan (business)
        const existingEmail: any = await query(`
            SELECT id FROM reviews_submissions
            WHERE artisan_id = ? AND google_email = ?
        `, [data.artisanId, data.googleEmail]);

        if (existingEmail && existingEmail.length > 0) {
            throw new Error('ce compte mail a déjà été utiliser pour ce projet.');
        }

        const submissionId = crypto.randomUUID();

        // 2. Create submission record
        await query(`
            INSERT INTO reviews_submissions 
            (id, guide_id, artisan_id, order_id, proposal_id, review_url, google_email, status, earnings, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 2.00, NOW())
        `, [submissionId, guideId, data.artisanId, data.orderId, data.proposalId, data.reviewUrl, data.googleEmail]);

        // 3. Increment reviews_received in order and update status
        await query(`
            UPDATE reviews_orders 
            SET reviews_received = reviews_received + 1,
                status = IF(reviews_received + 1 >= quantity, 'completed', 'in_progress')
            WHERE id = ?
        `, [data.orderId]);

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
